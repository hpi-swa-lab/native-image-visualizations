#ifndef CAUSALITY_GRAPH_INPUT_H
#define CAUSALITY_GRAPH_INPUT_H

#include <iostream>
#include <vector>
#include <fstream>
#include <cassert>
#include <unordered_set>
#include <numeric>
#include <queue>
#include <unordered_map>
#include <cstring>
#include <ranges>
#include <span>
#include <filesystem>
#include "Bitset.h"

using namespace std;

struct wrap_vector_as_istream : std::streambuf
{
    wrap_vector_as_istream(span<const uint8_t> data)
    {
        this->setg((char*)&data[0], (char*)&data[0], (char*)&data[data.size()]);
    }
};

static void read_lines(vector<string>& dst, istream& in)
{
    do
    {
        dst.resize(dst.size() + 1);
    }
    while(getline(in, dst.back()));

    dst.pop_back();
}

static void read_lines(vector<string>& dst, const char* path)
{
    ifstream in(path);
    read_lines(dst, in);
}

static void read_lines(vector<string>& dst, const uint8_t* data, size_t len)
{
    wrap_vector_as_istream databuf(span<const uint8_t>(data, len));
    std::istream in(&databuf);
    read_lines(dst, in);
}

static void read_typestate_bitsets(size_t num_types, vector<Bitset>& typestates, istream& in, size_t inlen)
{
    size_t bitset_len = (num_types + 7) / 8;
    size_t n = inlen / bitset_len;
    assert((inlen % bitset_len) == 0);
    typestates.reserve(n);

    for(size_t i = 0; i < n; i++)
    {
        typestates.emplace_back(num_types);
        typestates.back().fill(in);
    }
}

static void read_typestate_bitsets(size_t num_types, vector<Bitset>& typestates, const char* path)
{
    ifstream in(path);
    in.seekg(0, ifstream::end);
    size_t inlen = in.tellg();
    in.seekg(0);
    read_typestate_bitsets(num_types, typestates, in, inlen);
}

static void read_typestate_bitsets(size_t num_types, vector<Bitset>& typestates, const uint8_t* data, size_t len)
{
    wrap_vector_as_istream databuf(span<const uint8_t>(data, len));
    std::istream in(&databuf);
    read_typestate_bitsets(num_types, typestates, in, len);
}



template<typename T>
static void read_buffer(vector<T>& dst, istream& in, size_t len)
{
    assert((len % sizeof(T)) == 0);

    size_t prev_size = dst.size();
    dst.resize(prev_size +  len / sizeof(T));
    in.read((char*)&dst[prev_size], len);
}

template<typename T>
static void read_buffer(vector<T>& dst, const char* path)
{
    ifstream in(path);
    in.seekg(0, ifstream::end);
    streampos len = in.tellg();
    in.seekg(0);
    read_buffer(dst, in, len);
}

template<typename T>
static void read_buffer(vector<T>& dst, const uint8_t* data, size_t len)
{
    wrap_vector_as_istream databuf(span<const uint8_t>(data, len));
    std::istream in(&databuf);
    read_buffer(dst, in, len);
}

#endif //CAUSALITY_GRAPH_INPUT_H
