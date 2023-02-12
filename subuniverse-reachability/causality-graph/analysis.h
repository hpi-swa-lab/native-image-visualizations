#ifndef CAUSALITY_GRAPH_ANALYSIS_H
#define CAUSALITY_GRAPH_ANALYSIS_H

#include <queue>
#include "model.h"
#include <array>

using namespace std;

struct __attribute__((aligned(64))) TypeflowHistory
{
    static constexpr size_t saturation_cutoff = 20;

    type_t types[saturation_cutoff];
    uint8_t dists[saturation_cutoff];
    uint8_t saturated_dist = numeric_limits<uint8_t>::max();

public:
    TypeflowHistory()
    {
        fill(types, types + saturation_cutoff, numeric_limits<type_t>::max());
        fill(dists, dists + saturation_cutoff, numeric_limits<uint8_t>::max());
    }


public:
    bool add_type(type_t type, uint8_t dist)
    {
        for(size_t i = 0; i < saturation_cutoff; i++)
        {
            if(types[i] == numeric_limits<type_t>::max())
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
            return pos == saturation_cutoff || parent->types[pos] == numeric_limits<type_t>::max();
        }

        pair<type_t, uint8_t> operator*() const
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
        return /*is_saturated() || */types[0] != numeric_limits<type_t>::max();
    }

    size_t count() const
    {
        size_t c = 0;
        for(auto tmp : *this)
            c++;
        return c;
    }

    bool contains(type_t t) const
    {
        for(auto tmp : *this)
            if(tmp.first == t)
                return true;
        return false;
    }
};

static_assert(std::is_trivially_copyable<TypeflowHistory>::value);
static_assert(std::is_trivially_assignable<TypeflowHistory, TypeflowHistory>::value);
static_assert(std::is_trivially_copy_assignable<TypeflowHistory>::value);
static_assert(std::is_trivially_copy_constructible<TypeflowHistory>::value);
static_assert(std::is_default_constructible<TypeflowHistory>::value);
//static_assert(std::is_trivially_default_constructible<TypeflowHistory>::value);
static_assert(std::is_trivially_destructible<TypeflowHistory>::value);
//static_assert(std::is_trivial<TypeflowHistory>::value);
static_assert(sizeof(TypeflowHistory) == 64);


class BFS
{
public:
    struct ResultDiff
    {
        vector<method_id> visited_method_log;
        vector<pair<typeflow_id, TypeflowHistory>> typeflow_visited_log;
        vector<type_t> allInstantiated_log;
        vector<typeflow_id> included_in_saturation_uses_log;
        vector<typeflow_id> saturation_uses_by_filter_added_log;
        vector<typeflow_id> saturation_uses_by_filter_removed_log;

        ResultDiff(vector<method_id>&& visited_method_log,
                   vector<pair<typeflow_id, TypeflowHistory>>&& typeflow_visited_log,
                   vector<type_t>&& allInstantiated_log,
                   vector<typeflow_id>&& included_in_saturation_uses_log,
                   vector<typeflow_id>&& saturation_uses_by_filter_added_log,
                   vector<typeflow_id>&& saturation_uses_by_filter_removed_log)
                : visited_method_log(std::move(visited_method_log)),
                  typeflow_visited_log(std::move(typeflow_visited_log)),
                  allInstantiated_log(std::move(allInstantiated_log)),
                  included_in_saturation_uses_log(std::move(included_in_saturation_uses_log)),
                  saturation_uses_by_filter_added_log(std::move(saturation_uses_by_filter_added_log)),
                  saturation_uses_by_filter_removed_log(std::move(saturation_uses_by_filter_removed_log))
        {
#if LOG
            size_t complete_size = 0;
            complete_size += this->visited_method_log.capacity() * sizeof(method_id);
            complete_size += this->typeflow_visited_log.capacity() * sizeof(pair<typeflow_id, TypeflowHistory>);
            complete_size += this->allInstantiated_log.capacity() * sizeof(type_t);
            complete_size += this->included_in_saturation_uses_log.capacity() * sizeof(typeflow_id);
            complete_size += this->saturation_uses_by_filter_added_log.capacity() * sizeof(typeflow_id);
            complete_size += this->saturation_uses_by_filter_removed_log.capacity() * sizeof(typeflow_id);
            cerr << "ResultDiff size: " << complete_size << endl;
#endif
        }
    };

