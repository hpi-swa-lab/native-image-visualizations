#ifndef CAUSALITY_GRAPH_REACHABILITY_H
#define CAUSALITY_GRAPH_REACHABILITY_H

#include <iostream>
#include <vector>
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

static void print_reachability_of_method(ostream& out, const Adjacency& adj, const vector<string>& method_names, const vector<string>& type_names, const BFS::Result& all, method_id m, vector<bool>& visited, TreeIndenter& indentation)
{
    size_t dist = all.method_history[m.id];

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

    auto it = std::find_if(adj.methods[m.id].backward_edges.begin(), adj.methods[m.id].backward_edges.end(), [&](method_id prev) { return all.method_history[prev.id] < dist; });

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

static void print_reachability(ostream& out, const Adjacency& adj, const BFS::Result& all, const vector<string>& method_names, const vector<string>& type_names, method_id m)
{
    string name;

    if(!all.method_visited[m.id])
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

#endif //CAUSALITY_GRAPH_REACHABILITY_H
