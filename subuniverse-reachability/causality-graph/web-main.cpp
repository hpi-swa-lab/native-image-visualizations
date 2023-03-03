#define REACHABILITY_ASSERTIONS 0

#define LOG 0

#include <emscripten.h>
#include <iostream>
#include <span>
#include <vector>
#include "model.h"
#include "input.h"
#include "analysis.h"
#include "reachability.h"
#include <emscripten/bind.h>

class ProcessingStage
{
    const char *name;
    std::chrono::time_point<std::chrono::system_clock> start;
public:
    explicit ProcessingStage(const char* name) : name(name), start(std::chrono::system_clock::now())
    {
        cerr << name << " starts." << endl;
    }

    ~ProcessingStage()
    {
        auto end = std::chrono::system_clock::now();
        auto elapsed_milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
        cerr << name << " ended. " << (elapsed_milliseconds.count() / 1000.0f) << "s elapsed" << endl;
    }
};

using purges_batched_result_callback = uint32_t (*)(uint32_t, const uint8_t*);


struct Deletable
{
    virtual ~Deletable() = 0;
};

Deletable::~Deletable() {}

class CausalityGraph;

struct EdgeBuffer
{
    static_assert(sizeof(ReachabilityEdge) == 12);
    static_assert(offsetof(ReachabilityEdge, via_type) == 8);

    uint32_t len;
    ReachabilityEdge edges[0];

    static EdgeBuffer* allocate_for(span<const ReachabilityEdge> edges)
    {
        void* buf = (void*)malloc(sizeof(EdgeBuffer) + sizeof(edges[0]) * edges.size());
        if(!buf)
            exit(666);
        EdgeBuffer* edgeBuf = (EdgeBuffer*)buf;
        edgeBuf->len = edges.size();
        std::copy(edges.begin(), edges.end(), edgeBuf->edges);
        return edgeBuf;
    }
};

class DetailedSimulationResult : Deletable
{
    shared_ptr<const model> m;
    BFS::Result data;

public:
    DetailedSimulationResult(shared_ptr<const model> m, BFS::Result&& data) : m(m), data(std::move(data)) {}

    EdgeBuffer* get_reachability_hyperpath(method_id mid) const
    {
        auto edges = get_reachability(m->adj, data, mid);
        return EdgeBuffer::allocate_for(edges);
    }

    const uint8_t* get_method_history() const
    {
        return reinterpret_cast<const uint8_t*>(&data.method_history[1]);
    }
};

class SimulationResult : Deletable
{
    vector<DefaultMethodHistory> method_history;

public:
    SimulationResult(BFS::Result&& data) : method_history(std::move(data.method_history))
    {}

    const uint8_t* get_method_history() const
    {
        return reinterpret_cast<const uint8_t*>(&method_history[1]);
    }
};

class CausalityGraph : Deletable
{
    shared_ptr<model> purge_model;
    BFS bfs;

public:
    explicit CausalityGraph(model&& purge_model) : purge_model(std::make_shared<model>(std::move(purge_model))), bfs(this->purge_model->adj){}

    SimulationResult* simulate_purge(span<const method_id> purge_set) const
    {
        return new SimulationResult(std::move(bfs.run<false>(purge_set)));
    }

    DetailedSimulationResult* simulate_purge_detailed(span<const method_id> purge_set) const
    {
        return new DetailedSimulationResult(purge_model, std::move(bfs.run<true>(purge_set)));
    }

    bool simulate_purges_batched(const PurgeTreeNode* purge_root, purges_batched_result_callback result_callback) const
    {
        static_assert(sizeof(PurgeTreeNode) == 16);
        static_assert(offsetof(PurgeTreeNode, mids) == 0);
        static_assert(offsetof(PurgeTreeNode, children) == 8);

        if(purge_root->mids.empty())
        {
            cerr << "Empty method set!!!" << endl;
            return false;
        }

        ProcessingStage s("Running batched purges");

        auto &m = *purge_model;

        {
            BFS::Result r(bfs);
            {
                auto &method_inhibited = r.method_inhibited;

                for(method_id mid : purge_root->mids)
                {
                    if(mid.id >= method_inhibited.size())
                    {
                        cerr << "Method id out of range: " << mid.id << endl;
                        return false;
                    }
                    if(method_inhibited[mid.id])
                    {
                        cerr << "Duplicate method " << m.method_names[mid.id] << '(' << mid.id << ')' << endl;
                        return false;
                    }
                    method_inhibited[mid.id] = true;
                }

                method_id root_method = 0;
                bfs.run<false>(r, {&root_method, 1}, true);
            }

            auto callback = [&](const PurgeTreeNode& node, const BFS::Result &r)
            {
                size_t iteration = &node - purge_root;
                bool cancellation_requested = result_callback(iteration, (const uint8_t*)&r.method_history[1]) != 0;
                // TODO: Enable cancellation
            };

            bfs_incremental_rec(
                    // Would only be used with REACHABILITY_ASSERTIONS defined
                    // TODO: Remove this parameter from bfs_incremental_rec(...)
                    *(BFS::Result*)nullptr,
                    bfs, r, {purge_root, 1}, callback);
        }

        return true;
    }
};

