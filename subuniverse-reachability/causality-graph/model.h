//
// Created by christoph on 11.01.23.
//

#ifndef CAUSALITY_GRAPH_MODEL_H
#define CAUSALITY_GRAPH_MODEL_H

#include <cstdint>
#include <unordered_map>
#include "Bitset.h"
#include <span>
#include <queue>

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

class TypeSet
{
public:
    uintptr_t data;

public:
    TypeSet() : data(0) {}

    TypeSet(type_t single_type) : data((((uintptr_t)single_type << 1) | 1))
    {
        assert(data);
    }

    TypeSet(const Bitset* multiple_types) : data(multiple_types->count() == 1 ? (((uintptr_t)multiple_types->first()) << 1) | 1 : (uintptr_t)multiple_types)
    {
        assert(multiple_types);
        assert((((uintptr_t)multiple_types) & 1) == 0);
        assert(data);
    }

    [[nodiscard]] bool is_single_type() const
    {
        return (data & 1) != 0;
    }

    [[nodiscard]] type_t get_single_type() const
    {
        assert(is_single_type());
        return data >> 1;
    }

    bool operator[](size_t i) const
    {
        if(is_single_type())
        {
            return get_single_type() == i;
        }
        else
        {
            const Bitset& bs = *(const Bitset*)data;
            return bs[i];
        }
    }

    [[nodiscard]] size_t count() const
    {
        if(is_single_type())
        {
            return 1;
        }
        else
        {
            const Bitset& bs = *(const Bitset*)data;
            return bs.count();
        }
    }

    [[nodiscard]] type_t first() const
    {
        if(is_single_type())
        {
            return get_single_type();
        }
        else
        {
            const Bitset& bs = *(const Bitset*)data;
            return bs.first();
        }
    }

    [[nodiscard]] type_t next(size_t pos) const
    {
        if(is_single_type())
        {
            return numeric_limits<type_t>::max();
        }
        else
        {
            const Bitset& bs = *(const Bitset*)data;
            return bs.next(pos);
        }
    }

    [[nodiscard]] bool is_superset(TypeSet other) const
    {
        if(is_single_type())
        {
            if(other.is_single_type())
            {
                return this->get_single_type() == other.get_single_type();
            }
            else
            {
                return other.count() == 0;
            }
        }
        else
        {
            const Bitset& bs = *(const Bitset*)data;

            if(other.is_single_type())
            {
                return bs[other.get_single_type()];
            }
            else
            {
                const Bitset& other_bs = *(const Bitset*)other.data;
                return bs.is_superset(other_bs);
            }
        }
    }
};

struct Adjacency
{
    struct TypeflowInfo
    {
        vector<typeflow_id> forward_edges;
        vector<typeflow_id> backward_edges;
        const Bitset* original_filter;
        TypeSet filter;
        ContainingMethod method;
#if INCLUDE_LABELS
        string name;
#endif
    };

    struct MethodInfo
    {
        vector<method_id> forward_edges;
        vector<method_id> backward_edges;
        vector<typeflow_id> dependent_typeflows;
        vector<typeflow_id> virtual_invocation_sources;

        MethodInfo() = default;
        MethodInfo(const MethodInfo& o) = delete;
    };

    size_t _n_types;
    vector<TypeflowInfo> flows;
    vector<MethodInfo> methods;

    // Data used for batched saturation
    const Bitset* filters_begin;
    vector<TypeSet> filter_filters;