    struct Result
    {
        vector<TypeflowHistory> typeflow_visited;
        vector<uint8_t> method_history;
        vector<bool> method_visited;
        boost::dynamic_bitset<> allInstantiated;
        vector<vector<typeflow_id>> saturation_uses_by_filter;
        vector<bool> included_in_saturation_uses;

        Result(size_t n_methods, size_t n_typeflows, size_t n_types, size_t n_filters) :
            typeflow_visited(n_typeflows),
            method_visited(n_methods),
            method_history(n_methods, numeric_limits<uint8_t>::max()),
            allInstantiated(n_types),
            saturation_uses_by_filter(n_filters),
            included_in_saturation_uses(n_typeflows)
        {}

        explicit Result(const BFS& bfs) : Result(bfs.adj.n_methods(), bfs.adj.n_typeflows(), bfs.adj.n_types(), bfs.filter_filters.size())
        {}

        void revert(const BFS& bfs, const ResultDiff& changes)
        {
            for(method_id m : changes.visited_method_log)
            {
                method_visited[m.id] = false;
                method_history[m.id] = numeric_limits<uint8_t>::max();
            }

            for(size_t i = changes.typeflow_visited_log.size(); i > 0; i--)
            {
                const auto& change = changes.typeflow_visited_log[i-1];
                typeflow_visited[change.first.id] = change.second;
            }

            for(auto t : changes.allInstantiated_log)
            {
                allInstantiated[t] = false;
            }

            for(typeflow_id flow : changes.included_in_saturation_uses_log)
            {
                included_in_saturation_uses[flow.id] = false;
            }

            for(typeflow_id flow : changes.saturation_uses_by_filter_removed_log)
            {
                saturation_uses_by_filter[bfs.adj[flow].original_filter - bfs.filters_begin].push_back(flow);
            }

            for(typeflow_id flow : changes.saturation_uses_by_filter_added_log)
            {
                erase(saturation_uses_by_filter[bfs.adj[flow].original_filter - bfs.filters_begin], flow);
            }
        }
    };

    const Adjacency& adj;
    const Bitset* filters_begin;
    vector<TypeSet> filter_filters;
    vector<TypeSet> typeflow_filters;

    explicit BFS(const Adjacency& adj) : adj(adj)
    {
        const Bitset* filters_end;

        {
            auto [f1, f2] = std::minmax_element(adj.flows.begin(), adj.flows.end(), [](const auto& a, const auto& b)
            { return a.original_filter < b.original_filter; });

            filters_begin = f1->original_filter;
            filters_end = f2->original_filter + 1;
        }

        filter_filters.reserve(filters_end - filters_begin);

        for(size_t i = 0; i < filters_end - filters_begin; i++)
        {
            filter_filters.emplace_back(&filters_begin[i]);
        }

        typeflow_filters.reserve(adj.n_typeflows());

        for(size_t i = 0; i < adj.n_typeflows(); i++)
        {
            size_t filter_index = adj.flows[i].original_filter - filters_begin;
            typeflow_filters.push_back(filter_filters[filter_index]);
        }
    }

    /* If dist_matters is asigned false, the BFS gets sped up about x2.
     * However, all dist-values of types in typeflows and methods will be zero. */
    template<bool dist_matters = true>
    [[nodiscard]] Result run(span<const method_id> purged_methods = {}) const
    {
#if LOG
        cerr << "n_filters: " << filter_filters.size() << ", n_methods: " << adj.n_methods() << ", n_types: " << adj.n_types() << ", n_typeflows: " << adj.n_typeflows() << endl;
#endif
        Result r(*this);

        for(method_id purged : purged_methods)
            r.method_visited[purged.id] = true;

        method_id root_method = 0;
        typeflow_id root_typeflow = 0;

        run<dist_matters>(r, {&root_method, 1}, {&root_typeflow, 1});

        for(method_id purged : purged_methods)
            r.method_visited[purged.id] = false;

        return r;
    }

