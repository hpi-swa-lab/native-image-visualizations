#ifndef CAUSALITY_GRAPH_REACHABILITY_H
#define CAUSALITY_GRAPH_REACHABILITY_H

#include <iostream>
#include <vector>
#include <ranges>
#include "model.h"
#include "analysis.h"

using namespace std;

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

static void print_reachability_of_method(ostream& out, const Adjacency& adj, const vector<string>& method_names, const vector<string>& type_names, const BFS& all, method_id m, vector<bool>& visited, TreeIndenter& indentation)
{
    size_t dist = all.method_history[m.id].dist;

    if(dist == 0)
    {
        return;
    }

    out << indentation << method_names[m.id];
    if(dist == 1)
        out << " (Root)";
    out << endl;

    if(visited[m.id])
    {
        TreeIndenter::indent i(indentation);
        out << indentation << "..." << endl;
        return;
    }

    visited[m.id] = true;

    auto it = std::find_if(adj.methods[m.id].backward_edges.begin(), adj.methods[m.id].backward_edges.end(), [&](method_id prev) { return all.method_history[prev.id].dist < dist; });

    TreeIndenter::indent i(indentation);

    if(it != adj.methods[m.id].backward_edges.end())
    {
        print_reachability_of_method(out, adj, method_names, type_names, all, *it, visited, indentation);
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
            if(!all.method_history[adj[flow].method.dependent().id])
                continue;

            const TypeflowHistory& history = all.typeflow_visited[flow.id];

            for(auto pair : history)
            {
                if(pair.second < flow_type_dist)
                {
                    flow_type = pair.first;
                    flow_type_dist = pair.second;
                    start_flow = flow;
                }
            }

            if(history.is_saturated())
            {
                if(history.saturated_dist < flow_type_dist)
                {
                    flow_type = adj[flow].filter.first();
                    flow_type_dist = history.saturated_dist;
                    start_flow = flow;
                }
            }
        }

        if(flow_type_dist > dist)
        {
            TreeIndenter::indent i(indentation);
            out << indentation << "Lost due to saturation!" << endl;
            cerr << "Lost reachability trace due to saturation! (1)" << endl;
            return;
        }

        worklist.push(start_flow);

        for(;;)
        {
            if(worklist.empty())
            {
                TreeIndenter::indent i(indentation);
                out << indentation << "Lost due to saturation!" << endl;
                cerr << "Lost reachability trace due to saturation! (2)" << endl;
                return;
            }

            typeflow_id flow = worklist.front();
            worklist.pop();

            if(all.typeflow_visited[flow.id].is_saturated() && all.typeflow_visited[flow.id].saturated_dist <= dist)
            {
                for(size_t v = 1; v < adj.n_typeflows(); v++)
                {
                    if(v == flow || parent[v] || !all.method_history[adj.flows[v].method.dependent().id])
                        continue;

                    if(all.typeflow_visited[v].is_saturated() && all.typeflow_visited[v].saturated_dist <= dist && adj.flows[v].filter[flow_type])
                    {
                        for(auto type_pair: all.typeflow_visited[v])
                        {
                            if(type_pair.first == flow_type)
                            {
                                parent[v] = flow;
                                worklist.push(v);
                            }
                        }

                        for(typeflow_id u : adj.flows[v].backward_edges)
                        {
                            if(u == flow || parent[u.id] || !all.method_history[adj[u].method.dependent().id])
                                continue;

                            for(auto type_pair : all.typeflow_visited[u.id])
                            {
                                if(type_pair.first == flow_type)
                                {
                                    parent[u.id] = flow;
                                    worklist.push(u);
                                }
                            }
                        }
                    }
                }
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

                    out << indentation << "(Virtually called through " << type_names[flow_type] << ')' << endl;

                    size_t i = methods.size();
                    std::reverse(methods.begin(), methods.end());

                    for(method_id containing_method : methods)
                    {
                        if(--i == 0) // last method
                            indentation.end_bars();

                        if(containing_method == numeric_limits<method_id>::max())
                        {
                            out << indentation << "(Saturated)" << endl;
                        }
                        else
                        {
                            print_reachability_of_method(out, adj, method_names, type_names, all, containing_method, visited, indentation);
                        }
                    }

                    return;
                }

                if(parent[prev.id])
                    continue;

                if(adj[prev].method.dependent().id && all.method_history[adj[prev].method.dependent().id].dist >= dist)
                    continue;

                if(all.typeflow_visited[prev.id].is_saturated() && all.typeflow_visited[prev.id].saturated_dist <= dist)
                {
                    parent[prev.id] = flow;
                    worklist.emplace(prev);
                }
                else
                {
                    for(auto t2 : all.typeflow_visited[prev.id])
                    {
                        if(flow_type == t2.first && t2.second <= dist)
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

static void print_reachability(ostream& out, const Adjacency& adj, const BFS& all, const vector<string>& method_names, const vector<string>& type_names, method_id m)
{
    string name;

    if(!all.method_history[m.id])
    {
        out << "Not reachable" << endl;
    }
    else
    {
        vector<bool> visited(adj.n_methods());
        TreeIndenter indentation;
        print_reachability_of_method(out, adj, method_names, type_names, all, m, visited, indentation);
    }
}











struct ReachabilityEdge
{
    method_id from, to;
    uint32_t via_type = numeric_limits<uint32_t>::max();

    bool operator==(const ReachabilityEdge& o) const = default;
};

namespace std {
    template <>
    struct hash<pair<method_id, method_id>> {
        auto operator()(pair<method_id, method_id> e) const {
            return hash<uint32_t>{}(e.first.id) ^ hash<uint32_t>{}(e.second.id);
        }
    };
}  // namespace std


static void get_reachability_of_method(unordered_map<pair<method_id, method_id>, uint32_t>& edges, const Adjacency& adj, const BFS& all, method_id m, vector<bool>& visited)
{
    size_t dist = all.method_history[m.id].dist;

    if(dist == 0)
    {
        return;
    }

    if(visited[m.id])
    {
        return;
    }

    visited[m.id] = true;

    auto it = std::find_if(adj.methods[m.id].backward_edges.begin(), adj.methods[m.id].backward_edges.end(), [&](method_id prev) { return all.method_history[prev.id].dist < dist; });

    if(it != adj.methods[m.id].backward_edges.end())
    {
        edges.insert({{*it, m}, numeric_limits<uint32_t>::max()});
        get_reachability_of_method(edges, adj, all, *it, visited);
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
            if(!all.method_history[adj[flow].method.dependent().id])
                continue;

            const TypeflowHistory& history = all.typeflow_visited[flow.id];

            for(auto pair : history)
            {
                if(pair.second < flow_type_dist)
                {
                    flow_type = pair.first;
                    flow_type_dist = pair.second;
                    start_flow = flow;
                }
            }

            if(history.is_saturated())
            {
                if(history.saturated_dist < flow_type_dist)
                {
                    flow_type = adj[flow].filter.first();
                    flow_type_dist = history.saturated_dist;
                    start_flow = flow;
                }
            }
        }

        if(flow_type_dist > dist)
        {
            cerr << "Lost reachability trace due to saturation! (1)" << endl;
            return;
        }

        worklist.push(start_flow);

        for(;;)
        {
            if(worklist.empty())
            {
                cerr << "Lost reachability trace due to saturation! (2)" << endl;
                return;
            }

            typeflow_id flow = worklist.front();
            worklist.pop();

            if(all.typeflow_visited[flow.id].is_saturated() && all.typeflow_visited[flow.id].saturated_dist <= dist)
            {
                for(size_t v = 1; v < adj.n_typeflows(); v++)
                {
                    if(v == flow || parent[v] || !all.method_history[adj.flows[v].method.dependent().id])
                        continue;

                    if(all.typeflow_visited[v].is_saturated() && all.typeflow_visited[v].saturated_dist <= dist && adj.flows[v].filter[flow_type])
                    {
                        for(auto type_pair: all.typeflow_visited[v])
                        {
                            if(type_pair.first == flow_type)
                            {
                                parent[v] = flow;
                                worklist.push(v);
                            }
                        }

                        for(typeflow_id u : adj.flows[v].backward_edges)
                        {
                            if(u == flow || parent[u.id] || !all.method_history[adj[u].method.dependent().id])
                                continue;

                            for(auto type_pair : all.typeflow_visited[u.id])
                            {
                                if(type_pair.first == flow_type)
                                {
                                    parent[u.id] = flow;
                                    worklist.push(u);
                                }
                            }
                        }
                    }
                }
            }

            for(typeflow_id prev : adj[flow].backward_edges)
            {
                if(prev == 0)
                {
                    vector<typeflow_id> history;

                    for(typeflow_id cur = flow; parent[cur.id] != numeric_limits<typeflow_id>::max(); cur = parent[cur.id])
                        history.push_back(cur);
                    std::reverse(history.begin(), history.end());

                    bool searching_for_invoker = true;

                    for(typeflow_id f : history)
                    {
                        if(all.typeflow_visited[f.id].is_saturated())
                            searching_for_invoker = false;

                        auto containing_method = adj[f].method.dependent();
                        if(containing_method)
                        {
                            auto inserted = edges.insert({{containing_method, m}, flow_type});;

                            if(searching_for_invoker)
                            {
                                inserted.first->second = numeric_limits<uint32_t>::max();
                                searching_for_invoker = false;
                            }

                            get_reachability_of_method(edges, adj, all, containing_method, visited);
                        }
                    }

                    return;
                }

                if(parent[prev.id])
                    continue;

                if(adj[prev].method.dependent().id && all.method_history[adj[prev].method.dependent().id].dist >= dist)
                    continue;

                if(all.typeflow_visited[prev.id].is_saturated() && all.typeflow_visited[prev.id].saturated_dist <= dist)
                {
                    parent[prev.id] = flow;
                    worklist.emplace(prev);
                }
                else
                {
                    for(auto t2 : all.typeflow_visited[prev.id])
                    {
                        if(flow_type == t2.first && t2.second <= dist)
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

static vector<ReachabilityEdge> get_reachability(const Adjacency& adj, const BFS& all, method_id m)
{
    unordered_map<pair<method_id, method_id>, uint32_t> edges;

    if(!all.method_history[m.id])
    {
    }
    else
    {
        vector<bool> visited(adj.n_methods());
        get_reachability_of_method(edges, adj, all, m, visited);
    }

    vector<ReachabilityEdge> result;
    result.reserve(edges.size());
    for(auto kv : edges)
        result.push_back({kv.first.first, kv.first.second, kv.second});
    return result;
}

#endif //CAUSALITY_GRAPH_REACHABILITY_H
