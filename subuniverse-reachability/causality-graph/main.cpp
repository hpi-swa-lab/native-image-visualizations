#include <iostream>
#include <vector>
#include <fstream>
#include <cassert>
#include <unordered_set>
#include <numeric>
#include <queue>
#include <unordered_map>
#include <cstring>
#include <boost/dynamic_bitset.hpp>
#include <ranges>
#include <span>
#include <thread>

using namespace std;

static void read_lines(vector<string>& dst, const char* path)
{
    ifstream in(path);

    do
    {
        dst.resize(dst.size() + 1);
    }
    while(getline(in, dst.back()));

    dst.pop_back();
}

class Bitset
{
    boost::dynamic_bitset<> bitset;

    Bitset(boost::dynamic_bitset<>&& bitset) : bitset(std::move(bitset)) {}

public:
    Bitset(size_t len) : bitset(len)
    {

    }

    //explicit Bitset(const Bitset& b) : bitset(b.bitset) {}

    void fill(ifstream& src)
    {
        size_t len = bitset.size();
        bitset.clear();
        vector<boost::dynamic_bitset<>::block_type> data((len + boost::dynamic_bitset<>::bits_per_block - 1) / boost::dynamic_bitset<>::bits_per_block);
        src.read((char*)data.data(), (len + 7) / 8);
        bitset.init_from_block_range(data.begin(), data.end());
        bitset.resize(len);
    }

    void fill(bool val)
    {
        if(val)
            bitset.set();
        else
            bitset.reset();
    }

    bool operator[](size_t i) const
    {
        return bitset[i];
    }

    void operator|=(const Bitset& other)
    {
        bitset |= other.bitset;
    }

    void operator&=(const Bitset& other)
    {
        bitset &= other.bitset;
    }

    [[nodiscard]] bool is_superset(const Bitset& other) const
    {
        return other.bitset.is_subset_of(bitset);
    }

    [[nodiscard]] bool are_disjoint(const Bitset& other) const
    {
        return !bitset.intersects(other.bitset);
    }

    Bitset operator&(const Bitset& other) const
    {
        return bitset & other.bitset;
    }

    [[nodiscard]] bool any() const
    {
        return bitset.any();
    }

    Bitset operator~() const
    {
        return ~bitset;
    }

    [[nodiscard]] size_t count() const
    {
        return bitset.count();
    }

    [[nodiscard]] size_t first() const
    {
        return bitset.find_first();
    }

    [[nodiscard]] size_t next(size_t pos) const
    {
        return bitset.find_next(pos);
    }

    auto operator[](size_t i)
    {
        return bitset[i];
    }

    size_t size() const
    {
        return bitset.size();
    }
};

static void read_typestate_bitsets(size_t num_types, vector<Bitset>& typestates, const char* path)
{
    size_t bitset_len = (num_types + 7) / 8;
    ifstream in(path);

    in.seekg(0, ifstream::end);
    size_t inlen = in.tellg();
    in.seekg(0);

    size_t n = inlen / bitset_len;
    assert((inlen % bitset_len) == 0);
    typestates.reserve(n);

    for(size_t i = 0; i < n; i++)
    {
        typestates.emplace_back(num_types);
        typestates.back().fill(in);
    }
}

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




template<typename T>
static void read_buffer(vector<T>& dst, const char* path)
{
    ifstream in(path);
    in.seekg(0, ifstream::end);
    streampos len = in.tellg();
    in.seekg(0);

    assert((len % sizeof(T)) == 0);

    size_t prev_size = dst.size();
    dst.resize(prev_size +  len / sizeof(T));
    in.read((char*)&dst[prev_size], len);
}

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

struct __attribute__((aligned(64))) TypeflowHistory
{
    uint16_t types[20];
    uint8_t dists[20];
    uint8_t saturated_dist = numeric_limits<uint8_t>::max();

public:
    TypeflowHistory()
    {
        fill(types, types + 20, numeric_limits<uint16_t>::max());
        fill(dists, dists + 20, numeric_limits<uint8_t>::max());
    }

