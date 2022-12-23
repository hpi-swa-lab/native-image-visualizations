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

#define PRINT_ALL 1
#define PRINT_PURGED 1

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
    explicit Bitset(size_t len) : bitset(len)
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
};

struct typeflow_id
{
    uint32_t id;

    typeflow_id(uint32_t id) : id(id) {}
    typeflow_id() = default;
    explicit operator uint32_t() const { return id; }
    bool operator==(typeflow_id other) const { return id == other.id; }
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

struct TypestateArc
{
    method_id dst;
    const Bitset* filter;

    explicit TypestateArc(method_id dst, const Bitset* filter) : dst(dst), filter(filter)
    {
        assert(filter);
    }
};

struct Adjacency
{
    struct TypeflowInfo
    {
        vector<typeflow_id> forward_edges;
        vector<typeflow_id> backward_edges;
        vector<TypestateArc> neighbour_methods;
        const Bitset* filter;
        method_id method;
    };

    struct MethodInfo
    {
        vector<method_id> direct_calls;
        vector<typeflow_id> contained_typeflows;
    };

    size_t _n_types;
    vector<TypeflowInfo> flows;
    vector<MethodInfo> methods;

    Adjacency(size_t n_types, size_t n_methods, size_t n_typeflows, const vector<Edge<typeflow_id>>& interflows, const vector<TypestateEdge>& virtual_invokes, const vector<Edge<method_id>>& direct_invokes, const vector<Bitset>& typestates, const vector<uint32_t>& typeflow_filters, const vector<uint32_t>& typeflow_methods)
            : _n_types(n_types), flows(n_typeflows), methods(n_methods)
    {
        for(auto e : interflows)
        {
            assert(e.src != e.dst);
            flows[e.src.id].forward_edges.push_back(e.dst);
            flows[e.dst.id].backward_edges.push_back(e.src);
        }
        for(auto e : virtual_invokes)
            flows[e.src.id].neighbour_methods.emplace_back(e.dst, &typestates.at(e.typestate_id));
        for(auto e : direct_invokes)
            methods[e.src.id].direct_calls.push_back(e.dst);
        for(size_t flow = 0; flow < typeflow_methods.size(); flow++)
        {
            flows[flow].method = typeflow_methods[flow];
            methods[typeflow_methods[flow]].contained_typeflows.push_back(flow);
        }

        for(size_t i = 0; i < typeflow_filters.size(); i++)
            flows[i].filter = &typestates.at(typeflow_filters[i]);
    }

    [[nodiscard]] size_t n_typeflows() const { return flows.size(); }

    [[nodiscard]] size_t n_methods() const { return methods.size(); }

    [[nodiscard]] size_t n_types() const { return _n_types; }

    [[nodiscard]] MethodInfo& operator[](method_id id) { return methods[(uint32_t)id]; }
    [[nodiscard]] const MethodInfo& operator[](method_id id) const { return methods[(uint32_t)id]; }

    [[nodiscard]] TypeflowInfo& operator[](typeflow_id id) { return flows[(uint32_t)id]; }
    [[nodiscard]] const TypeflowInfo& operator[](typeflow_id id) const { return flows[(uint32_t)id]; }

