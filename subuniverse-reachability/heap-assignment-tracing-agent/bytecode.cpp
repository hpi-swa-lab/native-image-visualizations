#include <iostream>
#include <span>
#include <cassert>
#include <iterator>
#include <jni_md.h>

#define BYTEWISE __attribute__((aligned(1), packed))

using u1 = uint8_t;

class BYTEWISE u2
{
    uint16_t backing;

public:
    u2(uint16_t val)
    {
        backing = __builtin_bswap16(val);
    }

    operator uint16_t() const
    {
        return __builtin_bswap16(backing);
    }
};

class BYTEWISE u4
{
    uint32_t backing;

public:
    u4(uint32_t val)
    {
        backing = __builtin_bswap32(val);
    }

    operator uint32_t() const
    {
        return __builtin_bswap32(backing);
    }
};

enum cp_tag : uint8_t
{
    Class = 7,
    Fieldref = 9,
    Methodref = 10,
    InterfaceMethodref = 11,
    String = 8,
    Integer = 3,
    Float = 4,
    Long = 5,
    Double = 6,
    NameAndType = 12,
    Utf8 = 1,
    MethodHandle = 15,
    MethodType = 16,
    InvokeDynamic = 18
};

struct BYTEWISE Class_info
{
    cp_tag tag;
    u2 name_index;
};
static_assert(sizeof(Class_info) == 3);

struct BYTEWISE ref_info
{
    cp_tag tag;
    u2 class_index;
    u2 name_and_type_index;
};

struct BYTEWISE String_info
{
    cp_tag tag;
    u2 string_index;
};

struct BYTEWISE Integer_info
{
    cp_tag tag;
    u4 bytes;
};

struct BYTEWISE Float_info
{
    cp_tag tag;
    u4 bytes;
};

struct BYTEWISE Long_info
{
    cp_tag tag;
    u4 high_bytes;
    u4 low_bytes;
};

struct BYTEWISE Double_info
{
    cp_tag tag;
    u4 high_bytes;
    u4 low_bytes;
};

struct BYTEWISE NameAndType_info
{
    cp_tag tag;
    u2 name_index;
    u2 descriptor_index;
};

struct BYTEWISE Utf8_info
{
    cp_tag tag;
    u2 length;
    u1 bytes[];

    [[nodiscard]] std::span<char> str() const
    {
        return {(char*)bytes, (size_t)length};
    }
};
static_assert(sizeof(Utf8_info) == 3);

struct BYTEWISE MethodHandle_info
{
    cp_tag tag;
    u1 reference_kind;
    u2 reference_index;
};

struct BYTEWISE MethodType_info
{
    cp_tag tag;
    u2 descriptor_index;
};

struct BYTEWISE InvokeDynamic_info
{
    cp_tag tag;
    u2 bootstrap_method_attr_index;
    u2 name_and_type_index;
};

struct BYTEWISE cp_info
{
    cp_tag tag;
    uint8_t info[0];

    [[nodiscard]] size_t len() const
    {
        switch(tag)
        {
            case Class: return sizeof(Class_info);
            case Fieldref:
            case Methodref:
            case InterfaceMethodref:
                return sizeof(ref_info);
            case String:
                return sizeof(String_info);
            case Integer: return sizeof(Integer_info);
            case Float: return sizeof(Float_info);
            case Long: return sizeof(Long_info);
            case Double: return sizeof(Double_info);
            case NameAndType: return sizeof(NameAndType_info);
            case Utf8:
            {
                return ((Utf8_info*)this)->length + sizeof(Utf8_info);
            }


            case MethodHandle: return sizeof(MethodHandle_info);
            case MethodType: return sizeof(MethodType_info);
            case InvokeDynamic: return sizeof(InvokeDynamic_info);
            default:
                assert(false);
                return 0;
        }
    }
};

struct BYTEWISE attribute_info
{
    u2 attribute_name_index;
    u4 attribute_length;
    u1 info[/* attribute_length */];

    size_t len() const
    {
        return sizeof(attribute_info) + attribute_length;
    }
};

class table_iterator_end
{

};

template<typename T>
class table_iterator
{
    T* ptr;
    size_t count;

public:
    table_iterator(T* ptr, size_t count) : ptr(ptr), count(count) {}

    table_iterator& operator++()
    {
        ptr = (T*)((u1*)ptr + ptr->len());
        count--;
        return *this;
    }

    bool operator!=(table_iterator_end e) const
    {
        return count != 0;
    }

