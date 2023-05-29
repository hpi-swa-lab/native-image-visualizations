#define LOG 0
#define CHECK_ARGS 0

#include <emscripten.h>
#include <iostream>
#include <span>
#include <utility>
#include <vector>
#include "../shared/model.h"
#include "../shared/input.h"
#include "../shared/analysis.h"
#include "../shared/reachability.h"

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

struct SimulationResult : Deletable
{
    virtual const uint8_t* get_method_history() const = 0;
};

class DetailedSimulationResult : SimulationResult
{
    shared_ptr<const model> m;
    BFS data;

public:
    DetailedSimulationResult(shared_ptr<const model> m, BFS&& data) : m(std::move(m)), data(std::move(data)) {}

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

class SimpleSimulationResult : SimulationResult
{
    vector<DefaultMethodHistory> method_history;

public:
    SimpleSimulationResult(BFS&& data) : method_history(std::move(data.method_history))
    {}

    const uint8_t* get_method_history() const
    {
        return reinterpret_cast<const uint8_t*>(&method_history[1]);
    }
};

class IncrementalSimulationResult : SimulationResult
{
    shared_ptr<const model> m;
    IncrementalBfs ibfs;

public:
    IncrementalSimulationResult(shared_ptr<const model> m, const PurgeTreeNode* purge_root) : m(std::move(m)), ibfs(this->m->adj, {purge_root, 1}) {}

    const uint8_t* get_method_history() const
    {
        return reinterpret_cast<const uint8_t*>(&ibfs.current_result().method_history[1]);
    }

    // Returns address of corresponding PurgeTree node
    const PurgeTreeNode* simulate_next()
    {
        return ibfs.next();
    }
};

class CausalityGraph : Deletable
{
    shared_ptr<const model> purge_model;

public:
    explicit CausalityGraph(model&& purge_model) : purge_model(std::make_shared<model>(std::move(purge_model))) {}

    SimpleSimulationResult* simulate_purge(span<const method_id> purge_set) const
    {
        return new SimpleSimulationResult(std::move(BFS::run<false>(purge_model->adj, purge_set)));
    }

    DetailedSimulationResult* simulate_purge_detailed(span<const method_id> purge_set) const
    {
        return new DetailedSimulationResult(purge_model, std::move(BFS::run<true>(purge_model->adj, purge_set)));
    }

    IncrementalSimulationResult* simulate_purges_batched(const PurgeTreeNode* purge_root) const
    {
        static_assert(sizeof(PurgeTreeNode) == 16);
        static_assert(offsetof(PurgeTreeNode, mids) == 0);
        static_assert(offsetof(PurgeTreeNode, children) == 8);

#if CHECK_ARGS
        {
            auto &m = *purge_model;
            vector<bool> method_seen(bfs.adj.n_methods());

            for(method_id mid : purge_root->mids)
            {
                if(mid.id >= method_seen.size())
                {
                    cerr << "Method id out of range: " << mid.id << endl;
                    return nullptr;
                }
                if(method_seen[mid.id])
                {
                    cerr << "Duplicate method " << m.method_names[mid.id] << '(' << mid.id << ')' << endl;
                    return nullptr;
                }
                method_seen[mid.id] = true;
            }
        }
#endif

        return new IncrementalSimulationResult(purge_model, purge_root);
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
        uintptr_t typeflow_filters_data, size_t typeflow_filters_len,
        uintptr_t hyperedges_data, size_t hyperedges_len)
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
        read_buffer(data.hyper_edges, (const uint8_t*) hyperedges_data, hyperedges_len);

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

SimpleSimulationResult* EMSCRIPTEN_KEEPALIVE CausalityGraph_simulatePurge(const CausalityGraph* thisPtr, const method_id* purge_set_ptr, size_t purge_set_len)
{
    ProcessingStage s("BFS on purged graph");
    return thisPtr->simulate_purge({purge_set_ptr, purge_set_len});
}

DetailedSimulationResult* EMSCRIPTEN_KEEPALIVE CausalityGraph_simulatePurgeDetailed(const CausalityGraph* thisPtr, const method_id* purge_set_ptr, size_t purge_set_len)
{
    ProcessingStage s("Detailed BFS on purged graph");
    return thisPtr->simulate_purge_detailed({purge_set_ptr, purge_set_len});
}

IncrementalSimulationResult* EMSCRIPTEN_KEEPALIVE CausalityGraph_simulatePurgesBatched(const CausalityGraph* thisPtr, const PurgeTreeNode* purge_root)
{
    return thisPtr->simulate_purges_batched(purge_root);
}

EdgeBuffer* EMSCRIPTEN_KEEPALIVE DetailedSimulationResult_getReachabilityHyperpath(const DetailedSimulationResult* thisPtr, method_id target)
{
    return thisPtr->get_reachability_hyperpath(target);
}

const uint8_t* EMSCRIPTEN_KEEPALIVE SimulationResult_getMethodHistory(const SimulationResult* thisPtr)
{
    return thisPtr->get_method_history();
}

const PurgeTreeNode* EMSCRIPTEN_KEEPALIVE IncrementalSimulationResult_simulateNext(IncrementalSimulationResult* thisPtr)
{
    return thisPtr->simulate_next();
}

void EMSCRIPTEN_KEEPALIVE Deletable_delete(Deletable* thisPtr)
{
    delete thisPtr;
}

}


