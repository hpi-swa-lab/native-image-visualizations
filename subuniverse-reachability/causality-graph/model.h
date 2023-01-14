//
// Created by christoph on 11.01.23.
//

#ifndef CAUSALITY_GRAPH_MODEL_H
#define CAUSALITY_GRAPH_MODEL_H


#include <cstdint>
#include <unordered_map>
#include "Bitset.h"
#include <span>
#include "analysis.h"

using namespace std;

struct method_id
{
    uint32_t id;

    method_id(uint32_t id) : id(id) {}
    method_id() = default;
    explicit operator uint32_t() const { return id; }
    bool operator==(method_id other) const { return id == other.id; }
    explicit operator bool() const { return id != 0; }
};

struct typeflow_id
{
    uint32_t id;

    typeflow_id(uint32_t id) : id(id) {}
    typeflow_id() = default;
    explicit operator uint32_t() const { return id; }
    bool operator==(typeflow_id other) const { return id == other.id; }
    explicit operator bool() const { return id != 0; }
};

struct TypestateEdge
{
    typeflow_id src;
    method_id dst;
    uint32_t typestate_id;
};

static_assert(sizeof(TypestateEdge) == 12);
static_assert(offsetof(TypestateEdge, src) == 0);
static_assert(offsetof(TypestateEdge, dst) == 4);
static_assert(offsetof(TypestateEdge, typestate_id) == 8);

template<typename T>
struct Edge
{
    T src;
    T dst;
};

static_assert(sizeof(Edge<method_id>) == 8);
static_assert(sizeof(Edge<typeflow_id>) == 8);
static_assert(offsetof(Edge<method_id>, src) == 0);
static_assert(offsetof(Edge<typeflow_id>, src) == 0);
static_assert(offsetof(Edge<method_id>, dst) == 4);
static_assert(offsetof(Edge<typeflow_id>, dst) == 4);

class ContainingMethod
{
    uint32_t _id : 31;
    bool _is_reaching : 1;

public:
    ContainingMethod() = default;
    ContainingMethod(method_id id, bool is_reaching) : _id(id), _is_reaching(is_reaching) {}

    method_id reaching() const {
        return _is_reaching ? _id : 0;
    }

    method_id dependent() const {
        return _is_reaching ? 0 : _id;
    }
};

static_assert(sizeof(ContainingMethod) == 4);

struct Adjacency
{
    struct TypeflowInfo
    {
        vector<typeflow_id> forward_edges;
        vector<typeflow_id> backward_edges;
        const Bitset* filter;
        ContainingMethod method;
        string name;
    };

    struct MethodInfo
    {
        vector<method_id> forward_edges;
        vector<method_id> backward_edges;
        vector<typeflow_id> dependent_typeflows;
        vector<typeflow_id> virtual_invocation_sources;
    };

    size_t _n_types;
    vector<TypeflowInfo> flows;
    vector<MethodInfo> methods;
    typeflow_id allInstantiated;

    Adjacency(size_t n_types, size_t n_methods, size_t n_typeflows, const vector<Edge<typeflow_id>>& interflows, const vector<Edge<method_id>>& direct_invokes, const vector<Bitset>& typestates, const vector<uint32_t>& typeflow_filters, const vector<ContainingMethod>& typeflow_methods, const vector<string>& typeflow_names)
            : _n_types(n_types), flows(n_typeflows), methods(n_methods)
    {
        for(auto e : interflows)
        {
            assert(e.src != e.dst);
            flows[e.src.id].forward_edges.push_back(e.dst);
            flows[e.dst.id].backward_edges.push_back(e.src);
        }
        for(auto e : direct_invokes)
        {
            methods[e.src.id].forward_edges.push_back(e.dst);
            methods[e.dst.id].backward_edges.push_back(e.src);
        }
        for(size_t flow = 0; flow < typeflow_methods.size(); flow++)
        {
            flows[flow].method = typeflow_methods[flow];
            if(typeflow_methods[flow].dependent())
                methods[typeflow_methods[flow].dependent().id].dependent_typeflows.push_back(flow);
            if(typeflow_methods[flow].reaching())
                methods[typeflow_methods[flow].reaching().id].virtual_invocation_sources.push_back(flow);
        }

        for(size_t i = 0; i < typeflow_filters.size(); i++)
            flows[i].filter = &typestates.at(typeflow_filters[i]);

        allInstantiated = 0;
        for(size_t i = 0; i < typeflow_names.size(); i++)
        {
            flows[i].name = typeflow_names[i];
            if(typeflow_names[i] == "AllInstantiatedTypeFlow: java.lang.Object")
                allInstantiated = i;
        }

        assert(allInstantiated);
    }

    [[nodiscard]] size_t n_typeflows() const { return flows.size(); }

    [[nodiscard]] size_t n_methods() const { return methods.size(); }

    [[nodiscard]] size_t n_types() const { return _n_types; }

    [[nodiscard]] MethodInfo& operator[](method_id id) { return methods[(uint32_t)id]; }
    [[nodiscard]] const MethodInfo& operator[](method_id id) const { return methods[(uint32_t)id]; }

    [[nodiscard]] TypeflowInfo& operator[](typeflow_id id) { return flows[(uint32_t)id]; }
    [[nodiscard]] const TypeflowInfo& operator[](typeflow_id id) const { return flows[(uint32_t)id]; }
};

