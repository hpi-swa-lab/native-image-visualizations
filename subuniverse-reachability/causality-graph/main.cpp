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
    else if(command == "bfs-incremental")
    {
        BFS bfs(adj);
        BFS::Result all_reachable = bfs.run<false>();
        cerr << " " << std::count_if(all_reachable.method_visited.begin(), all_reachable.method_visited.end(), [](bool b) { return b; }) << " methods reachable!\n";
        cerr << " " << std::count_if(all_reachable.method_history.begin(), all_reachable.method_history.end(), [](uint8_t b) { return b != 0xFF; }) << " methods reachable!\n";


        BFS::Result r(bfs);
        {
            auto& method_visited = r.method_visited;
            std::fill(method_visited.begin() + 1, method_visited.end(), true);
            method_id root_method = 0;
            typeflow_id root_typeflow = 0;
            bfs.run<false>(r, {&root_method, 1}, {&root_typeflow, 1});
        }

        cerr << "r: " << std::count_if(r.method_history.begin(), r.method_history.end(), [](uint8_t b) { return b != 0xFF; }) << " methods reachable!\n";

        vector<method_id> all_methods(adj.n_methods() - 1);
        std::iota(all_methods.begin(), all_methods.end(), 1);
        vector<span<const method_id>> all_method_singletons(adj.n_methods() - 1);
        for(size_t i = 0; i < all_method_singletons.size(); i++)
            all_method_singletons[i] = {&all_methods[i], 1};

        auto callback = [&](const span<const method_id>& mids, const BFS::Result& r)
        {
            size_t iteration = &mids - &all_method_singletons[0];


#define PRINT_CUTOFFS 0
#if PRINT_CUTOFFS
            cout << '[' << iteration << "] ";

            if(mids.size() == 1)
            {
                cout << '"' << method_names[mids[0].id] << '"';
            }
            else
            {
                cout << '{';
                for(size_t i = 0; i < mids.size(); i++)
                {
                    cout << '"' << method_names[mids[i].id] << '"';
                    if(i < mids.size() - 1)
                        cout << ',';
                }
                cout << '}';
            }

            cout << ": ";

            for(size_t i = 1; i < r.method_history.size(); i++)
            {
                if(r.method_history[i] == 0xFF && all_reachable.method_history[i] != 0xFF)
                    cout << method_names[i] << ' ';
            }
            cout << endl;
#else
            if(iteration % 1000 == 0)
            {
                cout << '[' << iteration << ']' << endl;
            }
#endif
        };

        bfs_incremental_rec(all_reachable, bfs, r, all_method_singletons, callback);
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

static void bruteforce_purges__worker_method(const BFS& bfs, const vector<vector<method_id>>& purge_worklist, atomic<size_t>* purged, vector<boost::dynamic_bitset<>>* purge_matrix)
{
    size_t i;
    while((i = (*purged)++) < purge_worklist.size())
    {
        BFS::Result after_purge = bfs.run<false>(purge_worklist[i]);

        (*purge_matrix)[i].resize(after_purge.method_visited.size());
        for(size_t j = 0; j < after_purge.method_visited.size(); j++)
            (*purge_matrix)[i][j] = !after_purge.method_visited[j];
    }
}

static void bruteforce_purges(const Adjacency& adj, const vector<string>& method_names)
{
    boost::dynamic_bitset<> all_reachable_bitset(adj.n_methods());

    BFS bfs(adj);

    {
        BFS::Result all = bfs.run<false>();

        for(size_t i = 0; i < adj.n_methods(); i++)
        {
            all_reachable_bitset[i] = all.method_visited[i];
        }
    }

    vector<vector<method_id>> purge_worklist;
    purge_worklist.reserve(adj.n_methods());

    for(size_t i = 1; i < adj.n_methods(); i++)
    {
        purge_worklist.emplace_back(1, i);
    }

    thread workers[8];
    atomic<size_t> purged = 0;
    vector<boost::dynamic_bitset<>> purge_matrix(adj.n_methods());
    purge_matrix[0].resize(adj.n_methods(), true);

    for(thread &worker: workers)
        worker = thread(bruteforce_purges__worker_method, bfs, purge_worklist, &purged, &purge_matrix);

    size_t last_progress = purged;
    auto next_t = chrono::system_clock::now();

    for(;;)
    {
        next_t += 1s;
        this_thread::sleep_until(next_t);
        size_t next_progress = purged;

        if(next_progress >= adj.n_methods())
            break;

        cerr << (next_progress - last_progress) << " BFS op/s\n";
        last_progress = next_progress;
    }

    for(thread &worker: workers)
        worker.join();

    for(auto &purged: purge_matrix)
    {
        purged &= all_reachable_bitset;
    }

    size_t purge_matrix_ones = 0;
    for(auto &row: purge_matrix)
        purge_matrix_ones += row.count();

    cerr << "Purge Matrix Ones: " << purge_matrix_ones << endl;

    vector<method_id> methods_sorted_by_cutvalue(adj.n_methods());
    for(size_t i = 0; i < adj.n_methods(); i++)
        methods_sorted_by_cutvalue[i] = i;

    std::sort(methods_sorted_by_cutvalue.begin(), methods_sorted_by_cutvalue.end(), [&](method_id a, method_id b)
    { return purge_matrix[a.id].count() > purge_matrix[b.id].count(); });

    vector<vector<method_id>> purge_adj(adj.n_methods());


    size_t adj_entries = 0;
    for(size_t i = 1; i < adj.n_methods(); i++)
    {
        boost::dynamic_bitset<> remaining = purge_matrix[i];
        remaining[i] = false;

        for(method_id m: methods_sorted_by_cutvalue)
        {
            if(remaining[m.id])
            {
                assert(purge_matrix[m.id].is_subset_of(purge_matrix[i]));

                purge_adj[i].push_back(m);
                adj_entries++;
                remaining &= ~purge_matrix[m.id];
            }
        }
    }

    cerr << "Adj-Entries: " << adj_entries << endl;

    {
        ofstream edges("dominator_edges.csv");

        edges << "Source,Target\n";
        for(size_t src = 0; src < adj.n_methods(); src++)
        {
            for(auto dst: purge_adj[src])
                edges << src << ',' << dst.id << '\n';
        }
    }
    {
        ofstream nodes("dominator_nodes.csv");
        nodes << "Id;cut_weight;display\n";
        for(size_t m = 1; m < adj.n_methods(); m++)
            nodes << m << ';' << purge_matrix[m].count() << ';' << method_names[m] << '\n';
    }
}

static void bruteforce_purges_classes(const Adjacency& adj, const vector<string>& type_names, const vector<string>& method_names)
{
    boost::dynamic_bitset<> all_reachable_bitset(adj.n_methods());

    BFS bfs(adj);

    {
        BFS::Result all = bfs.run<false>();

        for(size_t i = 0; i < adj.n_methods(); i++)
        {
            all_reachable_bitset[i] = all.method_visited[i];
        }
    }

    vector<string> node_names;
    vector<vector<method_id>> purge_worklist;

    {
        unordered_set<string> node_names_set;

        for(const string &type: type_names)
        {
            string_view name = type;
            node_names.emplace_back(name);
            purge_worklist.emplace_back();

            for(size_t mid = 1; mid < adj.n_methods(); mid++)
            {
                if(method_names[mid].starts_with(name))
                    purge_worklist.back().push_back(mid);
            }

            continue;

            for(;;)
            {
                auto dotpos = name.find_last_of('.');

                if(dotpos == std::string::npos)
                    break;

                name = name.substr(0, dotpos);

                if(!node_names_set.insert(string(name)).second)
                    break;

                node_names.emplace_back(name);
                purge_worklist.emplace_back();

                for(size_t mid = 1; mid < adj.n_methods(); mid++)
                {
                    if(method_names[mid].starts_with(name))
                        purge_worklist.back().push_back(mid);
                }
            }
        }
    }

    thread workers[8];
    atomic<size_t> purged = 0;
    vector<boost::dynamic_bitset<>> purge_matrix(node_names.size());
    purge_matrix[0].resize(adj.n_methods(), true);

    for(thread &worker: workers)
        worker = thread(bruteforce_purges__worker_method, bfs, purge_worklist, &purged, &purge_matrix);

    size_t last_progress = purged;
    auto next_t = chrono::system_clock::now();

    for(;;)
    {
        next_t += 1s;
        this_thread::sleep_until(next_t);
        size_t next_progress = purged;

        if(next_progress >= purge_worklist.size())
            break;

        cerr << (next_progress - last_progress) << " BFS op/s\n";
        last_progress = next_progress;
    }

    for(thread &worker: workers)
        worker.join();

    for(auto &purged: purge_matrix)
    {
        purged &= all_reachable_bitset;
    }

    vector<method_id> nodes_sorted_by_cutvalue(node_names.size());
    for(size_t i = 0; i < node_names.size(); i++)
        nodes_sorted_by_cutvalue[i] = i;

    std::sort(nodes_sorted_by_cutvalue.begin(), nodes_sorted_by_cutvalue.end(), [&](method_id a, method_id b)
    { return purge_matrix[a.id].count() > purge_matrix[b.id].count(); });

    vector<vector<method_id>> dominator_adj(node_names.size());


    size_t adj_entries = 0;
    for(size_t i = 0; i < node_names.size(); i++)
    {
        boost::dynamic_bitset<> remaining = purge_matrix[i];

        for(method_id m: nodes_sorted_by_cutvalue)
        {
            if(!purge_matrix[m.id].any())
                break;

            if(i == m.id)
                continue;

            if(purge_matrix[m.id].is_subset_of(remaining))
            {
                dominator_adj[i].push_back(m);
                adj_entries++;
                if(purge_matrix[m.id] != remaining)
                    remaining &= ~purge_matrix[m.id];
            }
        }
    }

    cerr << "Adj-Entries: " << adj_entries << endl;

    {
        ofstream edges("dominator_edges.csv");

        edges << "Source,Target\n";
        for(size_t src = 0; src < node_names.size(); src++)
        {
            for(auto dst: dominator_adj[src])
                edges << src << ',' << dst.id << '\n';
        }
    }
    {
        ofstream nodes("dominator_nodes.csv");
        nodes << "Id;cut_weight;Label\n";
        for(size_t n = 1; n < node_names.size(); n++)
            nodes << n << ';' << purge_matrix[n].count() << ';' << node_names[n] << '\n';
    }
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

static void print_reachability(const model& m)
{
    BFS bfs(m.adj);
    BFS::Result bfsresult = bfs.run();

    string input;
    getline(cin, input);

    vector<method_id> purged_mids = parse_methods(m, input.c_str());

    if(purged_mids.empty())
        return;

    vector<bool> visited(m.adj.n_methods());
    bool any_reachable = false;

    for(method_id mid : purged_mids)
    {
        if(!bfsresult.method_visited[mid.id])
            continue;

        any_reachable = true;
        TreeIndenter indentation;
        print_reachability_of_method(cout, m.adj, m.method_names, m.type_names, bfsresult, mid, visited, indentation);
    }

    if(!any_reachable)
        cout << "Not reachable" << endl;
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
        print_reachability(m);
    }
    else if(command == "bruteforce_purges")
    {
        bruteforce_purges(m.adj, m.method_names);
    }
    else if(command == "bruteforce_purges_classes")
    {
        bruteforce_purges_classes(m.adj, m.type_names, m.method_names);
    }
    else
    {
        simulate_purge(m.adj, m.method_names, m.method_ids_by_name, command);
    }
}
