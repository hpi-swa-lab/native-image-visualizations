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

struct TypestateEdge
{
    uint32_t src;
    uint32_t dst;
    uint32_t typestate_id;
};

static_assert(sizeof(TypestateEdge) == 12);
static_assert(offsetof(TypestateEdge, src) == 0);
static_assert(offsetof(TypestateEdge, dst) == 4);
static_assert(offsetof(TypestateEdge, typestate_id) == 8);

struct Edge
{
    uint32_t src;
    uint32_t dst;
};

static_assert(sizeof(Edge) == 8);
static_assert(offsetof(Edge, src) == 0);
static_assert(offsetof(Edge, dst) == 4);

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
    uint32_t dst;
    const Bitset* filter;

    explicit TypestateArc(uint32_t dst, const Bitset* filter) : dst(dst), filter(filter)
    {
        assert(filter);
    }
};

struct Adjacency
{
    size_t _n_types;
    vector<vector<TypestateArc>> neighbour_flows;
    vector<vector<TypestateArc>> neighbour_flows_backwards;
    vector<vector<TypestateArc>> neighbour_methods;
    vector<vector<uint32_t>> direct_methods;
    vector<vector<uint32_t>> typeflows_by_method;
    vector<uint32_t> typeflow_methods;

    Adjacency(size_t n_types, size_t n_methods, size_t n_typeflows, const vector<TypestateEdge>& interflows, const vector<TypestateEdge>& virtual_invokes, const vector<Edge>& direct_invokes, const vector<Bitset>& typestates, vector<uint32_t>&& typeflow_methods)
            : _n_types(n_types), neighbour_flows(n_typeflows), neighbour_flows_backwards(n_typeflows), neighbour_methods(n_typeflows), direct_methods(n_methods), typeflows_by_method(n_methods), typeflow_methods(std::move(typeflow_methods))
    {
        for(auto e : interflows)
        {
            neighbour_flows.at(e.src).push_back(TypestateArc(e.dst, &typestates.at(e.typestate_id)));
            neighbour_flows_backwards.at(e.dst).push_back(TypestateArc(e.src, &typestates.at(e.typestate_id)));
        }
        for(auto e : virtual_invokes)
            neighbour_methods.at(e.src).push_back(TypestateArc(e.dst, &typestates.at(e.typestate_id)));
        for(auto e : direct_invokes)
            direct_methods.at(e.src).push_back(e.dst);
        for(size_t flow = 0; flow < this->typeflow_methods.size(); flow++)
            typeflows_by_method.at(this->typeflow_methods[flow]).push_back(flow);
    }

    [[nodiscard]] size_t n_typeflows() const { return neighbour_flows.size(); }

    [[nodiscard]] size_t n_methods() const { return direct_methods.size(); }

    [[nodiscard]] size_t n_types() const { return _n_types; }

