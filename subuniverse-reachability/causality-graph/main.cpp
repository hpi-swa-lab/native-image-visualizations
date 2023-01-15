#include <iostream>
#include <vector>
#include <numeric>
#include <unordered_map>
#include <cstring>
#include <boost/dynamic_bitset.hpp>
#include <thread>
#include "model.h"
#include "input.h"
#include "analysis.h"
#include "reachability.h"

using namespace std;

static uint32_t resolve_method(const unordered_map<string, uint32_t>& method_ids_by_name, const string& name)
{
    auto it = method_ids_by_name.find(name);

    if(it == method_ids_by_name.end())
    {
        cerr << "Method " << name << " doesn't exist!" << endl;
        exit(1);
    }

    return it->second;
}

static void simulate_purge(Adjacency& adj, const vector<string>& method_names, const unordered_map<string, uint32_t>& method_ids_by_name, string_view command)
{
    if(command == "purged")
    {
        vector<method_id> purged_mids;
        string name;

        while(!cin.eof())
        {
            getline(cin, name);

            if(name.length() == 0)
                break;

            uint32_t mid = resolve_method(method_ids_by_name, name);
            purged_mids.push_back(mid);
        }

        BFS bfs(adj);

        cerr << "Running DFS on original graph...";
        BFS::Result all = bfs.run<false>();
        cerr << " " << std::count_if(all.method_visited.begin(), all.method_visited.end(), [](bool b) { return b; }) << " methods reachable!\n";

        cerr << "Running DFS on purged graph...";

        BFS::Result after_purge = bfs.run<false>(purged_mids);

        cerr << " " << std::count_if(after_purge.method_visited.begin(), after_purge.method_visited.end(), [](bool b) { return b; }) << " methods reachable!\n";

        for(size_t i = 1; i < all.method_visited.size(); i++)
        {
            if(all.method_visited[i] && !after_purge.method_visited[i])
                cout << method_names[i] << endl;
        }
    }
    else if(command == "benchmark")
    {
        constexpr int times = 20;

        BFS bfs(adj);

        auto start = std::chrono::system_clock::now();

        for(size_t i = 0; i < times; i++)
        {
            bfs.run<false>();
        }

        auto end = std::chrono::system_clock::now();
        std::chrono::duration<double> elapsed_seconds = end-start;
        cout << (elapsed_seconds.count() / times) << " s" << endl;
    }
    else
    {
        cerr << "Running DFS on original graph...";
        BFS bfs(adj);
        BFS::Result all = bfs.run<false>();
        cerr << " " << std::count_if(all.method_visited.begin(), all.method_visited.end(), [](bool b) { return b; }) << " methods reachable!\n";
        auto n_visited_typeflows = std::count_if(all.typeflow_visited.begin(), all.typeflow_visited.end(), [](const auto& history){ return history.any(); });
        cerr << "typeflows visited: " << n_visited_typeflows << " / " << all.typeflow_visited.size() << endl;

        if(command == "all_methods")
        {
            cout << adj.n_methods() << '\n';
            for(size_t i = 0; i < adj.n_methods(); i++)
                cout << (all.method_visited[i] + '0') << '\n';
        }
        if(command == "all")
        {
            cout << adj.n_methods() << ' ' << adj.n_typeflows() << '\n';
            for(size_t i = 0; i < adj.n_methods(); i++)
                cout << (all.method_visited[i] + '0') << '\n';

            vector<uint16_t> types;

            for(size_t i = 0; i < adj.n_typeflows(); i++)
            {
                if(all.typeflow_visited[i].is_saturated())
                    cout << "-1\n";
                else
                {
                    for(auto [t, h] : all.typeflow_visited[i])
                        types.push_back(t);
                    std::sort(types.begin(), types.end());
                    cout << types.size();
                    for(auto t : types)
                        cout << ' ' << t;
                    cout << '\n';
                    types.clear();
                }
            }
        }
        else if(command == "all_hist")
        {
            cout << adj.n_methods() << ' ' << adj.n_typeflows() << '\n';
            for(size_t i = 0; i < adj.n_methods(); i++)
                cout << (all.method_visited[i] + '0') << '\n';

            vector<pair<uint16_t, uint8_t>> types;

            for(size_t i = 0; i < adj.n_typeflows(); i++)
            {
                if(all.typeflow_visited[i].is_saturated())
                    cout << "- " << all.typeflow_visited[i].saturated_dist << '\n';
                else
                {
                    for(auto p : all.typeflow_visited[i])
                        types.push_back(p);
                    std::sort(types.begin(), types.end(), [](auto a, auto b){ return a.first < b.first; });
                    cout << types.size();
                    for(auto [t, h] : types)
                        cout << ' ' << t << ' ' << h;
                    cout << '\n';
                    types.clear();
                }
            }
        }
        else if(command == "missing")
        {
            for(size_t i = 1; i < all.method_visited.size(); i++)
            {
                if(!all.method_visited[i])
                    cout << method_names[i] << endl;
            }
        }
    }
}

