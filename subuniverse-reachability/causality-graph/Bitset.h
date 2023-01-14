#ifndef CAUSALITY_GRAPH_BITSET_H
#define CAUSALITY_GRAPH_BITSET_H

#include <boost/dynamic_bitset.hpp>
#include <vector>
#include <iostream>

class Bitset
{
    boost::dynamic_bitset<> bitset;

    Bitset(boost::dynamic_bitset<>&& bitset) : bitset(std::move(bitset)) {}

public:
    Bitset(size_t len) : bitset(len)
    {

    }

    void fill(std::istream& src)
    {
        size_t len = bitset.size();
        bitset.clear();
        std::vector<boost::dynamic_bitset<>::block_type> data((len + boost::dynamic_bitset<>::bits_per_block - 1) / boost::dynamic_bitset<>::bits_per_block);
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

#endif //CAUSALITY_GRAPH_BITSET_H
