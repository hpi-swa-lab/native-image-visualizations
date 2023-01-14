#ifndef CAUSALITY_GRAPH_ANALYSIS_H
#define CAUSALITY_GRAPH_ANALYSIS_H

#include <queue>
#include "model.h"

using namespace std;

struct __attribute__((aligned(64))) TypeflowHistory
{
    static constexpr size_t saturation_cutoff = 20;

    uint16_t types[saturation_cutoff];
    uint8_t dists[saturation_cutoff];
    uint8_t saturated_dist = numeric_limits<uint8_t>::max();

public:
    TypeflowHistory()
    {
        fill(types, types + saturation_cutoff, numeric_limits<uint16_t>::max());
        fill(dists, dists + saturation_cutoff, numeric_limits<uint8_t>::max());
    }

    bool add_type(uint16_t type, uint8_t dist)
    {
        for(size_t i = 0; i < saturation_cutoff; i++)
        {
            if(types[i] == numeric_limits<uint16_t>::max())
            {
                types[i] = type;
                dists[i] = dist;
                return true;
            }
            else if(types[i] == type)
            {
                return false;
            }
        }

        saturated_dist = dist;
        return true;
    }

    struct iterator
    {
        struct end_it{};

        const TypeflowHistory* parent;
        size_t pos;

        iterator(const TypeflowHistory* parent) : parent(parent), pos(0) {}

        bool operator==(end_it e) const
        {
            return pos == saturation_cutoff || parent->types[pos] == numeric_limits<uint16_t>::max();
        }

        pair<uint16_t, uint8_t> operator*() const
        {
            return {parent->types[pos], parent->dists[pos]};
        }

        void operator++()
        {
            pos++;
        }
    };

    iterator begin() const { return { this }; }

    iterator::end_it end() const { return {}; }

    bool is_saturated() const
    {
        return saturated_dist != numeric_limits<uint8_t>::max();
    }

    bool any() const
    {
        return is_saturated() || types[0] != numeric_limits<uint16_t>::max();
    }
};

static_assert(sizeof(TypeflowHistory) == 64);

class BFS
{
public:
    vector<bool> method_visited;
    vector<TypeflowHistory> typeflow_visited;
    vector<uint8_t> method_history;

    explicit BFS(const Adjacency& adj) : BFS(adj, {}) {}