    void purge_method(uint32_t mid)
    {
        for(auto& targets : direct_methods)
        {
            erase(targets, mid);
        }

        for(auto& edges : neighbour_methods)
        {
            erase_if(edges, [mid](TypestateArc& arc) { return arc.dst == mid; });
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

    vector<uint32_t> method_worklist(1, 0);
    vector<uint32_t> next_method_worklist;
    queue<uint32_t> typeflow_worklist{{0}};

    while(true)
    {
        while(!typeflow_worklist.empty())
        {
            uint32_t u = typeflow_worklist.front();
            typeflow_worklist.pop();

            for(auto [ v, filter] : adj.neighbour_flows.at(u))
            {
                Bitset transfer = typeflow_visited.at(u) & *filter;

                if(!typeflow_visited.at(v).is_superset(transfer))
                {
                    typeflow_visited.at(v) |= transfer;

                    if(method_visited[adj.typeflow_methods.at(v)])
                        typeflow_worklist.push(v);
                }
            }

            for(auto [ v, filter ] : adj.neighbour_methods.at(u))
            {
                if(!method_visited.at(v) && !typeflow_visited.at(u).are_disjoint(*filter))
                {
                    method_visited.at(v) = true;
                    next_method_worklist.push_back(v);
                }
            }
        }

        if(method_worklist.empty())
            break;

        for(uint32_t u : method_worklist)
        {

            for(auto v : adj.typeflows_by_method.at(u))
                if(typeflow_visited.at(v).any())
                    typeflow_worklist.push(v);

            for(auto v : adj.direct_methods.at(u))
            {
                if(!method_visited.at(v))
                {
                    method_visited.at(v) = true;
                    next_method_worklist.push_back(v);
                }
            }
        }

        method_worklist.clear();
        swap(method_worklist, next_method_worklist);
    }

    //cerr << "Typeflow iterations needed: " << typeflow_iterations << endl;
    //cerr << "Bits transferred/Typeflow transfers: " << transfer_bit_count << "/" << typeflow_transfers << "=" << ((double)transfer_bit_count / typeflow_transfers) << endl;

    return method_visited;
}

static void check_basic_integrity(vector<string>& method_names, vector<string>& typeflow_names, vector<TypestateEdge>& interflows, vector<Edge>& direct_invokes)
{
    unordered_set<uint32_t> root_methods;

    for(Edge call : direct_invokes)
        if(call.src == 0)
            root_methods.insert(call.dst);

    for(uint32_t mid : root_methods)
    {
        assert(!method_names.at(mid).empty());
        cout << method_names.at(mid) << endl;
    }

    unordered_set<uint32_t> root_typeflows;

    for(auto flowEdge : interflows)
        if(flowEdge.src == 0)
            root_typeflows.insert(flowEdge.dst);

    for(uint32_t fid : root_typeflows)
    {
        assert(!typeflow_names.at(fid).empty());
    }
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

static bool is_redundant(Adjacency& adj, uint32_t typeflow)
{
    if(adj.neighbour_flows_backwards[typeflow].empty())
        return true;

    if(adj.neighbour_flows[typeflow].empty() && adj.neighbour_methods[typeflow].empty())
        return true;

    if(adj.neighbour_methods[typeflow].empty())
    {
        if(adj.neighbour_flows[typeflow].size() == 1 && adj.neighbour_flows_backwards[typeflow].size() == 1)
        {
            uint32_t M1 = adj.typeflow_methods[adj.neighbour_flows_backwards[typeflow][0].dst];
            uint32_t M2 = adj.typeflow_methods[typeflow];
            uint32_t M3 = adj.typeflow_methods[adj.neighbour_flows[typeflow][0].dst];

            if(M2 == M1 || M2 == M3 || M2 == 0)
                return true;
        }

        if(adj.neighbour_flows_backwards[typeflow].size() == 1 && adj.neighbour_flows[typeflow].size() > 1)
        {
            uint32_t M1 = adj.typeflow_methods[adj.neighbour_flows_backwards[typeflow][0].dst];
            uint32_t M2 = adj.typeflow_methods[typeflow];

            if(M2 == M1 || M2 == 0)
                return true;

            for(auto& e : adj.neighbour_flows[typeflow])
            {
                if(adj.typeflow_methods[e.dst] != M2)
                    return false;
            }

            return true;
        }

        if(adj.neighbour_flows[typeflow].size() == 1 && adj.neighbour_flows_backwards[typeflow].size() > 1)
        {
            uint32_t M2 = adj.typeflow_methods[typeflow];
            uint32_t M3 = adj.typeflow_methods[adj.neighbour_flows[typeflow][0].dst];

            if(M2 == M3 || M2 == 0)
                return true;

            for(auto& e : adj.neighbour_flows_backwards[typeflow])
            {
                if(adj.typeflow_methods[e.dst] != M2)
                    return false;
            }

            return true;
        }
    }

    return false;
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
        if(all_methods_reachable[i] && !methods_reachable[i])
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

    vector<TypestateEdge> interflows;
    read_buffer(interflows, "interflows.bin");

    vector<TypestateEdge> virtual_invokes;
    read_buffer(virtual_invokes, "virtual_invokes.bin");

    vector<Edge> direct_invokes;
    read_buffer(direct_invokes, "direct_invokes.bin");

    vector<uint32_t> typeflow_methods(1);
    read_buffer(typeflow_methods, "typeflow_methods.bin");


    Adjacency adj(type_names.size(), method_names.size(), typeflow_names.size(), interflows, virtual_invokes, direct_invokes, typestates, std::move(typeflow_methods));

    if(true)
    {
        boost::dynamic_bitset<> redundant_typeflows(adj.n_typeflows());

        size_t useless_iterations = 0;

        for(uint32_t typeflow = 1; typeflow < adj.n_typeflows(); typeflow = typeflow == adj.n_typeflows() - 1 ? 1 : typeflow + 1)
        {
            if(!redundant_typeflows[typeflow] && is_redundant(adj, typeflow))
            {
                redundant_typeflows[typeflow] = true;

                for(auto& e : adj.neighbour_flows[typeflow])
                {
                    uint32_t dst = e.dst;
                    erase_if(adj.neighbour_flows_backwards[dst], [typeflow](auto& e2) { return e2.dst == typeflow; });
                }

                for(auto& e : adj.neighbour_flows_backwards[typeflow])
                {
                    uint32_t src = e.dst;
                    erase_if(adj.neighbour_flows[src], [typeflow](auto& e2) { return e2.dst == typeflow; });

                    for(auto& e_forward : adj.neighbour_flows[typeflow])
                    {
                        Bitset* newFilter = new Bitset(*e_forward.filter);
                        *newFilter &= *e.filter;

                        adj.neighbour_flows[src].push_back(TypestateArc(e_forward.dst, newFilter));
                        adj.neighbour_flows_backwards[e_forward.dst].push_back(TypestateArc(src, newFilter));
                    }
                }

                adj.neighbour_flows[typeflow].clear();
                adj.neighbour_flows_backwards[typeflow].clear();

                useless_iterations = 0;
            }
            else
            {
                useless_iterations++;
            }

            if(useless_iterations > adj.n_typeflows())
                break;
        }

        cerr << "Redundant typeflows: " << redundant_typeflows.count() << "/" << (adj.n_typeflows() - 1) << "=" << ((float) redundant_typeflows.count() / (adj.n_typeflows() - 1)) << endl;
    }


    print_reachability(adj, method_names, method_ids_by_name);
}
