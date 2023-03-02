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


static std::optional<model> purge_model;
static std::optional<BFS> bfs;
static std::optional<BFS::Result> all;

static std::optional<BFS::Result> current_purged_result;

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

extern "C" const uint8_t* EMSCRIPTEN_KEEPALIVE init(
        size_t n_types,
        size_t n_methods,
        const uint8_t* typestates_data, size_t typestates_len,
        const uint8_t* interflows_data, size_t interflows_len,
        const uint8_t* direct_invokes_data, size_t direct_invokes_len,
        const uint8_t* typeflow_methods_data, size_t typeflow_methods_len,
        const uint8_t* typeflow_filters_data, size_t typeflow_filters_len)
{
    size_t n_typeflows = typeflow_methods_len / sizeof(ContainingMethod);

    {
        ProcessingStage s("Data reading");

        model_data data;

        auto increase_by = [](auto& vector, size_t inc){ vector.resize(vector.size() + inc); };

        increase_by(data.type_names, n_types);
        increase_by(data.method_names, n_methods);
        increase_by(data.typeflow_names, n_typeflows);
        read_typestate_bitsets(data.type_names.size(), data.typestates, typestates_data, typestates_len);
        read_buffer(data.interflows, interflows_data, interflows_len);
        read_buffer(data.direct_invokes, direct_invokes_data, direct_invokes_len);
        read_buffer(data.containing_methods, typeflow_methods_data, typeflow_methods_len);
        read_buffer(data.typeflow_filters, typeflow_filters_data, typeflow_filters_len);

        purge_model.emplace(std::move(data));
    }

    {
        ProcessingStage s("Typeflow optimizing");
        purge_model->optimize();

#if LOG
        cerr << "Adjacency memory usage: " << purge_model->adj.used_memory_size() << endl;
#endif
    }

    {
        ProcessingStage s("Typeflow name deletion");
        purge_model->typeflow_names.clear();
        purge_model->typeflow_names.shrink_to_fit();
    }

    {
        ProcessingStage s("BFS on original graph");
        bfs.emplace(purge_model->adj);
        BFS::Result all = bfs->run<true>();
#if LOG
        cerr << " " << (std::count_if(all.method_history.begin(), all.method_history.end(), [](auto h){ return bool(h); })) << " methods reachable!\n";
#endif
        ::all.emplace(std::move(all));
    }

    return (const uint8_t*)&::all->method_history[1];
}

static vector<method_id> parse_methods(const model& m, const char* methods)
{
    vector<method_id> purged_mids;

    stringstream methods_stream(methods);
    string line;

    while(std::getline(methods_stream, line, '\n'))
    {
        if(line.ends_with('*'))
        {
            string_view prefix = string_view(line).substr(0, line.size() - 1);

            for(size_t i = 1; i < m.method_names.size(); i++)
            {
                if(m.method_names[i].starts_with(prefix))
                    purged_mids.push_back(i);
            }
        }
        else
        {
            auto it = m.method_ids_by_name.find(line);

            if(it == m.method_ids_by_name.end())
            {
                purged_mids.clear();
                return purged_mids;
            }

            purged_mids.push_back(it->second);
        }
    }

    return purged_mids;
}

extern "C" const uint8_t* EMSCRIPTEN_KEEPALIVE simulate_purge(const method_id* purge_set_ptr, size_t purge_set_len)
{
    if(!purge_model)
        return nullptr;

    if(purge_set_len == 0)
    {
        current_purged_result = all;
        return (const uint8_t*)&current_purged_result->method_history[1];
    }

    {
        ProcessingStage s("BFS on purged graph");
        span<const method_id> purged_mids = {purge_set_ptr, purge_set_len};
        current_purged_result.emplace(std::move(bfs->run<true>(purged_mids)));
    }

#if LOG
    size_t n_purged = 0;
    for(size_t i = 1; i < all->method_inhibited.size(); i++)
        if(all->method_inhibited[i] && !current_purged_result->method_inhibited[i])
            n_purged++;

    cerr << n_purged << " method nodes purged!" << endl;
#endif

    return (const uint8_t*)&current_purged_result->method_history[1];
}

using purges_batched_result_callback = uint32_t (*)(uint32_t, const uint8_t*);

extern "C" bool EMSCRIPTEN_KEEPALIVE simulate_purges_batched(const PurgeTreeNode* purge_root, purges_batched_result_callback result_callback)
{
    static_assert(sizeof(PurgeTreeNode) == 16);
    static_assert(offsetof(PurgeTreeNode, mids) == 0);
    static_assert(offsetof(PurgeTreeNode, children) == 8);

    if(purge_root->mids.empty())
    {
        cerr << "Empty method set!!!" << endl;
        return false;
    }

    if(!purge_model)
        return false;

    if(!bfs)
        return false;

    ProcessingStage s("Running batched purges");

    auto &m = *purge_model;
    auto &bfs = *::bfs;

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

        bfs_incremental_rec(*all, bfs, r, {purge_root, 1}, callback);
    }
    
    return true;
}

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

extern "C" EdgeBuffer* EMSCRIPTEN_KEEPALIVE get_reachability_hyperpath(method_id mid)
{
    const BFS::Result* bfsresult = current_purged_result ? &*current_purged_result : &*all;
    auto& m = *purge_model;
    auto edges = get_reachability(m.adj, *bfsresult, mid);
    return EdgeBuffer::allocate_for(edges);
}