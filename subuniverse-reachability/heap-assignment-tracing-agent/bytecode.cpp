#include <iostream>
#include <span>
#include <cassert>
#include <iterator>
#include <jni_md.h>
#include <jvmti.h>
#include <concepts>
#include <limits>

#define BYTEWISE __attribute__((aligned(1), packed))

using u1 = uint8_t;

class BYTEWISE u2
{
    uint16_t backing;

public:
    u2() = default;

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
    u4() = default;

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

struct BYTEWISE cp_info
{
    cp_tag tag;

    explicit cp_info(cp_tag tag) : tag(tag) {}

    [[nodiscard]] size_t len() const;
};

struct BYTEWISE Class_info : public cp_info
{
    u2 name_index;

    explicit Class_info(size_t name_index) : cp_info(Class), name_index(name_index) {}
};
static_assert(sizeof(Class_info) == 3);

struct BYTEWISE ref_info : public cp_info
{
    u2 class_index;
    u2 name_and_type_index;

    ref_info(cp_tag tag, size_t class_index, size_t name_and_type_index) : cp_info(tag), class_index(class_index), name_and_type_index(name_and_type_index)
    {}
};

struct BYTEWISE String_info : public cp_info
{
    u2 string_index;
};

struct BYTEWISE Integer_info : public cp_info
{
    u4 bytes;
};

struct BYTEWISE Float_info : public cp_info
{
    u4 bytes;
};

struct BYTEWISE Long_info : public cp_info
{
    u4 high_bytes;
    u4 low_bytes;
};

struct BYTEWISE Double_info : public cp_info
{
    u4 high_bytes;
    u4 low_bytes;
};

struct BYTEWISE NameAndType_info : public cp_info
{
    u2 name_index;
    u2 descriptor_index;

    explicit NameAndType_info(size_t name_index, size_t descriptor_index) : cp_info(NameAndType), name_index(name_index), descriptor_index(descriptor_index)
    { }
};

struct BYTEWISE Utf8_info : public cp_info
{
    u2 length;
    u1 bytes[];

    explicit Utf8_info(const char* str) : cp_info(Utf8)
    {
        write(str);
    }

    [[nodiscard]] std::span<char> str() const
    {
        return {(char*)bytes, (size_t)length};
    }

    void write(const char* str)
    {
        size_t i;
        for(i = 0; str[i]; i++)
            bytes[i] = str[i];
        length = i;
    }

    size_t len()
    {
        return sizeof(Utf8_info) + length;
    }
};
static_assert(sizeof(Utf8_info) == 3);

struct BYTEWISE MethodHandle_info : public cp_info
{
    u1 reference_kind;
    u2 reference_index;
};

struct BYTEWISE MethodType_info : public cp_info
{
    u2 descriptor_index;
};

struct BYTEWISE InvokeDynamic_info : public cp_info
{
    u2 bootstrap_method_attr_index;
    u2 name_and_type_index;
};

size_t cp_info::len() const
{
    switch(tag)
    {
        case Class: return sizeof(Class_info);
        case Fieldref:
        case Methodref:
        case InterfaceMethodref:
            return sizeof(ref_info);
        case String: return sizeof(String_info);
        case Integer: return sizeof(Integer_info);
        case Float: return sizeof(Float_info);
        case Long: return sizeof(Long_info);
        case Double: return sizeof(Double_info);
        case NameAndType: return sizeof(NameAndType_info);
        case Utf8: return ((Utf8_info*)this)->len();
        case MethodHandle: return sizeof(MethodHandle_info);
        case MethodType: return sizeof(MethodType_info);
        case InvokeDynamic: return sizeof(InvokeDynamic_info);
        default:
            assert(false);
    }
}






// --- Attributes ---

struct BYTEWISE attribute_info
{
    u2 attribute_name_index;
    u4 attribute_length;

    size_t len() const
    {
        return sizeof(attribute_info) + attribute_length;
    }
};

struct BYTEWISE Code_attribute_1 : public attribute_info
{
    u2 max_stack;
    u2 max_locals;
    u4 code_length;
    u1 code[0 /*code_length*/];
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

    table_iterator<attribute_info> begin()
    {
        return {attributes, attributes_count};
    }

