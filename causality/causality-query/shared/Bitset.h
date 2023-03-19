#ifndef CAUSALITY_GRAPH_BITSET_H
#define CAUSALITY_GRAPH_BITSET_H

#include <vector>
#include <iostream>
#include <bit>

class Bitset
{
    using block_t = uint64_t;
    static constexpr size_t bits_per_block = sizeof(block_t) * 8;

    std::vector<block_t> blocks;
    size_t len;
    size_t _count;

public:
    Bitset(size_t len) : len(len), blocks((len + (bits_per_block - 1)) / bits_per_block)
    {}

    void fill(std::istream& src)
    {
        src.read((char*)blocks.data(), (len + 7) / 8);

        _count = 0;
        for(block_t block : blocks)
            _count += std::popcount(block);
    }

    bool operator[](size_t i) const
    {
        return (blocks[i / bits_per_block] & (block_t(1) << (i % bits_per_block))) != 0;
    }

    [[nodiscard]] bool is_superset(const Bitset& other) const
    {
        if(other.len != this->len)
            exit(1);

        bool res = true;
        for(size_t i = 0; i < blocks.size(); i++)
        {
            bool block_is_superset = (~blocks[i] & other.blocks[i]) == 0;
            res &= block_is_superset;
            // Not returning eagerly so that the compiler can assume the memory
            // referenced in all future iterations as valid.
        }

        return res;
    }

    [[nodiscard]] size_t count() const
    {
        return _count;
    }

    [[nodiscard]] size_t first() const
    {
        for(size_t i = 0; i < blocks.size(); i++)
            if(blocks[i] != 0)
                return i * bits_per_block + std::countr_zero(blocks[i]);

        return std::numeric_limits<size_t>::max();
    }

    [[nodiscard]] size_t next(size_t pos) const
    {
        size_t pos_rem = ((pos + 1) % bits_per_block);

        if(pos_rem)
        {
            block_t already_started = blocks[pos / bits_per_block];
            already_started >>= pos_rem;

            if(already_started)
                return pos + 1 + std::countr_zero(already_started);
        }

        for(size_t i = pos / bits_per_block + 1; i < blocks.size(); i++)
            if(blocks[i] != 0)
                return i * bits_per_block + std::countr_zero(blocks[i]);

        return std::numeric_limits<size_t>::max();
    }

    size_t size() const
    {
        return len;
    }

    bool operator==(const Bitset& other) const
    {
        // Based on the assumption that the unused leftmost bits are always zero
        return blocks == other.blocks;
    }
};

#endif //CAUSALITY_GRAPH_BITSET_H