    bool add_type(uint16_t type, uint8_t dist)
    {
        for(size_t i = 0; i < 20; i++)
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
            return pos == 20 || parent->types[pos] == numeric_limits<uint16_t>::max();
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

    vector<method_id> methods_sorted_by_cutvalue(adj.n_methods());
    for(size_t i = 0; i < adj.n_methods(); i++)
        methods_sorted_by_cutvalue[i] = i;

    std::sort(methods_sorted_by_cutvalue.begin(), methods_sorted_by_cutvalue.end(), [&](method_id a, method_id b) { return purge_matrix[a.id].count() > purge_matrix[b.id].count(); });

    vector<vector<method_id>> purge_adj(adj.n_methods());

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
                remaining &=~ purge_matrix[m.id];
                cout << method_names[m.id] << ", ";
            }
        }

        cout << '\n';
    }
}

static void bruteforce_purges_classes__worker_method(const Adjacency& adj, const vector<string>& type_names, const vector<vector<method_id>>& reasons_contained_in_types, size_t n_reachable, atomic<size_t>* purged)
{
    size_t purged_type;
    while((purged_type = (*purged)++) < adj.n_types())
    {
        if(reasons_contained_in_types[purged_type].empty() || !type_names[purged_type].starts_with("io.micronaut."))
            continue;

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

    thread workers[8];
    atomic<size_t> purged = 0;

    for(thread& worker : workers)
    {
        worker = thread(bruteforce_purges_classes__worker_method, adj, type_names, reasons_contained_in_types, n_reachable, &purged);
    }

    for(thread& worker : workers)
    {
        worker.join();
    }
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
                    for(method_id containing_method : views::reverse(methods))
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

__attribute__((optimize("O0"))) static void print_reachability(const Adjacency& adj, const vector<string>& method_names, const unordered_map<string, uint32_t>& method_ids_by_name, const vector<string>& type_names)
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
    vector<string> type_names;
    read_lines(type_names, "types.txt");

    vector<string> method_names(1);
    read_lines(method_names, "methods.txt");

    unordered_map<string, uint32_t> method_ids_by_name;

    {
        size_t i = 0;
        for(const auto &name: method_names)
            method_ids_by_name[name] = i++;
    }

    vector<string> typeflow_names(1);
    read_lines(typeflow_names, "typeflows.txt");

    vector<Bitset> typestates;
    read_typestate_bitsets(type_names.size(), typestates, "typestates.bin");

    size_t max_typestate_size = 0;

    for(Bitset& typestate : typestates)
        max_typestate_size = max(max_typestate_size, typestate.count());

#if !NDEBUG
    cerr << "All instantiated types: " << max_typestate_size << endl;
#endif

    vector<Edge<typeflow_id>> interflows;
    read_buffer(interflows, "interflows.bin");

    vector<Edge<method_id>> direct_invokes;
    read_buffer(direct_invokes, "direct_invokes.bin");

    vector<ContainingMethod> typeflow_methods(1);
    read_buffer(typeflow_methods, "typeflow_methods.bin");

    vector<uint32_t> typeflow_filters(1);
    read_buffer(typeflow_filters, "typeflow_filters.bin");

    vector<uint32_t> declaring_types(1);
    read_buffer(declaring_types, "declaring_types.bin");

    Adjacency adj(type_names.size(), method_names.size(), typeflow_names.size(), interflows, direct_invokes, typestates, typeflow_filters, std::move(typeflow_methods), typeflow_names);

    remove_redundant(adj);

    if(argc < 2)
    {
        cerr << "Usage: " << argv[0] << " <command>" << endl;
        return 1;
    }

    string_view command = argv[1];

    if(command == "reachability")
    {
        print_reachability(adj, method_names, method_ids_by_name, type_names);
    }
    else if(command == "bruteforce_purges")
    {
        bruteforce_purges(adj, method_names);
    }
    else if(command == "bruteforce_purges_classes")
    {
        bruteforce_purges_classes(adj, type_names, declaring_types);
    }
    else
    {
        simulate_purge(adj, method_names, method_ids_by_name, command);
    }
}