    T& operator*()
    {
        return *ptr;
    }

    T* operator->() { return ptr; }
};

template<>
class table_iterator<cp_info>
{
    cp_info* ptr;
    size_t count;
    bool at_long = false;

public:
    table_iterator(cp_info* ptr, size_t count) : ptr(ptr), count(count) {}

    table_iterator& operator++()
    {
        switch(ptr->tag)
        {
            case Long:
            case Double:
            {
                bool was_at_long = at_long;
                at_long = !at_long;
                if(!was_at_long)
                    break;
            }
            default:
                ptr = (cp_info*)((u1*)ptr + ptr->len());
                break;
        }

        count--;
        return *this;
    }

    bool operator!=(table_iterator_end e) const
    {
        return count != 0;
    }

    cp_info& operator*()
    {
        return *ptr;
    }

    cp_info* operator->() { return ptr; }
};

template<typename T>
static T* iterate_to_end(T* begin, size_t count)
{
    table_iterator<T> it{begin, count};
    table_iterator_end e;

    while(it != e)
        ++it;

    return &*it;
}

struct BYTEWISE method_or_field_info
{
    u2             access_flags;
    u2             name_index;
    u2             descriptor_index;
    u2             attributes_count;
    attribute_info attributes[/* attributes_count */];

    size_t len()
    {
        attribute_info* ptr = iterate_to_end(attributes, attributes_count);
        return (uint8_t*)ptr - (uint8_t*)this;
    }
};

struct BYTEWISE ClassFile2;

struct BYTEWISE ClassFile1
{
    u4 magic;
    u2 minor_version;
    u2 major_version;
    u2 constant_pool_count;
    cp_info constant_pool[];

    ClassFile2* continuation()
    {
        return (ClassFile2*) iterate_to_end(constant_pool, constant_pool_count - 1);
    }

    table_iterator<cp_info> begin()
    {
        return {constant_pool, size_t(constant_pool_count) - 1};
    }

    table_iterator_end end()
    {
        return {};
    }
};

struct BYTEWISE ClassFile3;

struct BYTEWISE ClassFile2
{
    u2 access_flags;
    u2 this_class;
    u2 super_class;
    u2 interfaces_count;
    u2 interfaces[];

    ClassFile3* continuation()
    {
        return (ClassFile3*)(&interfaces[interfaces_count]);
    }
};

struct BYTEWISE ClassFile4;

struct BYTEWISE ClassFile3
{
    u2 fields_count;
    method_or_field_info fields[];

    ClassFile4* continuation()
    {
        return (ClassFile4*) iterate_to_end(fields, fields_count);
    }
};

struct BYTEWISE ClassFile4
{
    u2 methods_count;
    method_or_field_info methods[];

    table_iterator<method_or_field_info> begin()
    {
        return {methods, methods_count};
    }

    table_iterator_end end()
    {
        return {};
    }
};


enum OpCode
{
    invokestatic = 184
};



void add_clinit_hook(const unsigned char* src, jint src_len, unsigned char** dst, jint* dst_len)
{
    auto file1 = (ClassFile1*)src;

    //std::cerr << "Constant count: " << file1->constant_pool_count << std::endl;

    auto file2 = file1->continuation();
    auto file3 = file2->continuation();
    auto file4 = file3->continuation();

    for(auto& m : *file4)
    {
        auto cpentry = file1->begin();

        for(size_t i = 0; i < m.name_index - 1; i++)
            ++cpentry;

        assert(cpentry->tag == Utf8);

        auto name = ((Utf8_info&)*cpentry).str();

        if(std::equal(name.begin(), name.end(), "<clinit>"))
        {
            // Found class initializer!

            cpentry = file1->begin();
            for(size_t i = 0; i < file2->this_class - 1; i++)
                ++cpentry;

            assert(cpentry->tag == Class);

            auto class_name_index = ((Class_info&)*cpentry).name_index;

            cpentry = file1->begin();
            for(size_t i = 0; i < class_name_index - 1; i++)
                ++cpentry;

            assert(cpentry->tag == Utf8);

            auto class_name = ((Utf8_info&)*cpentry).str();

            std::cerr << "Found <clinit> of class ";

            std::cerr.write(class_name.data(), class_name.size());
            std::cerr << '\n';

            // TODO: Add to constant pool:
            // Utf8: class_name
            // Utf8: method_name
            // Utf8: method_type
        }
    }
}