static void bruteforce_purges__worker_method(const BFS& bfs, const vector<string>& method_names, size_t n_reachable, atomic<size_t>* purged, vector<boost::dynamic_bitset<>>* purge_matrix)
{
    size_t purged_method;
    while((purged_method = (*purged)++) < bfs.adj.n_methods())
    {
        method_id purged_mid = purged_method;
        BFS::Result after_purge = bfs.run<false>({&purged_mid, 1});

        size_t n_reachable_purged = std::count_if(after_purge.method_visited.begin(), after_purge.method_visited.end(), [](bool b) { return b; });

        (*purge_matrix)[purged_method].resize(after_purge.method_visited.size());
        for(size_t i = 0; i < after_purge.method_visited.size(); i++)
            (*purge_matrix)[purged_method][i] = !after_purge.method_visited[i];

        //stringstream outputline;
        //outputline << method_names[purged_method] << ": " << (n_reachable - n_reachable_purged) << endl;
        //cout << outputline.str(); // synchronized across threads
    }
}

static void bruteforce_purges(const Adjacency& adj, const vector<string>& method_names)
{
    size_t n_reachable;
    boost::dynamic_bitset<> all_reachable_bitset(adj.n_methods());

    BFS bfs(adj);

    {
        BFS::Result all = bfs.run<false>();
        n_reachable = std::count_if(all.method_visited.begin(), all.method_visited.end(), [](bool b){ return b; });

        for(size_t i = 0; i < adj.n_methods(); i++)
        {
            all_reachable_bitset[i] = all.method_visited[i];
        }
    }

    thread workers[8];
    atomic<size_t> purged = 1;
    vector<boost::dynamic_bitset<>> purge_matrix(adj.n_methods());
    purge_matrix[0].resize(adj.n_methods());

    for(thread& worker : workers)
        worker = thread(bruteforce_purges__worker_method, bfs, method_names, n_reachable, &purged, &purge_matrix);

    for(thread& worker : workers)
        worker.join();

    for(auto& purged : purge_matrix)
    {
        purged &= all_reachable_bitset;
    }

    size_t purge_matrix_ones = 0;
    for(auto& row : purge_matrix)
        purge_matrix_ones += row.count();

    cout << "Purge Matrix Ones: " << purge_matrix_ones << endl;

    vector<method_id> methods_sorted_by_cutvalue(adj.n_methods());
    for(size_t i = 0; i < adj.n_methods(); i++)
        methods_sorted_by_cutvalue[i] = i;

    std::sort(methods_sorted_by_cutvalue.begin(), methods_sorted_by_cutvalue.end(), [&](method_id a, method_id b) { return purge_matrix[a.id].count() > purge_matrix[b.id].count(); });

    vector<vector<method_id>> purge_adj(adj.n_methods());


    size_t adj_entries = 0;
    for(size_t i = 1; i < adj.n_methods(); i++)
    {
        cout << method_names[i] << ": ";
        boost::dynamic_bitset<> remaining = purge_matrix[i];
        remaining[i] = false;

        for(method_id m : methods_sorted_by_cutvalue)
        {
            if(remaining[m.id])
            {
                if(!purge_matrix[m.id].is_subset_of(purge_matrix[i]))
                {
                    cout << "Assertion error\n";
                    exit(1);
                }

                purge_adj[i].push_back(m);
                adj_entries++;
                remaining &=~ purge_matrix[m.id];
                cout << method_names[m.id] << ", ";
            }
        }

        cout << '\n';
    }

    cout << "Adj-Entries: " << adj_entries << endl;
}

