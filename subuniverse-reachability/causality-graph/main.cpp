#define INCLUDE_LABELS 0
#define LOG 0

#include <iostream>
#include <vector>
#include <numeric>
#include <unordered_map>
#include <cstring>
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


#define PRINT_CUTOFFS 1
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

static void compute_and_write_purge_matrix(const model& m, ostream& out)
{
    BFS bfs(m.adj);
    BFS::Result all_reachable = bfs.run<false>();

    BFS::Result r(bfs);
    {
        auto& method_visited = r.method_visited;
        std::fill(method_visited.begin() + 1, method_visited.end(), true);
        method_id root_method = 0;
        typeflow_id root_typeflow = 0;
        bfs.run<false>(r, {&root_method, 1}, {&root_typeflow, 1});
    }

    vector<method_id> all_methods(m.adj.n_methods() - 1);
    std::iota(all_methods.begin(), all_methods.end(), 1);
    vector<span<const method_id>> all_method_singletons(m.adj.n_methods() - 1);
    for(size_t i = 0; i < all_method_singletons.size(); i++)
        all_method_singletons[i] = {&all_methods[i], 1};

    size_t cur_iteration = 0;

    auto callback = [&](const span<const method_id>& mids, const BFS::Result& r)
    {
        size_t iteration = &mids - &all_method_singletons[0];

        if(iteration != cur_iteration)
            exit(99);
        cur_iteration++;

        size_t rawBytesSize = (r.method_history.size() + 7) / 8;
        uint8_t rawBytes[rawBytesSize];
        fill(rawBytes, rawBytes + rawBytesSize, 0);

        for(size_t i = 0; i < r.method_history.size(); i++)
            rawBytes[i / 8] |= (r.method_history[i] != 0xFF) << (i % 8);

        out.write((char*)rawBytes, rawBytesSize);
    };

    bfs_incremental_rec(all_reachable, bfs, r, all_method_singletons, callback);
}

static vector<vector<bool>> compute_purge_matrix(const model& m)
{
    vector<vector<bool>> result(m.adj.n_methods() - 1);

    BFS bfs(m.adj);
    BFS::Result all_reachable = bfs.run<false>();

    BFS::Result r(bfs);
    {
        auto& method_visited = r.method_visited;
        std::fill(method_visited.begin() + 1, method_visited.end(), true);
        method_id root_method = 0;
        typeflow_id root_typeflow = 0;
        bfs.run<false>(r, {&root_method, 1}, {&root_typeflow, 1});
    }

    vector<method_id> all_methods(m.adj.n_methods() - 1);
    std::iota(all_methods.begin(), all_methods.end(), 1);
    vector<span<const method_id>> all_method_singletons(m.adj.n_methods() - 1);
    for(size_t i = 0; i < all_method_singletons.size(); i++)
        all_method_singletons[i] = {&all_methods[i], 1};

    auto callback = [&](const span<const method_id>& mids, const BFS::Result& r)
    {
        size_t iteration = &mids - &all_method_singletons[0];

        result[iteration].resize(r.method_history.size());

        for(size_t i = 0; i < r.method_history.size(); i++)
            result[iteration][i] = r.method_history[i] != 0xFF;
    };

    bfs_incremental_rec(all_reachable, bfs, r, all_method_singletons, callback);

    return result;
}

void check_redundant_typeflow_correctness(model& m)
{
    auto mat1 = compute_purge_matrix(m);
    m.optimize();
    auto mat2 = compute_purge_matrix(m);

    if(mat1.size() != mat2.size())
    {
        cerr << "Result sizes dont match!" << endl;
        exit(1);
    }

    for(size_t i = 0; i < mat1.size(); i++)
    {
        if(mat1[i].size() != mat2[i].size())
        {
            cerr << "Result sizes dont match!" << endl;
            exit(2);
        }

        for(size_t j = 0; j < mat1[i].size(); j++)
        {
            if(mat1[i][j] != mat2[i][j])
            {
                cerr << m.method_names[i+1] << " - " << m.method_names[j] << " (" << (mat1[i][j] ? "additional purge" : "lost purge") << ')' << endl;
            }
        }
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
        print_reachability(m);
    }
    else if(command == "check_redundant_typeflow_correctness")
    {
        check_redundant_typeflow_correctness(m);
    }
    else if(command == "purge_matrix")
    {
        iostream::sync_with_stdio(false);
        compute_and_write_purge_matrix(m, cout);
    }
    else
    {
        simulate_purge(m.adj, m.method_names, m.method_ids_by_name, command);
    }
}
