#include <emscripten.h>
#include <iostream>
#include <span>
#include <vector>
#include "Bitset.h"
#include "model.h"
#include "input.h"
#include "analysis.h"


static std::optional<model> purge_model;
static vector<bool> all_methods_visited;

extern "C" void EMSCRIPTEN_KEEPALIVE init(
        const uint8_t* types_data, size_t types_len,
        const uint8_t* methods_data, size_t methods_len,
        const uint8_t* typeflows_data, size_t typeflows_len,
        const uint8_t* typestates_data, size_t typestates_len,
        const uint8_t* interflows_data, size_t interflows_len,
        const uint8_t* direct_invokes_data, size_t direct_invokes_len,
        const uint8_t* typeflow_methods_data, size_t typeflow_methods_len,
        const uint8_t* typeflow_filters_data, size_t typeflow_filters_len,
        const uint8_t* declaring_types_data, size_t declaring_types_len)
{
    model_data data;

    read_lines(data.type_names, types_data, types_len);
    read_lines(data.method_names, methods_data, methods_len);

    read_lines(data.typeflow_names, typeflows_data, typeflows_len);

    read_typestate_bitsets(data.type_names.size(), data.typestates, typestates_data, typestates_len);

    size_t max_typestate_size = 0;

    for(Bitset& typestate : data.typestates)
        max_typestate_size = max(max_typestate_size, typestate.count());

#if !NDEBUG
    cerr << "All instantiated types: " << max_typestate_size << endl;
#endif

    read_buffer(data.interflows, interflows_data, interflows_len);

    read_buffer(data.direct_invokes, direct_invokes_data, direct_invokes_len);

    read_buffer(data.containing_methods, typeflow_methods_data, typeflow_methods_len);

    read_buffer(data.typeflow_filters, typeflow_filters_data, typeflow_filters_len);

    read_buffer(data.declaring_types, declaring_types_data, declaring_types_len);

    purge_model.emplace(std::move(data));

    cerr << "Running DFS on original graph...";

    BFS all(purge_model->adj);
    cerr << " " << std::count_if(all.method_visited.begin(), all.method_visited.end(), [](bool b) { return b; }) << " methods reachable!\n";

    all_methods_visited = all.method_visited;
}

extern "C" char* EMSCRIPTEN_KEEPALIVE simulate_purge(const char* methods)
{
    if(!purge_model)
        return nullptr;

    auto& m = *purge_model;

    vector<method_id> purged_mids;

    {
        stringstream methods_stream(methods);
        string method_name;

        while(std::getline(methods_stream, method_name, '\n'))
        {
            auto it = m.method_ids_by_name.find(method_name);

            if(it == m.method_ids_by_name.end())
                return nullptr;

            purged_mids.push_back(it->second);
        }
    }

    if(purged_mids.empty())
        return nullptr;

    cerr << "Running DFS on purged graph...";

    BFS after_purge(m.adj, purged_mids);

    cerr << " " << std::count_if(after_purge.method_visited.begin(), after_purge.method_visited.end(), [](bool b) { return b; }) << " methods reachable!\n";

    stringstream output;

    for(size_t i = 1; i < all_methods_visited.size(); i++)
    {
        if(all_methods_visited[i] && !after_purge.method_visited[i])
            output << m.method_names[i] << endl;
    }

    string s(output.str());
    char* res = new char[s.size() + 1];
    copy(s.begin(), s.end(), res);
    res[s.size()] = 0;
    return res;
}