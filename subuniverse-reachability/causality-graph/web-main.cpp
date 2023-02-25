#define REACHABILITY_ASSERTIONS 0

#define LOG 0

#include <emscripten.h>
#include <iostream>
#include <span>
#include <vector>
#include "Bitset.h"
#include "model.h"
#include "input.h"
#include "analysis.h"
#include "reachability.h"


static std::optional<model> purge_model;
static std::optional<BFS> bfs;
static std::optional<BFS::Result> all;

static std::optional<BFS::Result> current_purged_result;

extern "C" const uint8_t* EMSCRIPTEN_KEEPALIVE init(
        const uint8_t* types_data, size_t types_len,
        const uint8_t* methods_data, size_t methods_len,
        const uint8_t* typeflows_data, size_t typeflows_len,
        const uint8_t* typestates_data, size_t typestates_len,
        const uint8_t* interflows_data, size_t interflows_len,
        const uint8_t* direct_invokes_data, size_t direct_invokes_len,
        const uint8_t* typeflow_methods_data, size_t typeflow_methods_len,
        const uint8_t* typeflow_filters_data, size_t typeflow_filters_len,
        const uint8_t* declaring_types_data, size_t declaring_types_len)
{
    cerr << "Data reading starts." << endl;
    auto start = std::chrono::system_clock::now();

    model_data data;

    read_lines(data.type_names, types_data, types_len);
    read_lines(data.method_names, methods_data, methods_len);
    read_lines(data.typeflow_names, typeflows_data, typeflows_len);
    read_typestate_bitsets(data.type_names.size(), data.typestates, typestates_data, typestates_len);
    read_buffer(data.interflows, interflows_data, interflows_len);
    read_buffer(data.direct_invokes, direct_invokes_data, direct_invokes_len);
    read_buffer(data.containing_methods, typeflow_methods_data, typeflow_methods_len);
    read_buffer(data.typeflow_filters, typeflow_filters_data, typeflow_filters_len);
    read_buffer(data.declaring_types, declaring_types_data, declaring_types_len);

    purge_model.emplace(std::move(data));

#if LOG
    cerr << "Adjacency memory usage: " << purge_model->adj.used_memory_size() << endl;
#endif

    bfs.emplace(purge_model->adj);

    purge_model->typeflow_names.clear();
    purge_model->typeflow_names.shrink_to_fit();

    auto end = std::chrono::system_clock::now();
    auto elapsed_milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    cerr << "Data reading ended. " << (elapsed_milliseconds.count() / 1000.0f) << "s elapsed" << endl;

    cerr << "Running DFS on original graph...";

    BFS::Result all = bfs->run<true>();

    cerr << " " << (std::count_if(all.method_history.begin(), all.method_history.end(), [](auto h){ return bool(h); })) << " methods reachable!\n";

    ::all.emplace(std::move(all));

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

    auto& m = *purge_model;

    span<const method_id> purged_mids = {purge_set_ptr, purge_set_len};

#if LOG
    cerr << "Running DFS on purged graph...";
    auto start = std::chrono::system_clock::now();
#endif

    BFS::Result after_purge = bfs->run<true>(purged_mids);

#if LOG
    auto end = std::chrono::system_clock::now();
    auto elapsed_milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    cerr << ' ' << (elapsed_milliseconds.count()) << "ms elapsed - ";

    size_t n_purged = 0;
    for(size_t i = 1; i < all->method_inhibited.size(); i++)
        if(all->method_inhibited[i] && !after_purge.method_inhibited[i])
            n_purged++;

    cerr << n_purged << " method nodes purged!" << endl;
#endif

    current_purged_result.emplace(std::move(after_purge));
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

    auto &m = *purge_model;
    auto &bfs = *::bfs;

#if LOG
    cerr << "Running batch purges...";
    auto start = std::chrono::system_clock::now();
#endif

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

#if LOG
    auto end = std::chrono::system_clock::now();
    auto elapsed_milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    cerr << ' ' << (elapsed_milliseconds.count()) << "ms elapsed" << endl;
#endif

    return true;
}

extern "C" char* EMSCRIPTEN_KEEPALIVE show_reachability(const char* methods)
{
    const BFS::Result* bfsresult = current_purged_result ? &*current_purged_result : &*all;

    auto& m = *purge_model;

    vector<method_id> purged_mids = parse_methods(m, methods);

    if(purged_mids.empty())
        return nullptr;

    stringstream output;

    vector<bool> visited(m.adj.n_methods());
    bool any_reachable = false;

    for(method_id mid : purged_mids)
    {
        if(!bfsresult->method_history[mid.id])
            continue;

        any_reachable = true;
        TreeIndenter indentation;
        print_reachability_of_method(output, m.adj, m.method_names, m.type_names, *bfsresult, mid, visited, indentation);
    }

    if(!any_reachable)
        output << "Not reachable" << endl;

    string s(output.str());
    char* res = new char[s.size() + 1];
    copy(s.begin(), s.end(), res);
    res[s.size()] = 0;
    return res;
}

struct EdgeBuffer
{
    uint32_t len;
    pair<method_id, method_id> edges[0];

    static EdgeBuffer* allocate_for(span<pair<method_id, method_id>> edges)
    {
        void* buf = (void*)malloc(sizeof(EdgeBuffer) + sizeof(pair<method_id, method_id>) * edges.size());
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
    auto edges_raw = span<uint64_t>{(uint64_t*)edges.data(), edges.size()};
    sort(edges_raw.begin(), edges_raw.end());
    size_t new_length = unique(edges_raw.begin(), edges_raw.end()) - edges_raw.begin();
    return EdgeBuffer::allocate_for({edges.data(), new_length});
}