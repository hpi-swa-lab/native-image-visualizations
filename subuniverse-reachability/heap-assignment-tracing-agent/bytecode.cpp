#include <iostream>
#include <span>
#include <iterator>
#include <jni_md.h>
#include <jvmti.h>
#include <concepts>
#include <limits>
#include <fstream>
#include <csignal>
#include <sys/types.h>
#include <unistd.h>

using namespace std;


#define LOG 0

#define DEBUG_ON_ASSERT_FAIL 0

#ifdef DEBUG_ON_ASSERT_FAIL
#undef assert
#ifdef NDEBUG
#define assert(ignore) ((void)0)
#else
__attribute__((noreturn))
static void __gripe(const char *_Expr, const char *_File, int _Line, const char *_Func) noexcept
{
    std::cout << "PID: " << getpid() << std::endl;
    raise(SIGSTOP);
    exit(1);
}
#define assert(expr) \
    ((expr) ? (void)0 :\
     __gripe(#expr, __FILE__,__LINE__,__func__))
#endif
#endif // DEBUG_ON_ASSERT_FAIL



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

    template<typename T>
    void operator+=(T other)
    {
        backing = __builtin_bswap16(__builtin_bswap16(backing) + other);
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

    template<typename T>
    void operator+=(T other)
    {
        backing = __builtin_bswap32(__builtin_bswap32(backing) + other);
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

template<typename T>
static T* iterate_to_end(T* begin, size_t count)
{
    table_iterator<T> it{begin, count};
    table_iterator_end e;

    while(it != e)
        ++it;

    return &*it;
}

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

    [[nodiscard]] std::string_view str() const
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

struct BYTEWISE Code_attribute_2;

struct BYTEWISE Code_attribute_1 : public attribute_info
{
    u2 max_stack;
    u2 max_locals;
    u4 code_length;
    u1 code[0 /*code_length*/];

    Code_attribute_2* next()
    {
        return (Code_attribute_2*)&code[code_length];
    }
};



struct BYTEWISE Code_attribute_3;

struct BYTEWISE Code_attribute_2
{
    u2 exception_table_length;
    struct BYTEWISE entry
    {
        u2 start_pc;
        u2 end_pc;
        u2 handler_pc;
        u2 catch_type;
    } exception_table[0 /*exception_table_length*/];

    span<entry> exceptions()
    {
        return {exception_table, exception_table_length};
    }

    Code_attribute_3* next()
    {
        return (Code_attribute_3*)&exception_table[exception_table_length];
    }
};

struct BYTEWISE Code_attribute_3
{
    u2 attributes_count;
    attribute_info attributes[0 /*attributes_count*/];

    table_iterator<attribute_info> begin() { return {attributes, attributes_count}; }

    table_iterator_end end() { return {}; }
};








class BciShift
{
    uint16_t insert_at_pos;
    uint16_t insertion_size;
public:
    BciShift(uint16_t pos, uint16_t offset) : insert_at_pos(pos), insertion_size(offset) {}

    void apply(u2& bci)
    {
        uint16_t val = bci;
        if(val >= insert_at_pos)
        {
            assert((uint32_t)val + (uint32_t)insertion_size <= numeric_limits<uint16_t>::max() && "bci overflow!");
            bci = val + insertion_size;
        }
    }
};

// --- Frames ---

struct BYTEWISE verification_type_info
{
    enum class tag : u1
    {
        Top = 0,
        Integer = 1,
        Float = 2,
        Double = 3,
        Long = 4,
        Null = 5,
        UninitializedThis = 6,
        Object = 7,
        Uninitialized = 8,
    } tag;

    size_t len() const;

    void adjust_offset(BciShift a);
};

struct BYTEWISE Object_variable_info : public verification_type_info
{
    u2 cpool_index;
};

struct BYTEWISE Uninitialized_variable_info : public verification_type_info
{
    u2 offset;
};

size_t verification_type_info::len() const
{
    switch(tag)
    {
        case tag::Object: return sizeof(Object_variable_info);
        case tag::Uninitialized: return sizeof(Uninitialized_variable_info);
        default: return sizeof(verification_type_info);
    }
}

void verification_type_info::adjust_offset(BciShift a)
{
    if(tag == tag::Uninitialized)
    {
        a.apply(((Uninitialized_variable_info*)this)->offset);
    }
}

struct BYTEWISE stack_map_frame
{
    u1 frame_type;

    size_t len() const;

    void adjust_offset(BciShift a);
};

struct BYTEWISE same_frame : public stack_map_frame
{
    size_t len() const { return sizeof(*this); }
    void adjust_offset(BciShift a) { }
};

struct BYTEWISE same_locals_1_stack_item_frame : public stack_map_frame
{
    verification_type_info stack[0];

    size_t len() const
    {
        return sizeof(*this) + stack[0].len();
    }

    void adjust_offset(BciShift a)
    {
        stack[0].adjust_offset(a);
    }
};

struct BYTEWISE same_locals_1_stack_item_frame_extended : public stack_map_frame
{
    u2 offset_delta;
    verification_type_info stack[0];

    size_t len() const
    {
        return sizeof(*this) + stack[0].len();
    }

    void adjust_offset(BciShift a)
    {
        stack[0].adjust_offset(a);
    }
};

struct BYTEWISE chop_frame : public stack_map_frame
{
    u2 offset_delta;

    size_t len() const
    {
        return sizeof(*this);
    }

    void adjust_offset(BciShift a) {}
};

struct BYTEWISE same_frame_extended : public stack_map_frame
{
    u2 offset_delta;

    size_t len() const
    {
        return sizeof(*this);
    }

    void adjust_offset(BciShift a) {}
};

struct BYTEWISE append_frame : public stack_map_frame
{
    u2 offset_delta;
    verification_type_info locals[0 /*frame_type - 251*/];

    table_iterator<verification_type_info> begin() { return {locals, (size_t)(frame_type - 251)}; }
    table_iterator_end end() { return {}; }

    size_t len() const
    {
        return (u1*)iterate_to_end(locals, (size_t)(frame_type - 251)) - (u1*)this;
    }

    void adjust_offset(BciShift a)
    {
        for(auto& local : *this)
            local.adjust_offset(a);
    }
};

struct BYTEWISE full_frame2
{
    u2 number_of_stack_items;
    verification_type_info stack[0 /*number_of_stack_items*/];

    table_iterator<verification_type_info> begin() { return {stack, number_of_stack_items}; }
    table_iterator_end end() { return {}; }

    size_t len() const
    {
        return (u1*)iterate_to_end(stack, number_of_stack_items) - (u1*)this;
    }

    void adjust_offset(BciShift a)
    {
        for(auto& i : *this)
            i.adjust_offset(a);
    }
};

struct BYTEWISE full_frame : public stack_map_frame
{
    u2 offset_delta;
    u2 number_of_locals;
    verification_type_info locals[0 /*number_of_locals*/];

    table_iterator<verification_type_info> begin() { return {locals, number_of_locals}; }
    table_iterator_end end() { return {}; }

    full_frame2* next()
    {
        return (full_frame2*)iterate_to_end(locals, number_of_locals);
    }

    size_t len() const
    {
        full_frame2* n = const_cast<full_frame*>(this)->next();
        return n->len() + ((u1*)n - (u1*)this);
    }

    void adjust_offset(BciShift a)
    {
        for(auto& i : *this)
            i.adjust_offset(a);

        next()->adjust_offset(a);
    }
};

size_t stack_map_frame::len() const
{
    if(frame_type < 64)
        return ((same_frame*)this)->len();
    else if(frame_type < 128)
        return ((same_locals_1_stack_item_frame*)this)->len();
    else if(frame_type < 247)
        assert(false);
    else if(frame_type == 247)
        return ((same_locals_1_stack_item_frame_extended*)this)->len();
    else if(frame_type <= 250)
        return ((chop_frame*)this)->len();
    else if(frame_type == 251)
        return ((same_frame_extended*)this)->len();
    else if(frame_type <= 254)
        return ((append_frame*)this)->len();
    else if(frame_type == 255)
        return ((full_frame*)this)->len();
    else
        assert(false);
}

void stack_map_frame::adjust_offset(BciShift a)
{
    if(frame_type < 64)
        ((same_frame*)this)->adjust_offset(a);
    else if(frame_type < 128)
        ((same_locals_1_stack_item_frame*)this)->adjust_offset(a);
    else if(frame_type < 247)
        assert(false);
    else if(frame_type == 247)
        ((same_locals_1_stack_item_frame_extended*)this)->adjust_offset(a);
    else if(frame_type <= 250)
        ((chop_frame*)this)->adjust_offset(a);
    else if(frame_type == 251)
        ((same_frame_extended*)this)->adjust_offset(a);
    else if(frame_type <= 254)
        ((append_frame*)this)->adjust_offset(a);
    else if(frame_type == 255)
        ((full_frame*)this)->adjust_offset(a);
    else
        assert(false);
}

struct BYTEWISE StackMapTable_attribute : public attribute_info
{
    u2 number_of_entries;
    stack_map_frame entries[0];

    table_iterator<stack_map_frame> begin()
    {
        return {entries, number_of_entries};
    }

    table_iterator_end end() { return {}; }
};

struct BYTEWISE LineNumberTable_attribute : public attribute_info
{
    u2 line_number_table_length;
    struct BYTEWISE entry
    {
        u2 start_pc;
        u2 line_number;
    } line_number_table[0 /*line_number_table_length*/];

    span<entry> lines()
    {
        return {line_number_table, line_number_table_length};
    }
};

struct BYTEWISE LocalVariableTable_attribute : public attribute_info
{
    u2 local_variable_type_table_length;
    struct BYTEWISE entry
    {
        u2 start_pc;
        u2 length;
        u2 name_index;
        u2 descriptor_index;
        u2 index;
    } local_variable_type_table[0 /*local_variable_type_table_length*/];

    span<entry> local_variables()
    {
        return {local_variable_type_table, local_variable_type_table_length};
    }
};

struct BYTEWISE LocalVariableTypeTable_attribute : public attribute_info
{
    u2 local_variable_type_table_length;
    struct BYTEWISE entry
    {
        u2 start_pc;
        u2 length;
        u2 name_index;
        u2 descriptor_index;
        u2 index;
    } local_variable_type_table[0 /*local_variable_type_table_length*/];

    span<entry> local_variable_types()
    {
        return {local_variable_type_table, local_variable_type_table_length};
    }
};

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

static uint32_t num = 0;

template<typename T>
T* apply_offset(intptr_t offset, const T* ptr)
{
    return (T*)((u1*)ptr + offset);
}

// Returns number of written bytes
// This is 0 if the method does not have any code and therefore no replacement happened
static size_t copy_method_with_insertion(const ConstantPoolOffsets& cp, const method_or_field_info* src_method, method_or_field_info* dst_method, const span<uint8_t> insertion, size_t insert_at_pos)
{
    assert((insertion.size() % 4) == 0 && "Switch Jumps may need to be 4-byte-aligned, so only the insertion of multiples of 4 is safe");

    intptr_t offset = (uint8_t*)dst_method - (uint8_t*)src_method;

    const uint8_t* src_method_end = (const uint8_t*)src_method + ((method_or_field_info*)src_method)->len();

    for(const attribute_info& m_attr : *(method_or_field_info*)src_method)
    {
        auto cpentry = cp[m_attr.attribute_name_index];
        assert(cpentry->tag == Utf8);
        auto str = ((Utf8_info*) cpentry)->str();

        if(str == "Code")
        {
            Code_attribute_1* code1 = (Code_attribute_1*)&m_attr;
            Code_attribute_2* code2 = code1->next();

            // Found the code
            auto dst = std::copy((const unsigned char*)src_method, (const unsigned char*)code1->code + insert_at_pos, (unsigned char*)dst_method);

            u4 *dst_code_attr_len = apply_offset(offset, &m_attr.attribute_length);
            u4 *dst_code_len = apply_offset(offset, &code1->code_length);
            *dst_code_attr_len = m_attr.attribute_length + insertion.size();
            *dst_code_len = code1->code_length + insertion.size();

            dst = std::copy(insertion.begin(), insertion.end(), dst);
            offset += insertion.size();
            dst = std::copy((const uint8_t*)code1->code + insert_at_pos, src_method_end, dst);

            BciShift bci_shift(insert_at_pos, insertion.size());

            for(auto& e : apply_offset(offset, code2)->exceptions())
            {
                bci_shift.apply(e.start_pc);
                bci_shift.apply(e.end_pc);
                bci_shift.apply(e.handler_pc);
            }

            Code_attribute_3* code3 = code2->next();

            u4* dst_c_length = apply_offset(offset, &code1->attribute_length);

            for(attribute_info& c_attr : *apply_offset(offset, code3))
            {
                cpentry = cp[c_attr.attribute_name_index];
                assert(cpentry->tag == Utf8);
                str = ((Utf8_info*) cpentry)->str();

                if(str == "StackMapTable")
                {
                    auto* smt = (StackMapTable_attribute*)&c_attr;

                    {
                        auto it = smt->begin();

                        while(it != smt->end())
                        {
                            ++it;
                        }

                        assert((u1*)&*it - (u1*)smt == smt->len());
                    }

                    for(auto& frame : *smt)
                        frame.adjust_offset(bci_shift);

                    // --- TODO: For the whole following section: ---
                    // We only want to shift bcis after "insertion_at_pos"

                    if(smt->number_of_entries)
                    {
                        u1& frame_type = smt->entries[0].frame_type;

                        assert(insertion.size() <= 64 && "TODO");

                        if(frame_type < 64 - insertion.size() || frame_type >= 64 && frame_type < 128 - insertion.size())
                        {
                            frame_type += insertion.size();
                        }
                        else if(frame_type >= 247)
                        {
                            *(u2*)(((u1*)&smt->entries) + 1) += insertion.size();
                        }
                        else if(frame_type < 128)
                        {
                            // We have to extend
                            size_t bci = frame_type & 63;
                            bci += insertion.size();

                            if(frame_type & 64)
                            {
                                frame_type = 247;
                            }
                            else
                            {
                                frame_type = 251;
                            }

                            // Make little space
                            *dst_code_attr_len += 2;
                            c_attr.attribute_length += 2;
                            dst = std::copy(((u1*)&smt->entries) + 1, dst, ((u1*)&smt->entries) + 3);

                            *(u2*)(((u1*)&smt->entries) + 1) = bci;
                        }
                        else
                        {
                            assert(false && "Bad frame type");
                        }
                    }
                }
                else if(str == "LineNumberTable")
                {
                    auto* lnt = (LineNumberTable_attribute*)&c_attr;

                    for(auto& line : lnt->lines())
                        bci_shift.apply(line.start_pc);
                }
                else if(str == "LocalVariableTable")
                {
                    auto* lvt = (LocalVariableTable_attribute*)&c_attr;

                    for(auto& e : lvt->local_variables())
                        bci_shift.apply(e.start_pc);
                }
                else if(str == "LocalVariableTypeTable")
                {
                    auto* lvtt = (LocalVariableTypeTable_attribute*)&c_attr;

                    for(auto& e : lvtt->local_variable_types())
                        bci_shift.apply(e.start_pc);
                }
            }

            return dst - (uint8_t*)dst_method;
        }
    }

    return 0;
}



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

            if(class_name == "com/oracle/svm/hosted/phases/IntrinsifyMethodHandlesInvocationPlugin")
                return;

            unsigned char* dst;
            jvmti_env->Allocate(src_len + 1000, &dst);
            unsigned char* dst_start = dst;

            // Copy ClassFile1:
            auto dst_file1 = (ClassFile1*)dst;
            dst = std::copy(src, (const unsigned char*)file2, dst);

            // Add necessary constants
            ConstantPoolAppender cpa(dst, file1->constant_pool_count);
            size_t class_name_idx = cpa.append<Utf8_info>("ClassInitializationTracing");
            size_t method_name_idx = cpa.append<Utf8_info>("onClinitStart");
            size_t method_descriptor_idx = cpa.append<Utf8_info>("()V");
            size_t name_and_type_idx = cpa.append<NameAndType_info>(method_name_idx, method_descriptor_idx);
            size_t class_idx = cpa.append<Class_info>(class_name_idx);
            size_t methodref_idx = cpa.append<ref_info>(Methodref, class_idx, name_and_type_idx);
            dst_file1->constant_pool_count = cpa.cp_count();

            // Copy ClassFile 2,3,4 until "<clinit>"-method
            auto dst_file2 = (ClassFile2*)cpa.end();

            dst = (uint8_t*)dst_file2;
            ptrdiff_t offset = (uint8_t*)dst_file2 - (uint8_t*)file2;

            uint8_t insertion[4];
            insertion[0] = OpCode::invokestatic;
            *(u2*)&insertion[1] = methodref_idx;
            insertion[3] = 0; // Pading

            dst = std::copy((const uint8_t*)file2, (const uint8_t*)&m, dst);

            assert(dst == (uint8_t*)apply_offset(offset, &m));
            size_t bytes_copied = copy_method_with_insertion(cp, &m, apply_offset(offset, &m), insertion, 0);

            if(bytes_copied == 0)
            { // No code attribute
                jvmti_env->Deallocate(dst_start);
                return;
            }

            dst += bytes_copied;

            dst = std::copy((const uint8_t*)&m + m.len(), src + src_len, dst);

            *dst_ptr = dst_start;
            *dst_len_ptr = dst - dst_start;
            return;
        }
    }
}