    /* If dist_matters is asigned false, the BFS gets sped up about x2.
     * However, all dist-values of types in typeflows and methods will be zero. */
    template<bool dist_matters = true, bool track_changes = false>
    auto run(Result& r, span<method_id> method_worklist_init, span<typeflow_id> typeflow_worklist_init) const
    {
        vector<bool> method_visited(std::move(r.method_visited));
        vector<uint8_t> method_history(std::move(r.method_history));
        vector<TypeflowHistory> typeflow_visited(std::move(r.typeflow_visited));
        boost::dynamic_bitset<> allInstantiated(std::move(r.allInstantiated));
        vector<vector<typeflow_id>> saturation_uses_by_filter(std::move(r.saturation_uses_by_filter));
        vector<bool> included_in_saturation_uses(std::move(r.included_in_saturation_uses));

        vector<method_id> visited_method_log;
        vector<pair<typeflow_id, TypeflowHistory>> typeflow_visited_log;
        vector<type_t> allInstantiated_log;
        vector<typeflow_id> included_in_saturation_uses_log;
        vector<typeflow_id> saturation_uses_by_filter_added_log;
        vector<typeflow_id> saturation_uses_by_filter_removed_log;

        for(method_id root : method_worklist_init)
        {
            method_visited[root.id] = true;
            method_history[root.id] = 0;
        }

        vector<method_id> method_worklist(method_worklist_init.begin(), method_worklist_init.end());
        vector<method_id> next_method_worklist;
        queue<typeflow_id> typeflow_worklist;
        vector<type_t> instantiated_since_last_iteration;

        // Handle white-hole typeflow
        for(typeflow_id root : typeflow_worklist_init)
        {
            for(auto v: adj[root].forward_edges)
            {
                TypeSet filter = typeflow_filters[v.id];
                bool changed = false;
                TypeflowHistory before = typeflow_visited[v.id];

                for(size_t t = filter.first(); t < adj.n_types(); t = filter.next(t))
                {
                    changed |= typeflow_visited[v.id].add_type(t, 0);

                    if(typeflow_visited[v.id].is_saturated())
                        break;
                }

                for(pair<type_t, uint8_t> type: typeflow_visited[root.id])
                {
                    if(!allInstantiated[type.first])
                    {
                        allInstantiated[type.first] = true;
                        instantiated_since_last_iteration.push_back(type.first);
                    }
                }

                if(track_changes && changed)
                    typeflow_visited_log.emplace_back(v, before);

                if(changed && !adj[v].method.dependent())
                    typeflow_worklist.push(v);
            }
        }

        uint8_t dist = 0;

        while(!method_worklist.empty())
        {
            do
            {
                if(track_changes)
                    std::copy(method_worklist.begin(), method_worklist.end(), back_inserter(visited_method_log));

                for(method_id u: method_worklist)
                {
                    method_history[u.id] = dist;
                    const auto& m = adj[u];

                    for(auto v: m.dependent_typeflows)
                        if(typeflow_visited[v.id].any())
                            typeflow_worklist.push(v);

                    for(auto v: m.forward_edges)
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
            }
            while(!dist_matters && !method_worklist.empty());

            if(dist_matters)
                dist++;

            for(;;)
            {
                while(!typeflow_worklist.empty())
                {
                    typeflow_id u = typeflow_worklist.front();
                    typeflow_worklist.pop();

                    method_id reaching = adj[u].method.reaching();

                    if(!method_visited[reaching.id])
                    {
                        method_visited[reaching.id] = true;
                        method_worklist.push_back(reaching);
                    }

                    if(!typeflow_visited[u.id].is_saturated())
                    {
                        for(auto v: adj[u].forward_edges)
                        {
                            if(v == adj.allInstantiated || typeflow_visited[v.id].is_saturated())
                            {
                                for(pair<type_t, uint8_t> type: typeflow_visited[u.id])
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

                            TypeSet filter = typeflow_filters[v.id];

                            bool changed = false;
                            TypeflowHistory before = typeflow_visited[v.id];

                            for(pair<type_t, uint8_t> type: typeflow_visited[u.id])
                            {
                                if(!filter[type.first])
                                    continue;

                                changed |= typeflow_visited[v.id].add_type(type.first, dist);

                                if(typeflow_visited[v.id].is_saturated())
                                    break;
                            }

                            if(typeflow_visited[v.id].is_saturated())
                            {
                                for(pair<type_t, uint8_t> type: typeflow_visited[u.id])
                                {
                                    if(!allInstantiated[type.first])
                                    {
                                        allInstantiated[type.first] = true;
                                        instantiated_since_last_iteration.push_back(type.first);
                                    }
                                }
                            }

                            if(track_changes && changed)
                                typeflow_visited_log.emplace_back(v, before);

                            if(changed && method_history[adj[v].method.dependent().id] != numeric_limits<uint8_t>::max())
                                typeflow_worklist.push(v);
                        }
                    }
                    else
                    {
                        for(pair<type_t, uint8_t> type: typeflow_visited[u.id])
                        {
                            if(!allInstantiated[type.first])
                            {
                                allInstantiated[type.first] = true;
                                instantiated_since_last_iteration.push_back(type.first);
                            }
                        }

                        for(auto v: adj[u].forward_edges)
                        {
                            if(typeflow_visited[v.id].is_saturated())
                                continue;

                            if(included_in_saturation_uses[v.id])
                                continue;

                            included_in_saturation_uses[v.id] = true;
                            if(track_changes)
                                included_in_saturation_uses_log.push_back(v);

                            bool changed = false;
                            TypeflowHistory before = typeflow_visited[v.id];

                            TypeSet filter = typeflow_filters[v.id];

                            for(size_t t = filter.first(); t < adj.n_types(); t = filter.next(t))
                            {
                                if(!allInstantiated[t])
                                    continue;

                                changed |= typeflow_visited[v.id].add_type(t, dist);

                                if(typeflow_visited[v.id].is_saturated())
                                    break;
                            }

                            if(!typeflow_visited[v.id].is_saturated())
                            {
                                saturation_uses_by_filter[adj[v].original_filter - filters_begin].push_back(v);
                                if(track_changes)
                                    saturation_uses_by_filter_added_log.push_back(v);
                            }

                            if(track_changes && changed)
                                typeflow_visited_log.emplace_back(v, before);

                            if(changed && method_history[adj[v].method.dependent().id] != numeric_limits<uint8_t>::max())
                                typeflow_worklist.push(v);
                        }
                    }
                }

                // Spreading saturation uses is relatively costly, therefore we try to avoid it
                if(!dist_matters && !method_worklist.empty())
                    break;

                if(instantiated_since_last_iteration.empty())
                    break;

                vector<type_t> instantiated_since_last_iteration_filtered;

                for(size_t filter_id = 0; filter_id < filter_filters.size(); filter_id++)
                {
                    auto& saturation_uses = saturation_uses_by_filter[filter_id];

                    if(saturation_uses.empty())
                        continue;

                    if(track_changes)
                    {
                        for(typeflow_id v : saturation_uses)
                            if(typeflow_visited[v.id].is_saturated())
                                saturation_uses_by_filter_removed_log.push_back(v);
                    }

                    erase_if(saturation_uses, [&typeflow_visited](typeflow_id v){ return typeflow_visited[v.id].is_saturated(); });

                    if(saturation_uses.empty())
                        continue;

                    TypeSet filter = filter_filters[filter_id];

                    size_t filter_count = filter.count();
                    if(filter_count <= 4)
                    {
                        size_t i = 0;
                        for(type_t type = filter.first(); i < filter_count; type = filter.next(type), i++)
                        {
                            if(std::find(instantiated_since_last_iteration.begin(), instantiated_since_last_iteration.end(), type) != instantiated_since_last_iteration.end())
                            {
                                instantiated_since_last_iteration_filtered.push_back(type);
                            }
                        }
                    }
                    else
                    {
                        for(type_t type: instantiated_since_last_iteration)
                        {
                            if(!filter[type])
                                continue;

                            instantiated_since_last_iteration_filtered.push_back(type);
                        }
                    }

                    if(instantiated_since_last_iteration_filtered.empty())
                    {
                        continue;
                    }

                    auto it = saturation_uses.begin();

                    while(it != saturation_uses.end())
                    {
                        typeflow_id v = *it;

                        if(typeflow_visited[v.id].is_saturated())
                        {
                            it = saturation_uses.erase(it);
                        }
                        else
                        {
                            bool changed = false;
                            TypeflowHistory before = typeflow_visited[v.id];

                            for(type_t type : instantiated_since_last_iteration_filtered)
                            {
                                changed |= typeflow_visited[v.id].add_type(type, dist);

                                if(typeflow_visited[v.id].is_saturated())
                                    break;
                            }

                            if(track_changes && changed)
                                typeflow_visited_log.emplace_back(v, before);

                            if(changed && method_history[adj[v].method.dependent().id] != numeric_limits<uint8_t>::max())
                                typeflow_worklist.push(v);

                            it++;
                        }
                    }

                    instantiated_since_last_iteration_filtered.clear();
                }


                if(track_changes)
                    std::copy(instantiated_since_last_iteration.begin(), instantiated_since_last_iteration.end(), back_inserter(allInstantiated_log));

                instantiated_since_last_iteration.clear();
            }
        }

        assert(instantiated_since_last_iteration.empty());

        r.method_visited = std::move(method_visited);
        r.method_history = std::move(method_history);
        r.typeflow_visited = std::move(typeflow_visited);
        r.allInstantiated = std::move(allInstantiated);
        r.included_in_saturation_uses = std::move(included_in_saturation_uses);
        r.saturation_uses_by_filter = std::move(saturation_uses_by_filter);

        return ResultDiff(std::move(visited_method_log), std::move(typeflow_visited_log), std::move(allInstantiated_log), std::move(included_in_saturation_uses_log), std::move(saturation_uses_by_filter_added_log), std::move(saturation_uses_by_filter_removed_log));
    }
};

static void assert_reachability_equals(const BFS::Result& r1, const BFS::Result& r2)
{
    if(!(r1.allInstantiated == r2.allInstantiated))
    {
        cerr << "All Idiot!" << endl;
        cerr << (r2.allInstantiated & ~r1.allInstantiated).find_first() << endl;
        exit(1);
    }

    if(r1.method_history.size() != r2.method_history.size())
    {
        cerr << "Sizable Idiot!" << endl;
        exit(1);
    }

    if(r1.typeflow_visited.size() != r2.typeflow_visited.size())
    {
        cerr << "Sizable Idiot2!" << endl;
        exit(1);
    }

    for(size_t i = 0; i < r1.typeflow_visited.size(); i++)
    {
        if(r1.typeflow_visited[i].any() != r2.typeflow_visited[i].any())
        {
            cerr << "Idiot2!" << endl;
            exit(1);
            continue;
        }

        if(r1.typeflow_visited[i].is_saturated() != r2.typeflow_visited[i].is_saturated())
        {
            cerr << "Idiot3!" << endl;
            exit(1);
            continue;
        }

        if(r1.typeflow_visited[i].is_saturated())
            continue;

        if(r1.typeflow_visited[i].count() != r2.typeflow_visited[i].count())
        {
            cerr << "Idiot4!" << endl;
            exit(1);
            continue;
        }

        for(auto tp1 : r1.typeflow_visited[i])
        {
            bool c = r1.typeflow_visited[i].contains(tp1.first);

            for(auto tp2 : r2.typeflow_visited[i])
            {
                if(tp1.first == tp2.first)
                    goto found;
            }

            cerr << "Idiot5!" << endl;
            exit(1);
            break;

            found: {}
        }
    }

    for(size_t i = 0; i < r1.method_history.size(); i++)
    {
        if((r1.method_history[i] == 0xFF) != (r2.method_history[i] == 0xFF))
        {
            cerr << "Idiot!" << endl;
            exit(1);
        }
    }
}


static void bfs_incremental_rec(const BFS::Result& all_reachable, const BFS& bfs, BFS::Result& r, span<const span<const method_id>> methods_to_purge, const function<void(const span<const method_id>&, const BFS::Result&)>& callback)
{
    if(methods_to_purge.empty())
    {
#if REACHABILITY_ASSERTIONS
        assert_reachability_equals(all_reachable, r);
#endif
        return;
    }
    else if(methods_to_purge.size() == 1)
    {
#if REACHABILITY_ASSERTIONS
        BFS::Result ref = bfs.run(methods_to_purge[0]);
        assert_reachability_equals(ref, r);
#endif
        callback(methods_to_purge[0], r);
#if !REACHABILITY_ASSERTIONS
        return;
#endif
    }

    // Divide the purge sets into two of similar sum-size for algorithmic performance reasons
    size_t mid_index;
    {
        size_t n_total_methods = 0;

        for(span<const method_id> subset: methods_to_purge)
            n_total_methods += subset.size();

        mid_index = 0;
        for(size_t mid_size = 0; mid_index < methods_to_purge.size() && mid_size < n_total_methods / 2; mid_index++)
        {
            mid_size += methods_to_purge[mid_index].size();
            if(mid_size >= n_total_methods / 2)
            {
                if(n_total_methods - mid_size > mid_size - methods_to_purge[mid_index].size())
                    mid_index++;
                break;
            }
        }
    }

    span<const span<const method_id>> first_half = methods_to_purge.subspan(0, mid_index);
    span<const span<const method_id>> second_half = methods_to_purge.subspan(mid_index);

    auto search_child = [&](BFS::Result& r2, span<const span<const method_id>> depurge, span<const span<const method_id>> stillpurge)
    {
#if REACHABILITY_ASSERTIONS
        if(depurge.empty())
            return;
        BFS::Result r2_copy = r2;
#endif

        auto& method_visited = r2.method_visited;
        size_t root_methods_capacity = std::accumulate(depurge.begin(), depurge.end(), size_t(0), [](size_t acc, auto mids){ return acc + mids.size(); });
        method_id root_methods[root_methods_capacity];
        size_t root_methods_size = 0;

        for(span<const method_id> mids : depurge)
        {
            for(method_id mid : mids)
            {
                method_visited[mid.id] = false;

                auto m = bfs.adj[mid];
                if(
                        std::any_of(m.backward_edges.begin(), m.backward_edges.end(), [&](const auto& item)
                        {
                            return r2.method_history[item.id] != 0xFF;
                        })
                        ||
                        std::any_of(m.virtual_invocation_sources.begin(), m.virtual_invocation_sources.end(), [&](const auto& item)
                        {
                            return r2.typeflow_visited[item.id].any();
                        })
                        )
                {
                    root_methods[root_methods_size++] = mid;
                }
            }
        }

        auto incremental_changes = bfs.run<false, true>(r2, {root_methods, root_methods + root_methods_size}, {});
        bfs_incremental_rec(all_reachable, bfs, r2, stillpurge, callback);
        r2.revert(bfs, incremental_changes);
        for(span<const method_id> mids : depurge)
            for(method_id mid : mids)
                method_visited[mid.id] = true;

#if REACHABILITY_ASSERTIONS
        assert_reachability_equals(r2_copy, r2);
#endif
    };

    search_child(r, second_half, first_half);
    search_child(r, first_half, second_half);
}

#endif //CAUSALITY_GRAPH_ANALYSIS_H
