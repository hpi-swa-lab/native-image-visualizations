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

class DetailedSimulationResult
{
    const model& m;
    BFS::Result data;

public:
    DetailedSimulationResult(const model& m, BFS::Result&& data) : m(m), data(std::move(data)) {}

    uintptr_t get_reachability_hyperpath(uint32_t mid) const
    {
        auto edges = get_reachability(m.adj, data, mid);
        return (uintptr_t)EdgeBuffer::allocate_for(edges);
    }

    emscripten::val get_method_history()
    {
        return emscripten::val(emscripten::typed_memory_view(data.method_history.size() - 1, reinterpret_cast<uint8_t*>(&data.method_history[1])));
    }
};

class SimulationResult
{
    vector<DefaultMethodHistory> method_history;

public:
    SimulationResult(BFS::Result&& data) : method_history(std::move(data.method_history))
    {}

    emscripten::val get_method_history()
    {
        return emscripten::val(emscripten::typed_memory_view(method_history.size() - 1, reinterpret_cast<uint8_t*>(&method_history[1])));
    }
};

class CausalityGraph
{
    model purge_model;
    BFS bfs;

    explicit CausalityGraph(model&& purge_model) : purge_model(std::move(purge_model)), bfs(this->purge_model.adj){}

public:
    static CausalityGraph* init(
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

            auto increase_by = [](auto& vector, size_t inc){ vector.resize(vector.size() + inc); };

            increase_by(data.type_names, n_types);
            increase_by(data.method_names, n_methods);
            increase_by(data.typeflow_names, n_typeflows);
            read_typestate_bitsets(data.type_names.size(), data.typestates, (const uint8_t*)typestates_data, typestates_len);
            read_buffer(data.interflows, (const uint8_t*)interflows_data, interflows_len);
            read_buffer(data.direct_invokes, (const uint8_t*)direct_invokes_data, direct_invokes_len);
            read_buffer(data.containing_methods, (const uint8_t*)typeflow_methods_data, typeflow_methods_len);
            read_buffer(data.typeflow_filters, (const uint8_t*)typeflow_filters_data, typeflow_filters_len);

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

    unique_ptr<SimulationResult> simulate_purge(uintptr_t purge_set_ptr, size_t purge_set_len) const
    {
        ProcessingStage s("BFS on purged graph");
        span<const method_id> purge_set((const method_id*)purge_set_ptr, purge_set_len);
        return std::make_unique<SimulationResult>(std::move(bfs.run<false>(purge_set)));
    }

    unique_ptr<DetailedSimulationResult> simulate_purge_detailed(uintptr_t purge_set_ptr, size_t purge_set_len) const
    {
        ProcessingStage s("BFS on purged graph");
        span<const method_id> purge_set((const method_id*)purge_set_ptr, purge_set_len);
        return std::make_unique<DetailedSimulationResult>(purge_model, std::move(bfs.run<true>(purge_set)));
    }

    bool simulate_purges_batched(uintptr_t purge_root_ptr, uintptr_t result_callback_ptr) const
    {
        const PurgeTreeNode* purge_root = (const PurgeTreeNode*)purge_root_ptr;
        purges_batched_result_callback result_callback = (purges_batched_result_callback)result_callback_ptr;

        static_assert(sizeof(PurgeTreeNode) == 16);
        static_assert(offsetof(PurgeTreeNode, mids) == 0);
        static_assert(offsetof(PurgeTreeNode, children) == 8);

        if(purge_root->mids.empty())
        {
            cerr << "Empty method set!!!" << endl;
            return false;
        }

        ProcessingStage s("Running batched purges");

        auto &m = purge_model;

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


EMSCRIPTEN_BINDINGS(my_module)
{
    emscripten::class_<CausalityGraph>("CausalityGraph")
            .constructor(&CausalityGraph::init)
            .function("simulatePurge", &CausalityGraph::simulate_purge)
            .function("simulatePurgeDetailed", &CausalityGraph::simulate_purge_detailed)
            .function("simulatePurgeBatched", &CausalityGraph::simulate_purges_batched);

    emscripten::class_<SimulationResult>("SimulationResult")
            .function("getMethodHistory", &SimulationResult::get_method_history);

    emscripten::class_<DetailedSimulationResult>("DetailedSimulationResult")
            .function("getMethodHistory", &DetailedSimulationResult::get_method_history)
            .function("getReachabilityHyperpath", &DetailedSimulationResult::get_reachability_hyperpath);
}