extern "C" {

CausalityGraph* EMSCRIPTEN_KEEPALIVE CausalityGraph_init(
        size_t n_types,
        size_t n_methods,
        uintptr_t typestates_data, size_t typestates_len,
        uintptr_t interflows_data, size_t interflows_len,
        uintptr_t direct_invokes_data, size_t direct_invokes_len,
        uintptr_t typeflow_methods_data, size_t typeflow_methods_len,
        uintptr_t typeflow_filters_data, size_t typeflow_filters_len)
{
    size_t n_typeflows = typeflow_methods_len / sizeof(ContainingMethod);

    std::optional<model> purge_model;
    {
        ProcessingStage s("Data reading");

        model_data data;

        auto increase_by = [](auto& vector, size_t inc)
        { vector.resize(vector.size() + inc); };

        increase_by(data.type_names, n_types);
        increase_by(data.method_names, n_methods);
        increase_by(data.typeflow_names, n_typeflows);
        read_typestate_bitsets(data.type_names.size(), data.typestates, (const uint8_t*) typestates_data, typestates_len);
        read_buffer(data.interflows, (const uint8_t*) interflows_data, interflows_len);
        read_buffer(data.direct_invokes, (const uint8_t*) direct_invokes_data, direct_invokes_len);
        read_buffer(data.containing_methods, (const uint8_t*) typeflow_methods_data, typeflow_methods_len);
        read_buffer(data.typeflow_filters, (const uint8_t*) typeflow_filters_data, typeflow_filters_len);

        purge_model.emplace(std::move(data));
    }

    {
        ProcessingStage s("Typeflow optimizing");
        purge_model->optimize();

#if LOG
        cerr << "Adjacency memory usage: " << purge_model->used_memory_size() << endl;
#endif
    }

    {
        ProcessingStage s("Typeflow name deletion");
        purge_model->typeflow_names.clear();
        purge_model->typeflow_names.shrink_to_fit();
    }

    {
        ProcessingStage s("Constructing BFS object");
        return new CausalityGraph(std::move(*purge_model));
    }
}

SimulationResult* EMSCRIPTEN_KEEPALIVE CausalityGraph_simulatePurge(const CausalityGraph* thisPtr, const method_id* purge_set_ptr, size_t purge_set_len)
{
    ProcessingStage s("BFS on purged graph");
    return thisPtr->simulate_purge({purge_set_ptr, purge_set_len});
}

DetailedSimulationResult* EMSCRIPTEN_KEEPALIVE CausalityGraph_simulatePurgeDetailed(const CausalityGraph* thisPtr, const method_id* purge_set_ptr, size_t purge_set_len)
{
    ProcessingStage s("Detailed BFS on purged graph");
    return thisPtr->simulate_purge_detailed({purge_set_ptr, purge_set_len});
}

bool EMSCRIPTEN_KEEPALIVE CausalityGraph_simulatePurgesBatched(const CausalityGraph* thisPtr, const PurgeTreeNode* purge_root, purges_batched_result_callback result_callback)
{
    return thisPtr->simulate_purges_batched(purge_root, result_callback);
}

EdgeBuffer* EMSCRIPTEN_KEEPALIVE DetailedSimulationResult_getReachabilityHyperpath(const DetailedSimulationResult* thisPtr, method_id target)
{
    return thisPtr->get_reachability_hyperpath(target);
}

const uint8_t* EMSCRIPTEN_KEEPALIVE SimulationResult_getMethodHistory(const SimulationResult* thisPtr)
{
    return thisPtr->get_method_history();
}

const uint8_t* EMSCRIPTEN_KEEPALIVE DetailedSimulationResult_getMethodHistory(const DetailedSimulationResult* thisPtr)
{
    return thisPtr->get_method_history();
}

void EMSCRIPTEN_KEEPALIVE Deletable_delete(Deletable* thisPtr)
{
    delete thisPtr;
}

}


