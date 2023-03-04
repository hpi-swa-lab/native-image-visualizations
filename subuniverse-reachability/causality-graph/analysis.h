#ifndef CAUSALITY_GRAPH_ANALYSIS_H
#define CAUSALITY_GRAPH_ANALYSIS_H

#include <queue>
#include "model.h"
#include <array>
#include <stack>

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

class DefaultMethodHistory
{
public:
    uint8_t dist = numeric_limits<decltype(dist)>::max();

    explicit DefaultMethodHistory(uint8_t dist) : dist(dist) {}
    DefaultMethodHistory() = default;

    explicit operator bool() const
    {
        return dist != numeric_limits<decltype(dist)>::max();
    }
};


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

        ResultDiff() = default;
    };

    vector<TypeflowHistory> typeflow_visited;
    vector<DefaultMethodHistory> method_history;
    vector<bool> method_inhibited;
    boost::dynamic_bitset<> allInstantiated;
    vector<vector<typeflow_id>> saturation_uses_by_filter;
    vector<bool> included_in_saturation_uses;

    BFS(size_t n_methods, size_t n_typeflows, size_t n_types, size_t n_filters) :
        typeflow_visited(n_typeflows),
        method_inhibited(n_methods),
        method_history(n_methods),
        allInstantiated(n_types),
        saturation_uses_by_filter(n_filters),
        included_in_saturation_uses(n_typeflows)
    {}

    explicit BFS(const Adjacency& adj) : BFS(adj.n_methods(), adj.n_typeflows(), adj.n_types(), adj.filter_filters.size())
    {}

    /* If dist_matters is asigned false, the BFS gets sped up about x2.
     * However, all dist-values of types in typeflows and methods will be zero. */
    template<bool dist_matters = true>
    [[nodiscard]] static BFS run(const Adjacency& adj, span<const method_id> purged_methods = {})
    {
        BFS r(adj);

        for(method_id purged : purged_methods)
            r.method_inhibited[purged.id] = true;

        method_id root_method = 0;

        r.run<dist_matters>(adj, {&root_method, 1}, true);

        for(method_id purged : purged_methods)
            r.method_inhibited[purged.id] = false;

        return r;
    }

    /* If dist_matters is asigned false, the BFS gets sped up about x2.
     * However, all dist-values of types in typeflows and methods will be zero. */
    template<bool dist_matters = true, bool track_changes = false>
    auto run(const Adjacency& adj, span<const method_id> method_worklist_init, bool init_typeflows)
    {
        // Moving these into locals proved beneficial with the previous architecture, where the results were indirectly referenced
        // via BFS::Result.
        // TODO: Investigate if this is still necessary performance-wise
        vector<bool> method_inhibited(std::move(this->method_inhibited));
        vector<DefaultMethodHistory> method_history(std::move(this->method_history));
        vector<TypeflowHistory> typeflow_visited(std::move(this->typeflow_visited));
        boost::dynamic_bitset<> allInstantiated(std::move(this->allInstantiated));
        vector<vector<typeflow_id>> saturation_uses_by_filter(std::move(this->saturation_uses_by_filter));
        vector<bool> included_in_saturation_uses(std::move(this->included_in_saturation_uses));

        vector<method_id> visited_method_log;
        vector<pair<typeflow_id, TypeflowHistory>> typeflow_visited_log;
        vector<type_t> allInstantiated_log;
        vector<typeflow_id> included_in_saturation_uses_log;
        vector<typeflow_id> saturation_uses_by_filter_added_log;
        vector<typeflow_id> saturation_uses_by_filter_removed_log;

        for(method_id root : method_worklist_init)
        {
            method_inhibited[root.id] = true;
            method_history[root.id] = DefaultMethodHistory(0);
        }

        vector<method_id> method_worklist(method_worklist_init.begin(), method_worklist_init.end());
        vector<method_id> next_method_worklist;
        queue<typeflow_id> typeflow_worklist;
        vector<type_t> instantiated_since_last_iteration;

        // Handle white-hole typeflow
        if(init_typeflows)
        {
            for(auto v: adj.flows[0].forward_edges)
            {
                TypeSet filter = adj[v].filter;
                bool changed = false;
                TypeflowHistory before = typeflow_visited[v.id];

                for(size_t t = filter.first(); t < adj.n_types(); t = filter.next(t))
                {
                    changed |= typeflow_visited[v.id].add_type(t, 0);

                    if(typeflow_visited[v.id].is_saturated())
                    {
                        assert(false);
                        break;
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
                    method_history[u.id] = DefaultMethodHistory(dist);
                    const auto& m = adj[u];

                    for(auto v: m.dependent_typeflows)
                        if(typeflow_visited[v.id].any())
                            typeflow_worklist.push(v);

                    for(auto v: m.forward_edges)
                    {
                        if(!method_inhibited[v.id])
                        {
                            method_inhibited[v.id] = true;
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

                    if(!method_inhibited[reaching.id])
                    {
                        method_inhibited[reaching.id] = true;
                        method_worklist.push_back(reaching);
                    }

                    if(!typeflow_visited[u.id].is_saturated())
                    {
                        for(auto v: adj[u].forward_edges)
                        {
                            if(!typeflow_visited[v.id].is_saturated())
                            {
                                TypeSet filter = adj[v].filter;

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

                                if(track_changes && changed)
                                    typeflow_visited_log.emplace_back(v, before);

                                if(changed && method_history[adj[v].method.dependent().id])
                                    typeflow_worklist.push(v);
                            }

                            if(typeflow_visited[v.id].is_saturated())
                            {
                                for(pair<type_t, uint8_t> type: typeflow_visited[u.id])
                                {
                                    if(!allInstantiated[type.first] && adj[v].filter[type.first])
                                    {
                                        allInstantiated[type.first] = true;
                                        instantiated_since_last_iteration.push_back(type.first);
                                    }
                                }
                            }
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

                            TypeSet filter = adj[v].filter;

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
                                saturation_uses_by_filter[adj[v].original_filter - adj.filters_begin].push_back(v);
                                if(track_changes)
                                    saturation_uses_by_filter_added_log.push_back(v);
                            }

                            if(track_changes && changed)
                                typeflow_visited_log.emplace_back(v, before);

                            if(changed && method_history[adj[v].method.dependent().id])
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

                for(size_t filter_id = 0; filter_id < adj.filter_filters.size(); filter_id++)
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

                    TypeSet filter = adj.filter_filters[filter_id];

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

                            if(changed && method_history[adj[v].method.dependent().id])
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

        this->method_inhibited = std::move(method_inhibited);
        this->method_history = std::move(method_history);
        this->typeflow_visited = std::move(typeflow_visited);
        this->allInstantiated = std::move(allInstantiated);
        this->included_in_saturation_uses = std::move(included_in_saturation_uses);
        this->saturation_uses_by_filter = std::move(saturation_uses_by_filter);

        return ResultDiff(std::move(visited_method_log), std::move(typeflow_visited_log), std::move(allInstantiated_log), std::move(included_in_saturation_uses_log), std::move(saturation_uses_by_filter_added_log), std::move(saturation_uses_by_filter_removed_log));
    }

    void revert(const Adjacency& adj, const ResultDiff& changes)
    {
        for(method_id m : changes.visited_method_log)
        {
            method_inhibited[m.id] = false;
            method_history[m.id] = {};
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
            saturation_uses_by_filter[adj[flow].original_filter - adj.filters_begin].push_back(flow);
        }

        for(typeflow_id flow : changes.saturation_uses_by_filter_added_log)
        {
            erase(saturation_uses_by_filter[adj[flow].original_filter - adj.filters_begin], flow);
        }
    }
};

static void assert_reachability_equals(const BFS& r1, const BFS& r2)
{
    if(!(r1.allInstantiated == r2.allInstantiated))
    {
        cerr << "All Idiot!" << endl;
        for(size_t i = 0; i < r1.allInstantiated.size(); i++)
        {
            if(r1.allInstantiated[i] != r2.allInstantiated[i])
            {
                cerr << i << endl;
                exit(1);
            }
        }
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
        if(bool(r1.method_history[i]) != bool(r2.method_history[i]))
        {
            cerr << "Method history differs (mid: " << i << "): " << (uint32_t)r1.method_history[i].dist << " != " << (uint32_t)r2.method_history[i].dist << endl;
            exit(1);
        }
    }
}

struct PurgeTreeNode
{
    span<const method_id> mids;
    span<const PurgeTreeNode> children;
};

class IncrementalBfs
{
    struct BfsIncrementalFrame
    {
        span<const PurgeTreeNode> stillpurge;
        size_t mid_index = 0;
        span<const PurgeTreeNode> depurge;
        BFS::ResultDiff incremental_changes;

        BfsIncrementalFrame(span<const PurgeTreeNode> stillpurge, span<const PurgeTreeNode> depurge, BFS::ResultDiff&& incremental_changes)
                : stillpurge(stillpurge), depurge(depurge), incremental_changes(std::move(incremental_changes))
        { }

        BfsIncrementalFrame(span<const PurgeTreeNode> stillpurge)
                : stillpurge(stillpurge)
        { }
    };

    const Adjacency& adj;
    BFS r;
    // Replaced the former callstack-resident implicit state
    stack<BfsIncrementalFrame> state;

    void do_purge(span<const PurgeTreeNode> stillpurge, span<const PurgeTreeNode> depurge)
    {
        auto& method_visited = r.method_inhibited;
        size_t root_methods_capacity = std::accumulate(depurge.begin(), depurge.end(), size_t(0), [](size_t acc, const auto& node){ return acc + node.mids.size(); });
        method_id root_methods[root_methods_capacity];
        size_t root_methods_size = 0;

        for(const PurgeTreeNode& node : depurge)
        {
            for(method_id mid : node.mids)
            {
                method_visited[mid.id] = false;

                const auto& m = adj[mid];
                if(
                        std::any_of(m.backward_edges.begin(), m.backward_edges.end(), [&](const auto& item)
                        {
                            return (bool)r.method_history[item.id];
                        })
                        ||
                        std::any_of(m.virtual_invocation_sources.begin(), m.virtual_invocation_sources.end(), [&](const auto& item)
                        {
                            return r.typeflow_visited[item.id].any();
                        })
                        )
                {
                    root_methods[root_methods_size++] = mid;
                }
            }
        }

        auto incremental_changes = r.run<false, true>(adj, {root_methods, root_methods + root_methods_size}, false);
        state.emplace(stillpurge, depurge, std::move(incremental_changes));
    };

public:
    IncrementalBfs(const Adjacency& adj, span<const PurgeTreeNode> purges) : adj(adj), r(adj)
    {
        for(const PurgeTreeNode& node : purges)
            for(method_id mid : node.mids)
                r.method_inhibited[mid.id] = true;

        method_id root_method = 0;
        r.run<false>(adj, {&root_method, 1}, true);

        state.emplace(purges);
    }

    const PurgeTreeNode* next()
    {
        while(!state.empty())
        {
            BfsIncrementalFrame& s = state.top();

            if(s.mid_index == 0)
            {
                if(s.stillpurge.size() == 1)
                {
                    s.mid_index = 1;
                    const PurgeTreeNode& node = s.stillpurge.front();

                    if(!s.stillpurge.front().children.empty())
                        state.emplace(s.stillpurge.front().children);

                    return &node;
                }
                else
                {
                    // Divide the purge sets into two of similar sum-size for algorithmic performance reasons
                    size_t n_total_methods = 0;

                    for(const auto node : s.stillpurge)
                        n_total_methods += node.mids.size();

                    for(size_t mid_size = 0; s.mid_index < s.stillpurge.size() && mid_size < n_total_methods / 2; s.mid_index++)
                    {
                        mid_size += s.stillpurge[s.mid_index].mids.size();
                        if(mid_size >= n_total_methods / 2)
                        {
                            if(n_total_methods - mid_size > mid_size - s.stillpurge[s.mid_index].mids.size())
                                s.mid_index++;
                            break;
                        }
                    }

                    do_purge(s.stillpurge.subspan(0, s.mid_index), s.stillpurge.subspan(s.mid_index));
                }
            }
            else if(s.mid_index != s.stillpurge.size())
            {
                auto mid_index = s.mid_index;
                s.mid_index = s.stillpurge.size();
                do_purge(s.stillpurge.subspan(mid_index), s.stillpurge.subspan(0, mid_index));
            }
            else
            {
                r.revert(adj, s.incremental_changes);
                for(const PurgeTreeNode& node : s.depurge)
                    for(method_id mid : node.mids)
                        r.method_inhibited[mid.id] = true;
                state.pop();
            }
        }
        return nullptr;
    }

    [[nodiscard]] const BFS& current_result() const
    {
        return r;
    }
};

static void bfs_incremental(const Adjacency& adj, span<const PurgeTreeNode> methods_to_purge, const function<void(const PurgeTreeNode&, const BFS&)>& callback)
{
    IncrementalBfs ibfs(adj, methods_to_purge);
    while(auto n = ibfs.next())
        callback(*n, ibfs.current_result());
}

#endif //CAUSALITY_GRAPH_ANALYSIS_H
