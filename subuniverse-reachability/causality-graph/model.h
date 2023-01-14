//
// Created by christoph on 11.01.23.
//

#ifndef CAUSALITY_GRAPH_MODEL_H
#define CAUSALITY_GRAPH_MODEL_H


#include <cstdint>
#include <unordered_map>
#include "Bitset.h"
#include <span>

using namespace std;

using type_t = uint16_t;

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

            if(f.method.dependent())
            {
                auto& dmv = adj[f.method.dependent()].dependent_typeflows;
                erase(dmv, typeflow);
            }
            else if(f.method.reaching())
            {
                auto& rmv = adj[f.method.reaching()].virtual_invocation_sources;
                erase(rmv, typeflow);
            }

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

    assert(!redundant_typeflows[0]);

    // --- Compact typeflows ---

    vector<int> typeflow_remapping(adj.n_typeflows(), -1);

    {
        size_t id = 0;
        size_t i = 0;
        for(auto& new_id: typeflow_remapping)
        {
            if(redundant_typeflows[i++])
                continue;

            new_id = id++;
        }
    }

    auto remap = [&](typeflow_id& f)
    {
        auto new_id = typeflow_remapping[f.id];
        if(new_id == -1)
            exit(1);
        f.id = new_id;
    };

    for(auto& m : adj.methods)
    {
        for(auto& f : m.dependent_typeflows)
            remap(f);

        for(auto& f : m.virtual_invocation_sources)
            remap(f);
    }

    remap(adj.allInstantiated);

    for(auto& f0 : adj.flows)
    {
        for(auto& f : f0.forward_edges)
            remap(f);

        for(auto& f : f0.backward_edges)
            remap(f);
    }

    vector<Adjacency::TypeflowInfo> new_flows(redundant_typeflows.size() - redundant_typeflows.count());

    for(size_t i = 0; i < adj.n_typeflows(); i++)
    {
        if(redundant_typeflows[i])
            continue;

        typeflow_id f = i;
        remap(f);

        if(new_flows[f.id].filter)
            exit(1);

        new_flows[f.id] = adj.flows[i];
    }

    swap(adj.flows, new_flows);
}

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
        adj(type_names.size(), method_names.size(), typeflow_names.size(), data.interflows, data.direct_invokes, this->typestates, data.typeflow_filters, data.containing_methods, typeflow_names)
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
    }
};


#endif //CAUSALITY_GRAPH_MODEL_H