    Adjacency(size_t n_types, size_t n_methods, size_t n_typeflows, const vector<Edge<typeflow_id>>& interflows, const vector<Edge<method_id>>& direct_invokes, const vector<Bitset>& typestates, const vector<uint32_t>& typeflow_filters, const vector<ContainingMethod>& typeflow_methods, const vector<string>& typeflow_names)
            : _n_types(n_types), flows(n_typeflows), methods(n_methods)
    {
        vector<TypeSet> typestates_compressed;
        typestates_compressed.reserve(typestates.size());

        for(const Bitset& typestate : typestates)
            typestates_compressed.push_back(&typestate);

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
        {
            flows[i].original_filter = &typestates.at(typeflow_filters[i]);
            flows[i].filter = typestates_compressed.at(typeflow_filters[i]);
        }

#if INCLUDE_LABELS
        for(size_t i = 0; i < typeflow_names.size(); i++)
        {
            flows[i].name = typeflow_names[i];
        }
#endif

        for(auto& flow : flows)
        {
            flow.forward_edges.shrink_to_fit();
            flow.backward_edges.shrink_to_fit();
        }

        for(auto& m : methods)
        {
            m.forward_edges.shrink_to_fit();
            m.backward_edges.shrink_to_fit();
            m.virtual_invocation_sources.shrink_to_fit();
            m.dependent_typeflows.shrink_to_fit();
        }

        {
            const Bitset* filters_end;

            {
                auto [f1, f2] = std::minmax_element(flows.begin(), flows.end(), [](const auto& a, const auto& b)
                { return a.original_filter < b.original_filter; });

                filters_begin = f1->original_filter;
                filters_end = f2->original_filter + 1;
            }

            filter_filters.reserve(filters_end - filters_begin);

            for(size_t i = 0; i < filters_end - filters_begin; i++)
                filter_filters.emplace_back(&filters_begin[i]);
        }
    }

    [[nodiscard]] size_t n_typeflows() const { return flows.size(); }

    [[nodiscard]] size_t n_methods() const { return methods.size(); }

    [[nodiscard]] size_t n_types() const { return _n_types; }

    [[nodiscard]] MethodInfo& operator[](method_id id) { return methods[(uint32_t)id]; }
    [[nodiscard]] const MethodInfo& operator[](method_id id) const { return methods[(uint32_t)id]; }

    [[nodiscard]] TypeflowInfo& operator[](typeflow_id id) { return flows[(uint32_t)id]; }
    [[nodiscard]] const TypeflowInfo& operator[](typeflow_id id) const { return flows[(uint32_t)id]; }

    [[nodiscard]] size_t used_memory_size() const
    {
        size_t complete_size = 0;
        complete_size += flows.capacity() * sizeof(TypeflowInfo);
        complete_size += methods.capacity() * sizeof(MethodInfo);

        for(const auto& flow : flows)
        {
            complete_size += flow.forward_edges.capacity() * sizeof(typeflow_id);
            complete_size += flow.backward_edges.capacity() * sizeof(typeflow_id);
#if INCLUDE_LABELS
            complete_size += flow.name.capacity();
#endif
        }

        for(const auto& m : methods)
        {
            complete_size += m.forward_edges.capacity() * sizeof(method_id);
            complete_size += m.backward_edges.capacity() * sizeof(method_id);
            complete_size += m.dependent_typeflows.capacity() * sizeof(typeflow_id);
            complete_size += m.virtual_invocation_sources.capacity() * sizeof(typeflow_id);
        }

        return complete_size;
    }
};

static vector<bool> calc_typeflows_without_sideeffects(const Adjacency& adj)
{
    vector<bool> marked(adj.n_typeflows(), true);

    queue<typeflow_id> worklist;
    for(size_t i = 1; i < adj.n_typeflows(); i++) {
        if(adj.flows[i].method.reaching())
        {
            marked[i] = false;
            worklist.push(i);
        }
    }

    while(!worklist.empty())
    {
        typeflow_id u = worklist.front();
        worklist.pop();

        for(typeflow_id v : adj[u].backward_edges)
        {
            if(marked[v.id])
            {
                marked[v.id] = false;
                worklist.push(v);
            }
        }
    }

    return marked;
}

static bool can_be_contracted(const Adjacency& adj, typeflow_id typeflow)
{
    const auto& f = adj[typeflow];

    if(f.method.reaching())
        return false;

    if(f.forward_edges.size() > 1 && f.backward_edges.size() > 1)
        return false;

    method_id M2 = f.method.dependent();
    return (M2 == 0
        || std::all_of(f.backward_edges.begin(), f.backward_edges.end(), [&](typeflow_id next) { return adj[next].method.dependent() == M2; })
        || std::all_of(f.forward_edges.begin() , f.forward_edges.end() , [&](typeflow_id next) { return adj[next].method.dependent() == M2; }))
           && std::all_of(f.forward_edges.begin(), f.forward_edges.end(), [&adj, &f](typeflow_id next){ return f.filter.is_superset(adj[next].filter); });
}