    table_iterator_end end()
    {
        return {};
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


template<class T, class U>
concept Derived = std::is_base_of<U, T>::value;

class ConstantPoolAppender
{
    size_t cp_index;
    u1* ptr;

public:
    explicit ConstantPoolAppender(void* ptr, size_t cp_count) : cp_index(cp_count), ptr((u1*)ptr)
    { }

    template<Derived<cp_info> T, typename... Args>
    size_t append(Args... args)
    {
        cp_info* cp = new (ptr) T(args...);
        ptr += cp->len();
        return cp_index++;
    }

    void* end() { return ptr; }

    size_t cp_count() { return cp_index; }
};

class ConstantPoolOffsets
{
    const void* start;
    uint32_t offsets[1 << 16];

public:
    explicit ConstantPoolOffsets(ClassFile1* file1) : start(&file1->constant_pool)
    {
        offsets[0] = std::numeric_limits<uint32_t>::max(); // should trigger a SIGSEGV
        size_t i = 1;
        for(cp_info& c : *file1)
            offsets[i++] = (u1*)&c - (u1*)start;
    }

    const cp_info* operator[](size_t i) const
    {
        assert(i);
        return (cp_info*)((u1*)start + offsets[i]);
    }
};

void add_clinit_hook(jvmtiEnv* jvmti_env, const unsigned char* src, jint src_len, unsigned char** dst_ptr, jint* dst_len_ptr)
{
    auto file1 = (ClassFile1*)src;
    ConstantPoolOffsets cp(file1);
    auto file2 = file1->continuation();
    auto file3 = file2->continuation();
    auto file4 = file3->continuation();

    for(auto& m : *file4)
    {
        auto cpentry = cp[m.name_index];
        assert(cpentry->tag == Utf8);
        auto name = ((Utf8_info*)cpentry)->str();

        if(std::equal(name.begin(), name.end(), "<clinit>"))
        {
            // Found class initializer!

            cpentry = cp[file2->this_class];
            assert(cpentry->tag == Class);
            size_t class_name_index = ((Class_info*)cpentry)->name_index;

            cpentry = cp[class_name_index];
            assert(cpentry->tag == Utf8);
            auto class_name = ((Utf8_info*)cpentry)->str();

            std::cerr << "Found <clinit> of class ";

            std::cerr.write(class_name.data(), class_name.size());
            std::cerr << '\n';

            // TODO: Add to constant pool:
            // Methodref: com.oracle.graal.pointsto.heap.ClassInitializationTracing.onClinitStart();
            // Utf8: class_name
            // Utf8: method_name

            unsigned char* dst;
            jvmti_env->Allocate(src_len + 1000, &dst);
            unsigned char* dst_start = dst;

            // Copy ClassFile1:
            auto dst_file1 = (ClassFile1*)dst;
            dst = std::copy(src, (const unsigned char*)file2, dst);

            // Add necessary constants
            ConstantPoolAppender cpa(dst, file1->constant_pool_count);
            size_t class_name_idx = cpa.append<Utf8_info>("com/oracle/graal/pointsto/heap/ClassInitializationTracing");
            size_t method_name_idx = cpa.append<Utf8_info>("onClinitStart");
            size_t method_descriptor_idx = cpa.append<Utf8_info>("()V");
            size_t name_and_type_idx = cpa.append<NameAndType_info>(method_name_idx, method_descriptor_idx);
            size_t class_idx = cpa.append<Class_info>(class_name_idx);
            size_t methodref_idx = cpa.append<ref_info>(Methodref, class_idx, name_and_type_idx);
            dst_file1->constant_pool_count = cpa.cp_count();

            // Copy ClassFile 2,3,4 until "<clinit>"-method
            auto dst_file2 = (ClassFile2*)cpa.end();

            for(attribute_info& m_attr : m)
            {
                cpentry = cp[m_attr.attribute_name_index];
                assert(cpentry->tag == Utf8);
                auto str = ((Utf8_info*) cpentry)->str();

                if(str.size() == 4 && std::equal(str.begin(), str.end(), "Code"))
                {
                    Code_attribute_1* code1 = (Code_attribute_1*)&m_attr;

                    // Found the code
                    dst = std::copy((const unsigned char*)file2, (const unsigned char*)code1->code, (unsigned char*)dst_file2);
                    {
                        u4 *dst_code_attr_len = (u4 *) (dst - ((const unsigned char *) code1->code - (const unsigned char *) &m_attr.attribute_length));
                        *dst_code_attr_len = m_attr.attribute_length + 3;
                    }
                    {
                        u4 *dst_code_len = (u4 *) (dst - ((const unsigned char *)code1->code - (const unsigned char *)&code1->code_length));
                        *dst_code_len = code1->code_length + 3;
                    }

                    *dst++ = OpCode::invokestatic;
                    *(u2*)dst = methodref_idx;
                    dst += sizeof(u2);

                    // TODO: Wir müssen die exceptiontable auch verschieben...

                    dst = std::copy((const unsigned char*)code1->code, src + src_len, dst);
                    *dst_ptr = dst_start;
                    *dst_len_ptr = dst - dst_start;
                    return;
                }
            }

            jvmti_env->Deallocate(dst_start);
            return;
        }
    }
}