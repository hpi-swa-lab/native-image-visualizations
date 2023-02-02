#define REACHABILITY_ASSERTIONS 0

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

extern "C" void EMSCRIPTEN_KEEPALIVE init(
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
    bfs.emplace(purge_model->adj);

    auto end = std::chrono::system_clock::now();
    auto elapsed_milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    cerr << "Data reading ended. " << (elapsed_milliseconds.count() / 1000.0f) << "s elapsed" << endl;

    cerr << "Running DFS on original graph...";

    BFS::Result all = bfs->run<true>();

    cerr << " " << std::count(all.method_visited.begin(), all.method_visited.end(), true) << " methods reachable!\n";
    cerr << " " << (all.method_history.size() - std::count(all.method_history.begin(), all.method_history.end(), 0xFF)) << " methods reachable!\n";

    ::all.emplace(std::move(all));
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

extern "C" char* EMSCRIPTEN_KEEPALIVE simulate_purge(const char* methods)
{
    if(!purge_model)
        return nullptr;

    if(string_view(methods).empty())
    {
        current_purged_result.reset();
        char* empty = new char[1];
        empty[0] = 0;
        return empty;
    }

    auto& m = *purge_model;

    vector<method_id> purged_mids = parse_methods(m, methods);

    if(purged_mids.empty()) // Parsing error
        return nullptr;

    cerr << "Running DFS on purged graph...";

    auto start = std::chrono::system_clock::now();

    BFS::Result after_purge = bfs->run<true>(purged_mids);

    auto end = std::chrono::system_clock::now();
    auto elapsed_milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    cerr << ' ' << (elapsed_milliseconds.count()) << "ms elapsed - ";

    stringstream output;

    size_t n_purged = 0;

    for(size_t i = 1; i < all->method_visited.size(); i++)
    {
        if(all->method_visited[i] && !after_purge.method_visited[i])
        {
            n_purged++;
            output << m.method_names[i] << endl;
        }
    }

    current_purged_result.emplace(std::move(after_purge));

    cerr << n_purged << " method nodes purged!" << endl;

    string s(output.str());
    char* res = new char[s.size() + 1];
    copy(s.begin(), s.end(), res);
    res[s.size()] = 0;
    return res;
}

extern "C" bool EMSCRIPTEN_KEEPALIVE simulate_purges_batched(const span<const method_id>* purge_sets, size_t purge_sets_len, uint32_t* n_purged)
{
    try
    {
        if(!purge_model)
            return false;

        if(!bfs)
            return false;

        auto &m = *purge_model;
        auto &bfs = *::bfs;

        /*
        cerr << "purge sets len: " << purge_sets_len << endl;
        for(auto ps : span{purge_sets, purge_sets_len})
        {
            cerr << ps.size() << ": ";
            for(auto mid : ps)
                cerr << mid.id << ' ';
            cerr << endl;
        }
         */

        {
            vector<bool> occuring_methods(m.adj.n_methods());
            occuring_methods[0] = true;

            size_t n_occuring_methods = 0;
            for(auto ps: span{purge_sets, purge_sets_len})
            {
                for(method_id mid: ps)
                {
                    if(mid.id >= occuring_methods.size())
                    {
                        cerr << "Method id out of range: " << mid.id << endl;
                        return false;
                    }
                    if(occuring_methods[mid.id])
                    {
                        cerr << "Duplicate method " << m.method_names[mid.id] << '(' << mid.id << ')' << endl;
                        return false;
                    }
                    occuring_methods[mid.id] = true;
                }
            }

            cerr << "Finished checking for duplicates" << endl;
        }

        cerr << "Running batch purges...";

        auto start = std::chrono::system_clock::now();

        {
            BFS::Result r(bfs);
            {
                auto &method_visited = r.method_visited;

                for(auto ps: span{purge_sets, purge_sets_len})
                    for(method_id mid: ps)
                        method_visited[mid.id] = true;

                method_id root_method = 0;
                typeflow_id root_typeflow = 0;
                bfs.run<false>(r, {&root_method, 1}, {&root_typeflow, 1});
            }

            auto callback = [&](const span<const method_id> &mids, const BFS::Result &r)
            {
                size_t iteration = &mids - purge_sets;
                if(iteration == purge_sets_len)
                    return;

                size_t n_purged_acc = 0;

                for(size_t i = 1; i < r.method_history.size(); i++)
                {
                    if(r.method_history[i] == 0xFF && all->method_history[i] != 0xFF)
                        n_purged_acc++;
                }

                n_purged[iteration] = n_purged_acc;

                //cerr << '[' << iteration << "] " << n_purged_acc << endl;
            };

            bfs_incremental_rec(*all, bfs, r, {purge_sets, purge_sets_len}, callback);
        }

        auto end = std::chrono::system_clock::now();
        auto elapsed_milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
        cerr << ' ' << (elapsed_milliseconds.count()) << "ms elapsed" << endl;

        return true;
    }
    catch(const exception& e)
    {
        cerr << "Exception occured: " << e.what() << endl;
        return false;
    }
}

extern "C" char* EMSCRIPTEN_KEEPALIVE show_reachability(const char* methods)
{
    BFS::Result* bfsresult = current_purged_result ? &*current_purged_result : &*all;

    auto& m = *purge_model;

    vector<method_id> purged_mids = parse_methods(m, methods);

    if(purged_mids.empty())
        return nullptr;

    stringstream output;

    vector<bool> visited(m.adj.n_methods());
    bool any_reachable = false;

    for(method_id mid : purged_mids)
    {
        if(!bfsresult->method_visited[mid.id])
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