    BFS(const Adjacency& adj, span<const method_id> purged_methods)
            : method_visited(adj.n_methods()),
              typeflow_visited(adj.n_typeflows()),
              method_history(adj.n_methods(), numeric_limits<uint8_t>::max())
    {
        Bitset tmp(adj.n_types());
        Bitset allInstantiated(adj.n_types());

        method_visited[0] = true;
        method_history[0] = 0;

        for(method_id purged : purged_methods)
            method_visited[purged.id] = true;

        vector<method_id> method_worklist(1, 0);
        vector<method_id> next_method_worklist;
        queue<typeflow_id> typeflow_worklist;

        // Handle white-hole typeflow
        for(auto v: adj.flows[0].forward_edges)
        {
            const Bitset* filter = adj[v].filter;
            bool changed = false;

            for(size_t t = filter->first(); t < adj.n_types(); t = filter->next(t))
            {
                changed |= typeflow_visited[v.id].add_type(t, 0);
                if(typeflow_visited[v.id].is_saturated())
                    break;
            }

            if(changed && !adj[v].method.dependent())
                typeflow_worklist.push(v);
        }

        vector<uint16_t> instantiated_since_last_iteration;
        list<typeflow_id> saturation_uses;
        vector<bool> included_in_saturation_uses(adj.n_typeflows());

        uint64_t n_worklist_added = 0;

        uint8_t dist = 0;

        while(!method_worklist.empty())
        {
            n_worklist_added += method_worklist.size();

            for(method_id u : method_worklist)
            {
                method_history[u.id] = dist;
                const auto& m = adj[u];

                for(auto v : m.dependent_typeflows)
                    if(typeflow_visited[v.id].any())
                        typeflow_worklist.push(v);

                for(auto v : m.forward_edges)
                {
                    if(!method_visited[v.id])
                    {
                        method_visited[v.id] = true;
                        next_method_worklist.push_back(v);
                    }
                }
            }

            method_worklist.clear();
            swap(method_worklist, next_method_worklist);

            dist++;

            while(!typeflow_worklist.empty())
            {
                while(!typeflow_worklist.empty())
                {
                    typeflow_id u = typeflow_worklist.front();
                    typeflow_worklist.pop();
                    n_worklist_added++;

                    method_id reaching = adj[u].method.reaching();

                    if(!method_visited[reaching.id])
                    {
                        method_visited[reaching.id] = true;
                        method_worklist.push_back(reaching.id);
                    }

                    if(!typeflow_visited[u.id].is_saturated())
                    {
                        for(auto v: adj[u].forward_edges)
                        {
                            if(v == adj.allInstantiated)
                            {
                                for(pair<uint16_t, uint8_t> type: typeflow_visited[u.id])
                                {
                                    if(!allInstantiated[type.first])
                                    {
                                        allInstantiated[type.first] = true;
                                        instantiated_since_last_iteration.push_back(type.first);
                                    }
                                }
                            }

                            if(typeflow_visited[v.id].is_saturated())
                                continue;

                            const Bitset& filter = *adj[v].filter;

                            bool changed = false;

                            for(pair<uint16_t, uint8_t> type: typeflow_visited[u.id])
                            {
                                if(!filter[type.first])
                                    continue;

                                changed |= typeflow_visited[v.id].add_type(type.first, dist);

                                if(typeflow_visited[v.id].is_saturated())
                                    break;
                            }

                            if(changed && method_history[adj[v].method.dependent().id] != numeric_limits<uint8_t>::max())
                                typeflow_worklist.push(v);
                        }
                    }
                    else
                    {
                        for(auto v: adj[u].forward_edges)
                        {
                            if(typeflow_visited[v.id].is_saturated())
                                continue;

                            if(!included_in_saturation_uses[v.id])
                            {
                                saturation_uses.push_back(v);
                                included_in_saturation_uses[v.id] = true;

                                bool changed = false;

                                tmp = allInstantiated;
                                tmp &= *adj[v].filter;
                                for(size_t t = tmp.first(); t < adj.n_types(); t = tmp.next(t))
                                {
                                    changed |= typeflow_visited[v.id].add_type(t, dist);
                                    if(typeflow_visited[v.id].is_saturated())
                                        break;
                                }

                                if(changed && method_history[adj[v].method.dependent().id] != numeric_limits<uint8_t>::max())
                                    typeflow_worklist.push(v);
                            }
                        }
                    }
                }

                {
                    auto it = saturation_uses.begin();

                    while(it != saturation_uses.end())
                    {
                        typeflow_id u = *it;

                        if(typeflow_visited[u.id].is_saturated())
                        {
                            assert(included_in_saturation_uses[u.id]);
                            included_in_saturation_uses[u.id] = false;
                            it = saturation_uses.erase(it);
                        }
                        else
                        {
                            const Bitset& filter = *adj[u].filter;

                            bool changed = false;

                            for(uint16_t type: instantiated_since_last_iteration)
                            {
                                if(!filter[type])
                                    continue;

                                changed |= typeflow_visited[u.id].add_type(type, dist);

                                if(typeflow_visited[u.id].is_saturated())
                                    break;
                            }

                            if(changed && method_history[adj[u].method.dependent().id] != numeric_limits<uint8_t>::max())
                                typeflow_worklist.push(u);

                            it++;
                        }
                    }
                }

                instantiated_since_last_iteration.clear();
            }
        }

        for(method_id purged : purged_methods)
            method_visited[purged.id] = false;

#if !NDEBUG
        cerr << "n_worklist_added(" << n_worklist_added << ") ";
        cerr << "n_types_instantiated(" << allInstantiated.count() << '/' << allInstantiated.size() << ") ";
#endif
    }
};

#endif //CAUSALITY_GRAPH_ANALYSIS_H