static bool is_redundant(const Adjacency& adj, typeflow_id typeflow)
{
    const auto& f = adj[typeflow];

    if(f.backward_edges.empty())
        return true;

    if(f.forward_edges.empty() && !f.method.reaching())
        return true;

    if(!f.method.reaching())
    {
        if(f.forward_edges.size() == 1 && f.backward_edges.size() == 1)
        {
            method_id M1 = adj[f.backward_edges[0]].method.dependent();
            method_id M2 = f.method.dependent();
            method_id M3 = adj[f.forward_edges[0]].method.dependent();

            if((M2 == M1 || M2 == M3 || M2 == 0)
               && f.filter->is_superset(*adj[f.forward_edges[0]].filter))
                return true;
        }

        if(f.forward_edges.size() > 1 && f.backward_edges.size() == 1)
        {
            method_id M1 = adj[f.backward_edges[0]].method.dependent();
            method_id M2 = f.method.dependent();

            for(auto& next : f.forward_edges)
            {
                if(!f.filter->is_superset(*adj[next].filter))
                    return false;
            }

            if(M2 == M1 || M2 == 0)
                return true;

            return std::all_of(f.forward_edges.begin(), f.forward_edges.end(), [&](typeflow_id next) { return adj[next].method.dependent() == M2; });
        }

        if(f.forward_edges.size() == 1 && f.backward_edges.size() > 1)
        {
            method_id M2 = f.method.dependent();
            method_id M3 = adj[f.forward_edges[0]].method.dependent();

            if(!f.filter->is_superset(*adj[f.forward_edges[0]].filter))
                return false;

            if(M2 == M3 || M2 == 0)
                return true;

            return std::all_of(f.backward_edges.begin(), f.backward_edges.end(), [&](typeflow_id next) { return adj[next].method.dependent() == M2; });
        }
    }

    return false;
}

static void remove_redundant(Adjacency& adj)
{
    boost::dynamic_bitset<> redundant_typeflows(adj.n_typeflows());

    size_t useless_iterations = 0;

    for(typeflow_id typeflow = 1; useless_iterations <= adj.n_typeflows(); typeflow = typeflow.id == adj.n_typeflows() - 1 ? 1 : typeflow.id + 1)
    {
        if(!redundant_typeflows[typeflow.id] && is_redundant(adj, typeflow))
        {
            redundant_typeflows[typeflow.id] = true;
            auto& f = adj[typeflow];

            for(auto next : f.forward_edges)
            {
                auto removed = erase(adj[next].backward_edges, typeflow);
                assert(removed == 1);
            }

            for(auto prev : f.backward_edges)
            {
                auto removed = erase(adj[prev].forward_edges, typeflow);
                assert(removed == 1);

                for(auto& next : f.forward_edges)
                {
                    if(next != prev && std::find(adj[prev].forward_edges.begin(), adj[prev].forward_edges.end(), next) == adj[prev].forward_edges.end())
                    {
                        adj[prev].forward_edges.push_back(next);
                        adj[next].backward_edges.push_back(prev);
                    }
                }
            }

            f.forward_edges.clear();
            f.backward_edges.clear();

            useless_iterations = 0;
        }
        else
        {
            useless_iterations++;
        }
    }

#if !NDEBUG
    cerr << "Redundant typeflows: " << redundant_typeflows.count() << "/" << (adj.n_typeflows() - 1) << "=" << ((float) redundant_typeflows.count() / (adj.n_typeflows() - 1)) << endl;
#endif
}



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


struct model_data
{
    vector<string> type_names;
    vector<string> method_names;
    vector<string> typeflow_names;
    vector<Bitset> typestates;
    vector<Edge<typeflow_id>> interflows;
    vector<Edge<method_id>> direct_invokes;
    vector<ContainingMethod> containing_methods;
    vector<uint32_t> typeflow_filters;
    vector<uint32_t> declaring_types;

    model_data() : method_names(1), typeflow_names(1), declaring_types(1), typeflow_filters(1), containing_methods(1) {}
};

struct model
{
    vector<string> type_names;
    vector<string> method_names;
    vector<string> typeflow_names;
    vector<Bitset> typestates;

    Adjacency adj;

    unordered_map<string, uint32_t> method_ids_by_name;
    vector<uint32_t> declaring_types;

public:
    model(
        model_data&& data)
        :
        method_names(std::move(data.method_names)),
        type_names(std::move(data.type_names)),
        typeflow_names(std::move(data.typeflow_names)),
        typestates(std::move(data.typestates)),
        declaring_types(std::move(data.declaring_types)),
        adj(type_names.size(), method_names.size(), typeflow_names.size(), data.interflows, data.direct_invokes, this->typestates, data.typeflow_filters, data.containing_methods, data.typeflow_names)
    {
        {
            size_t i = 0;
            for(const auto &name: method_names)
                method_ids_by_name[name] = i++;
        }

        size_t max_typestate_size = 0;
        for(Bitset& typestate : typestates)
            max_typestate_size = max(max_typestate_size, typestate.count());

#if !NDEBUG
        cerr << "All instantiated types: " << max_typestate_size << endl;
#endif

        remove_redundant(adj);

        cerr << "Ready!" << endl;
    }
};


#endif //CAUSALITY_GRAPH_MODEL_H