    void purge_method(method_id mid)
    {
        for(auto& m : methods)
        {
            erase(m.direct_calls, mid);
        }

        for(auto& f : flows)
        {
            erase_if(f.neighbour_methods, [mid](TypestateArc& arc) { return arc.dst == mid; });
        }
    }
};

static vector<bool> bfs(const Adjacency& adj)
{
    vector<bool> method_visited(adj.n_methods());

    vector<Bitset> typeflow_visited;
    typeflow_visited.reserve(adj.n_typeflows());
    for(size_t i = 0; i < adj.n_typeflows(); i++)
        typeflow_visited.emplace_back(adj.n_types());

    method_visited[0] = true;
    typeflow_visited[0].fill(true);

    vector<method_id> method_worklist(1, 0);
    vector<method_id> next_method_worklist;
    queue<typeflow_id> typeflow_worklist{{0}};

    uint64_t n_worklist_added = 0;

    while(true)
    {
        while(!typeflow_worklist.empty())
        {
            typeflow_id u = typeflow_worklist.front();
            typeflow_worklist.pop();
            n_worklist_added++;

            for(auto v : adj[u].forward_edges)
            {
                Bitset transfer = typeflow_visited[u.id] & *adj[v].filter;

                if(!typeflow_visited[v.id].is_superset(transfer))
                {
                    typeflow_visited[v.id] |= transfer;

                    if(method_visited[adj[v].method.id])
                        typeflow_worklist.push(v);
                }
            }

            for(auto [ v, filter ] : adj[u].neighbour_methods)
            {
                if(!method_visited[v.id] && !typeflow_visited[u.id].are_disjoint(*filter))
                {
                    method_visited[v.id] = true;
                    next_method_worklist.push_back(v);
                }
            }
        }

        if(method_worklist.empty())
            break;

        n_worklist_added += method_worklist.size();

        for(method_id u : method_worklist)
        {
            const auto& m = adj[u];

            for(auto v : m.contained_typeflows)
                if(typeflow_visited[v.id].any())
                    typeflow_worklist.push(v);

            for(auto v : m.direct_calls)
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

    //cerr << "Typeflow iterations needed: " << typeflow_iterations << endl;
    //cerr << "Bits transferred/Typeflow transfers: " << transfer_bit_count << "/" << typeflow_transfers << "=" << ((double)transfer_bit_count / typeflow_transfers) << endl;

    cerr << "n_worklist_added(" << n_worklist_added << ')';

    return method_visited;
}

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

    if(f.forward_edges.empty() && f.neighbour_methods.empty())
        return true;

    if(f.neighbour_methods.empty())
    {
        if(f.forward_edges.size() == 1 && f.backward_edges.size() == 1)
        {
            method_id M1 = adj[f.backward_edges[0]].method;
            method_id M2 = f.method;
            method_id M3 = adj[f.forward_edges[0]].method;

            if((M2 == M1 || M2 == M3 || M2 == 0)
            && f.filter->is_superset(*adj[f.forward_edges[0]].filter))
                return true;
        }

        if(f.forward_edges.size() > 1 && f.backward_edges.size() == 1)
        {
            method_id M1 = adj[f.backward_edges[0]].method;
            method_id M2 = f.method;

            for(auto& next : f.forward_edges)
            {
                if(!f.filter->is_superset(*adj[next].filter))
                    return false;
            }

            if(M2 == M1 || M2 == 0)
                return true;

            return std::all_of(f.forward_edges.begin(), f.forward_edges.end(), [&](typeflow_id next) { return adj[next].method == M2; });
        }

        if(f.forward_edges.size() == 1 && f.backward_edges.size() > 1)
        {
            method_id M2 = f.method;
            method_id M3 = adj[f.forward_edges[0]].method;

            if(!f.filter->is_superset(*adj[f.forward_edges[0]].filter))
                return false;

            if(M2 == M3 || M2 == 0)
                return true;

            return std::all_of(f.backward_edges.begin(), f.backward_edges.end(), [&](typeflow_id next) { return adj[next].method == M2; });
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

    cerr << "Redundant typeflows: " << redundant_typeflows.count() << "/" << (adj.n_typeflows() - 1) << "=" << ((float) redundant_typeflows.count() / (adj.n_typeflows() - 1)) << endl;
}

static void simulate_purge(Adjacency& adj, const vector<string>& method_names, const unordered_map<string, uint32_t>& method_ids_by_name)
{
    vector<uint32_t> purged_mids;

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

    auto all_methods_reachable = bfs(adj);

    cerr << " " << std::count_if(all_methods_reachable.begin(), all_methods_reachable.end(), [](bool b) { return b; }) << " methods reachable!\n";

    cerr << "Running DFS on purged graph...";

    for(uint32_t mid : purged_mids)
    {
        adj.purge_method(mid);
    }

    auto methods_reachable = bfs(adj);

    cerr << " " << std::count_if(methods_reachable.begin(), methods_reachable.end(), [](bool b) { return b; }) << " methods reachable!\n";

    for(size_t i = 1; i < methods_reachable.size(); i++)
    {
#if PRINT_PURGED
        if(all_methods_reachable[i] && !methods_reachable[i])
#else
        if(methods_reachable[i])
#endif
            cout << method_names[i] << endl;
    }
}

static void print_reachability(Adjacency& adj, const vector<string>& method_names, const unordered_map<string, uint32_t>& method_ids_by_name)
{
    cerr << "Running DFS on original graph...";

    auto all_methods_reachable = bfs(adj);

    cerr << " " << std::count_if(all_methods_reachable.begin(), all_methods_reachable.end(), [](bool b) { return b; }) << " methods reachable!\n";

    string name;

    while(!cin.eof())
    {
        getline(cin, name);

        if(name.length() == 0)
            break;

        auto it = method_ids_by_name.find(name);

        if(it == method_ids_by_name.end())
        {
            cerr << "Method " << name << " doesn't exist!" << endl;
            continue;
        }

        uint32_t mid = it->second;

        cout << (all_methods_reachable[mid] ? "True" : "False") << endl;
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

    cerr << "All instantiated types: " << max_typestate_size << endl;

    vector<Edge<typeflow_id>> interflows;
    read_buffer(interflows, "interflows.bin");

    vector<TypestateEdge> virtual_invokes;
    read_buffer(virtual_invokes, "virtual_invokes.bin");

    vector<Edge<method_id>> direct_invokes;
    read_buffer(direct_invokes, "direct_invokes.bin");

    vector<uint32_t> typeflow_methods(1);
    read_buffer(typeflow_methods, "typeflow_methods.bin");

    vector<uint32_t> typeflow_filters(1);
    read_buffer(typeflow_filters, "typeflow_filters.bin");

    Adjacency adj(type_names.size(), method_names.size(), typeflow_names.size(), interflows, virtual_invokes, direct_invokes, typestates, typeflow_filters, std::move(typeflow_methods));

    remove_redundant(adj);

#if REACHABILITY
    print_reachability
#else
    simulate_purge
#endif
    (adj, method_names, method_ids_by_name);
}
