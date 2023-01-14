#include <iostream>
#include <vector>
#include <cassert>
#include <numeric>
#include <queue>
#include <unordered_map>
#include <cstring>
#include <boost/dynamic_bitset.hpp>
#include <thread>
#include "model.h"
#include "input.h"
#include "analysis.h"

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

        cerr << "Running DFS on original graph...";
        BFS all(adj);
        cerr << " " << std::count_if(all.method_visited.begin(), all.method_visited.end(), [](bool b) { return b; }) << " methods reachable!\n";

        cerr << "Running DFS on purged graph...";

        BFS after_purge(adj, purged_mids);

        cerr << " " << std::count_if(after_purge.method_visited.begin(), after_purge.method_visited.end(), [](bool b) { return b; }) << " methods reachable!\n";

        for(size_t i = 1; i < all.method_visited.size(); i++)
        {
            if(all.method_visited[i] && !after_purge.method_visited[i])
                cout << method_names[i] << endl;
        }
    }
    else
    {
        cerr << "Running DFS on original graph...";
        BFS all(adj);
        cerr << " " << std::count_if(all.method_visited.begin(), all.method_visited.end(), [](bool b) { return b; }) << " methods reachable!\n";

        if(command == "all")
        {
            for(size_t i = 1; i < all.method_visited.size(); i++)
            {
                if(all.method_visited[i])
                    cout << method_names[i] << endl;
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

static void bruteforce_purges__worker_method(const Adjacency& adj, const vector<string>& method_names, size_t n_reachable, atomic<size_t>* purged, vector<boost::dynamic_bitset<>>* purge_matrix)
{
    size_t purged_method;
    while((purged_method = (*purged)++) < adj.n_methods())
    {
        method_id purged_mid = purged_method;
        BFS after_purge(adj, {&purged_mid, 1});

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

    {
        BFS all(adj);
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
        worker = thread(bruteforce_purges__worker_method, adj, method_names, n_reachable, &purged, &purge_matrix);

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

static void bruteforce_purges_classes__worker_method(const Adjacency& adj, const vector<string>& type_names, const vector<vector<method_id>>& reasons_contained_in_types, size_t n_reachable, atomic<size_t>* purged)
{
    size_t purged_type;
    while((purged_type = (*purged)++) < adj.n_types())
    {
        BFS after_purge(adj, reasons_contained_in_types[purged_type]);
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

    {
        BFS all(adj);
        n_reachable = std::count_if(all.method_visited.begin(), all.method_visited.end(), [](bool b){ return b; });
    }
    atomic<size_t> purged = 0;

#ifndef EMSCRIPTEN
    thread workers[8];

    for(thread& worker : workers)
    {
        worker = thread(bruteforce_purges_classes__worker_method, adj, type_names, reasons_contained_in_types, n_reachable, &purged);
    }

    for(thread& worker : workers)
    {
        worker.join();
    }
#else
    bruteforce_purges_classes__worker_method(adj, type_names, reasons_contained_in_types, n_reachable, &purged);
#endif
}

class TreeIndenter
{
    size_t depth = 0;
    vector<size_t> vertical_bars;

public:
    class indent
    {
        TreeIndenter& parent;

    public:
        explicit indent(TreeIndenter& parent) : parent(parent)
        {
            parent.depth++;
        }

        indent(const indent&) = delete;
        indent(indent&&) = delete;

        ~indent()
        {
            parent.depth--;
        }
    };

    void begin_bars()
    {
        vertical_bars.push_back(depth);
    }

    void end_bars()
    {
        vertical_bars.pop_back();
    }

    void print(ostream& out) const
    {
        auto bars_it = vertical_bars.begin();

        for(size_t i = 0; i < depth; i++)
        {
            if(bars_it != vertical_bars.end() && *bars_it == i)
            {
                out << "| ";
                bars_it++;
            }
            else
            {
                out << "  ";
            }
        }

        if(bars_it != vertical_bars.end())
        {
            out << "├─";
        }
        else
        {
            out << "└─";
        }
    }
};

static ostream& operator<<(ostream& out, const TreeIndenter& indentation)
{
    indentation.print(out);
    return out;
}

static void print_reachability_of_method(const Adjacency& adj, const vector<string>& method_names, const vector<string>& type_names, const BFS& all, method_id m, vector<bool>& visited, TreeIndenter& indentation)
{
    size_t dist = all.method_history[m.id];

    if(dist == 0)
    {
        return;
    }

    cout << indentation << method_names[m.id];
    if(dist == 1)
        cout << " (Root)";
    cout << endl;

    if(visited[m.id])
    {
        TreeIndenter::indent i(indentation);
        cout << indentation << "..." << endl;
        return;
    }

    visited[m.id] = true;

    auto it = std::find_if(adj.methods[m.id].backward_edges.begin(), adj.methods[m.id].backward_edges.end(), [&](method_id prev) { return all.method_history[prev.id] < dist; });

    TreeIndenter::indent i(indentation);

    if(it != adj.methods[m.id].backward_edges.end())
    {
        print_reachability_of_method(adj, method_names, type_names, all, *it, visited, indentation);
    }
    else
    {
        // --- Do backwards-search in typeflow-nodes ---

        vector<typeflow_id> parent(adj.n_typeflows());
        queue<typeflow_id> worklist;

        typeflow_id start_flow;
        uint16_t flow_type;
        uint8_t flow_type_dist = numeric_limits<uint8_t>::max();

        for(typeflow_id flow : adj[m].virtual_invocation_sources)
        {
            const TypeflowHistory& history = all.typeflow_visited[flow.id];
            if(history.is_saturated())
            {
                if(history.saturated_dist < flow_type_dist)
                {
                    flow_type = adj[flow].filter->first();
                    flow_type_dist = history.saturated_dist;
                    start_flow = flow;
                }
            }
            else
            {
                for(auto pair : history)
                {
                    if(pair.second < flow_type_dist)
                    {
                        flow_type = pair.first;
                        flow_type_dist = pair.second;
                        start_flow = flow;
                    }
                }
            }
        }

        assert(flow_type_dist <= dist);
        worklist.push(start_flow);

        for(;;)
        {
            assert(!worklist.empty());

            typeflow_id flow = worklist.front();
            worklist.pop();

            if(flow != adj.allInstantiated && all.typeflow_visited[flow.id].is_saturated())
            {
                parent[adj.allInstantiated.id] = flow;
                worklist.emplace(adj.allInstantiated);
                continue;
            }

            for(typeflow_id prev : adj[flow].backward_edges)
            {
                if(prev == 0)
                {
                    vector<method_id> methods;

                    for(typeflow_id cur = flow; parent[cur.id] != numeric_limits<typeflow_id>::max(); cur = parent[cur.id])
                    {
                        if(all.typeflow_visited[cur.id].is_saturated() && !(!methods.empty() && methods.back() == numeric_limits<method_id>::max()))
                            methods.push_back(numeric_limits<method_id>::max());
                        else
                        {
                            method_id cur_container = adj[cur].method.dependent();
                            if(cur_container && !(!methods.empty() && methods.back() == cur_container))
                                methods.push_back(cur_container);
                        }
                    }

                    indentation.begin_bars();

                    cout << indentation << "(Virtually called through " << type_names[flow_type] << ')' << endl;

                    size_t i = methods.size();
                    std::reverse(methods.begin(), methods.end());

                    for(method_id containing_method : methods)
                    {
                        if(--i == 0) // last method
                            indentation.end_bars();

                        if(containing_method == numeric_limits<method_id>::max())
                        {
                            cout << indentation << "(Saturated)" << endl;
                        }
                        else
                        {
                            print_reachability_of_method(adj, method_names, type_names, all, containing_method, visited, indentation);
                        }
                    }

                    return;
                }

                if(parent[prev.id])
                    continue;

                if(adj[prev].method.dependent().id && all.method_history[adj[prev].method.dependent().id] >= dist)
                    continue;

                if(all.typeflow_visited[prev.id].is_saturated())
                {
                    parent[prev.id] = flow;
                    worklist.emplace(prev);
                }
                else
                {
                    for(auto t2 : all.typeflow_visited[prev.id])
                    {
                        if(flow_type == t2.first)
                        {
                            parent[prev.id] = flow;
                            worklist.emplace(prev);
                            break;
                        }
                    }
                }
            }
        }
    }
}

static void print_reachability(const Adjacency& adj, const vector<string>& method_names, const unordered_map<string, uint32_t>& method_ids_by_name, const vector<string>& type_names)
{
    cerr << "Running DFS on original graph...";

    BFS all(adj);

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

        if(!all.method_visited[mid])
        {
            cout << "Not reachable" << endl;
        }
        else
        {
            vector<bool> visited(adj.n_methods());
            TreeIndenter indentation;
            print_reachability_of_method(adj, method_names, type_names, all, mid, visited, indentation);
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
        for(size_t i = 0; i < 10; i++)
            simulate_purge(m.adj, m.method_names, m.method_ids_by_name, command);
    }
}