static void bruteforce_purges_classes__worker_method(const BFS& bfs, const vector<string>& type_names, const vector<vector<method_id>>& reasons_contained_in_types, size_t n_reachable, atomic<size_t>* purged)
{
    size_t purged_type;
    while((purged_type = (*purged)++) < bfs.adj.n_types())
    {
        BFS::Result after_purge = bfs.run<false>(reasons_contained_in_types[purged_type]);
        size_t n_reachable_purged = std::count_if(after_purge.method_visited.begin(), after_purge.method_visited.end(), [](bool b) { return b; });

        stringstream outputline;
        outputline << type_names[purged_type] << ": " << (n_reachable - n_reachable_purged) << endl;
        cout << outputline.str(); // synchronized across threads
    }
}

static void bruteforce_purges_classes(const Adjacency& adj, const vector<string>& type_names, const vector<uint32_t>& declaring_types)
{
    vector<vector<method_id>> reasons_contained_in_types(adj.n_types());
    for(size_t method = 1; method < adj.n_methods(); method++)
    {
        uint32_t t = declaring_types[method];
        if(t != numeric_limits<uint32_t>::max())
            reasons_contained_in_types.at(t).push_back(method);
    }

    size_t n_reachable;

    BFS bfs(adj);

    {
        BFS::Result all = bfs.run<false>();
        n_reachable = std::count_if(all.method_visited.begin(), all.method_visited.end(), [](bool b){ return b; });
    }
    atomic<size_t> purged = 0;

#ifndef EMSCRIPTEN
    thread workers[8];

    for(thread& worker : workers)
    {
        worker = thread(bruteforce_purges_classes__worker_method, bfs, type_names, reasons_contained_in_types, n_reachable, &purged);
    }

    for(thread& worker : workers)
    {
        worker.join();
    }
#else
    bruteforce_purges_classes__worker_method(adj, type_names, reasons_contained_in_types, n_reachable, &purged);
#endif
}

static void print_reachability(const Adjacency& adj, const vector<string>& method_names, const unordered_map<string, uint32_t>& method_ids_by_name, const vector<string>& type_names)
{
    cerr << "Running DFS on original graph...";

    BFS bfs(adj);
    BFS::Result all = bfs.run();

    cerr << " " << std::count_if(all.method_visited.begin(), all.method_visited.end(), [](bool visited) { return visited; }) << " methods reachable!\n";

    string name;

    while(!cin.eof())
    {
        getline(cin, name);

        if(name.length() == 0)
            break;

        uint32_t mid;
        {
            auto it = method_ids_by_name.find(name);

            if(it == method_ids_by_name.end())
            {
                cerr << "Method " << name << " doesn't exist!" << endl;
                continue;
            }

            mid = it->second;
        }

        print_reachability(cout, adj, all, method_names, type_names, mid);
    }
}

int main(int argc, const char** argv)
{
    model_data data;

    read_lines(data.type_names, "types.txt");
    read_lines(data.method_names, "methods.txt");
    read_lines(data.typeflow_names, "typeflows.txt");
    read_typestate_bitsets(data.type_names.size(), data.typestates, "typestates.bin");
    read_buffer(data.interflows, "interflows.bin");
    read_buffer(data.direct_invokes, "direct_invokes.bin");
    read_buffer(data.containing_methods, "typeflow_methods.bin");
    read_buffer(data.typeflow_filters, "typeflow_filters.bin");
    read_buffer(data.declaring_types, "declaring_types.bin");

    model m(std::move(data));

    string_view command = argv[1];

    if(command == "reachability")
    {
        print_reachability(m.adj, m.method_names, m.method_ids_by_name, m.type_names);
    }
    else if(command == "bruteforce_purges")
    {
        bruteforce_purges(m.adj, m.method_names);
    }
    else if(command == "bruteforce_purges_classes")
    {
        bruteforce_purges_classes(m.adj, m.type_names, m.declaring_types);
    }
    else
    {
        simulate_purge(m.adj, m.method_names, m.method_ids_by_name, command);
    }
}