// Returns the number of iterations
static size_t contract_typeflow_nodes(Adjacency& adj, vector<bool>& redundant_typeflows)
{
    size_t iterations = 0;
    size_t useless_iterations = 0;

    for(typeflow_id typeflow = 1; useless_iterations <= adj.n_typeflows(); typeflow = typeflow.id == adj.n_typeflows() - 1 ? 1 : typeflow.id + 1)
    {
        if(!redundant_typeflows[typeflow.id] && can_be_contracted(adj, typeflow))
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

                for(auto next : f.forward_edges)
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

        iterations++;
    }

    return iterations;
}

static void remove_redundant(Adjacency& adj)
{
    vector<bool> redundant_typeflows = calc_typeflows_without_sideeffects(adj);

    // Batch remove
    {
        auto is_redundant = [&redundant_typeflows](typeflow_id w){ return redundant_typeflows[w.id]; };

        for(size_t i = 0; i < adj.n_typeflows(); i++)
        {
            if(!redundant_typeflows[i])
                continue;

            auto& f = adj.flows[i];
            f.forward_edges.clear();
            f.backward_edges.clear();
            f.method = {};
        }

        for(auto& f : adj.flows)
        {
            erase_if(f.forward_edges, is_redundant);

            // Currently not necessary, bc successors of redundant typeflows are also redundant
            // erase_if(f.backward_edges, [&redundant_typeflows](typeflow_id w){ return redundant_typeflows[w.id]; });
        }

        for(auto& m : adj.methods)
        {
            erase_if(m.dependent_typeflows, is_redundant);
        }
    }

    size_t iterations = 0;
    iterations = contract_typeflow_nodes(adj, redundant_typeflows);
    size_t redundant_typeflows_count = std::count(redundant_typeflows.begin(), redundant_typeflows.end(), true);

#if LOG || 1
    cerr << "Redundant typeflows: " << redundant_typeflows_count << "/" << (adj.n_typeflows() - 1) << "=" << ((float)redundant_typeflows_count / (adj.n_typeflows() - 1)) << ", iterations: " << iterations << endl;
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

    for(auto& f0 : adj.flows)
    {
        for(auto& f : f0.forward_edges)
            remap(f);

        for(auto& f : f0.backward_edges)
            remap(f);
    }

    vector<Adjacency::TypeflowInfo> new_flows;
    new_flows.reserve(redundant_typeflows.size() - redundant_typeflows_count);

    for(size_t i = 0; i < adj.n_typeflows(); i++)
    {
        if(redundant_typeflows[i])
            continue;

        typeflow_id f = i;
        remap(f);

        assert(new_flows.size() == f.id);

        new_flows.emplace_back(std::move(adj.flows[i]));
    }

    adj.flows = std::move(new_flows);
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

    model_data() : method_names(1), typeflow_names(1), typeflow_filters(1), containing_methods(1) {}
};

struct model
{
    vector<string> type_names;
    vector<string> method_names;
    vector<string> typeflow_names;
    vector<Bitset> typestates;

    Adjacency adj;

    unordered_map<string, uint32_t> method_ids_by_name;

public:
    model(
        model_data&& data)
        :
        method_names(std::move(data.method_names)),
        type_names(std::move(data.type_names)),
        typeflow_names(std::move(data.typeflow_names)),
        typestates(std::move(data.typestates)),
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

#if LOG
        cerr << "All instantiated types: " << max_typestate_size << endl;
#endif
    }

    void optimize()
    {
        remove_redundant(adj);
    }

    size_t used_memory_size()
    {
        size_t size = adj.used_memory_size();
        for(const auto& typestate: typestates)
        {
            size += (typestate.size() + 7) / 8;
        }
        return size;
    }
};


#endif //CAUSALITY_GRAPH_MODEL_H
