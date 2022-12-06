#include <span>
#include <iterator>
#include <jni_md.h>
#include <jvmti.h>
#include <concepts>
#include <limits>
#include <unistd.h>
#include "settings.h"
#include <algorithm>
#include <numeric>

using namespace std;


#define BYTEWISE __attribute__((aligned(1), packed))

template<typename T>
T bswap(T);

template<> int8_t   bswap(int8_t   val) { return val; }
template<> uint8_t  bswap(uint8_t  val) { return val; }
template<> int16_t  bswap(int16_t  val) { return __builtin_bswap16(val); }
template<> uint16_t bswap(uint16_t val) { return __builtin_bswap16(val); }
template<> int32_t  bswap(int32_t  val) { return __builtin_bswap32(val); }
template<> uint32_t bswap(uint32_t val) { return __builtin_bswap32(val); }

template<typename T>
class BYTEWISE BigEndianInt
{
    T backing;

public:
    BigEndianInt() = default;

    BigEndianInt(T val) : backing(bswap(val)) {}

    operator T() const
    {
        return bswap(backing);
    }

    template<typename TOther>
    void operator+=(TOther other)
    {
        T val = *this;
        if(__builtin_add_overflow(val, other, &val))
            assert(false);
        *this = val;
    }
};

using u1 = uint8_t;
using u2 = BigEndianInt<uint16_t>;
using u4 = BigEndianInt<uint32_t>;
using i2 = BigEndianInt<int16_t>;
using i4 = BigEndianInt<int32_t>;




struct Insertion
{
    span<uint8_t> data;
    size_t pos;
};

class BciShift
{
    span<const Insertion> insertions;
public:
    explicit BciShift(span<const Insertion> insertions) : insertions(insertions) {}

    template<typename T>
    void relocate_relative(T& bci_offset, size_t ref_bci)
    {
        int64_t offset = bci_offset;
        size_t bci = ref_bci + offset;

        for(const auto& insertion : insertions)
        {
            if(insertion.pos > ref_bci)
                break;

            offset -= insertion.data.size();
        }

        for(const auto& insertion : insertions)
        {
            if(insertion.pos > bci)
                break;

            offset += insertion.data.size();
        }

        assert((int64_t)(T)offset == offset && "_bci overflow!");

        bci_offset = offset;
    }

    template<typename T>
    void relocate_absolute(T& bci)
    {
        uint64_t address = bci;

        for(const auto& insertion : insertions)
        {
            if(insertion.pos > bci)
                break;

            address += insertion.data.size();
        }

        assert((int64_t)(T)address == address && "_bci overflow!");
        bci = address;
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







enum class OpCode : u1
{
    nop = 0,
    aconst_null = 1,
    iconst_m1 = 2,
    iconst_0 = 3,
    iconst_1 = 4,
    iconst_2 = 5,
    iconst_3 = 6,
    iconst_4 = 7,
    iconst_5 = 8,
    lconst_0 = 9,
    lconst_1 = 10,
    fconst_0 = 11,
    fconst_1 = 12,
    fconst_2 = 13,
    dconst_0 = 14,
    dconst_1 = 15,
    bipush = 16,
    sipush = 17,
    ldc = 18,
    ldc_w = 19,
    ldc2_w = 20,
    iload = 21,
    lload = 22,
    fload = 23,
    dload = 24,
    aload,
    iload_0,
    iload_1,
    iload_2,
    iload_3,
    lload_0,
    lload_1,
    lload_2,
    lload_3,
    fload_0,
    fload_1,
    fload_2,
    fload_3,
    dload_0,
    dload_1,
    dload_2,
    dload_3,
    aload_0,
    aload_1,
    aload_2,
    aload_3,
    iaload,
    laload,
    faload,
    daload,
    aaload,
    baload,
    caload,
    saload,
    istore,
    lstore,
    fstore,
    dstore,
    astore,
    istore_0,
    istore_1,
    istore_2,
    istore_3,
    lstore_0,
    lstore_1,
    lstore_2,
    lstore_3,
    fstore_0,
    fstore_1,
    fstore_2,
    fstore_3,
    dstore_0,
    dstore_1,
    dstore_2,
    dstore_3,
    astore_0,
    astore_1,
    astore_2,
    astore_3,
    iastore,
    lastore,
    fastore,
    dastore,
    aastore,
    bastore,
    castore,
    sastore,

    pop,
    pop2,
    dup,
    dup_x1,
    dup_x2,
    dup2,
    dup2_x1,
    dup2_x2,
    swap,
    iadd,
    ladd,
    fadd,
    dadd,
    isub,
    lsub,
    fsub,
    dsub,
    imul,
    lmul,
    fmul,
    dmul,
    idiv,
    ldiv,
    fdiv,
    ddiv,
    irem,
    lrem,
    frem,
    drem,
    ineg,
    lneg,
    fneg,
    dneg,
    ishl,
    lshl,
    ishr,
    lshr,
    iushr,
    lushr,
    iand,
    land,
    ior,
    lor,
    ixor,
    lxor,
    iinc,
    i2l,
    i2f,
    i2d,
    l2i,
    l2f,
    l2d,
    f2i,
    f2l,
    f2d,
    d2i,
    d2l,
    d2f,
    i2b,
    i2c,
    i2s,

    lcmp,
    fcmpl,
    fcmpg,
    dcmpl,
    dcmpg,
    ifeq,
    ifne,
    iflt,
    ifge,
    ifgt,
    ifle,
    if_icmpeq,
    if_icmpne,
    if_icmplt,
    ic_icmpge,
    if_icmpgt,
    if_icmple,
    if_acmpeq,
    if_acmpne,

    goto_,
    jsr,
    ret,
    tableswitch,
    lookupswitch,
    ireturn,
    lreturn,
    freturn,
    dreturn,
    areturn,
    return_,

    getstatic,
    putstatic,
    getfield,
    putfield,
    invokevirtual,
    invokespecial,
    invokestatic,
    invokeinterface,
    invokedynamic,
    new_,
    newarray,
    anewarray,
    arraylength,
    athrow,
    checkcast,
    instanceof,
    monitorenter,
    monitorexit,

    wide,
    multianewarray,
    ifnull,
    ifnonnull,
    goto_w,
    jsr_w,

    breakpoint,
    impdep1 = 254,
    impdep2 = 255,
};

struct Instruction;

struct BYTEWISE TableSwitchBody
{
    i4 default_address;
    i4 low;
    i4 high;
    i4 addresses[0 /*high-low+1*/];

    static TableSwitchBody* from_instruction_address(const Instruction* instruction, size_t bci)
    {
        return (TableSwitchBody*)((uint8_t*)instruction + 1 + ((4 - (bci + 1)) & 3));
    }

    size_t len() const
    {
        return sizeof(*this) + sizeof(i4) * (high - low + 1);
    }

    void relocate_relative(BciShift a, size_t bci)
    {
        a.relocate_relative(default_address, bci);

        size_t n = ((int64_t)high - (int64_t)low) + 1;
        for(i4& addr : span(addresses, n))
        {
            a.relocate_relative(addr, bci);
        }
    }
};

struct BYTEWISE LookupSwitchBody
{
    struct BYTEWISE Pair
    {
        i4 match;
        i4 offset;
    };

    i4 default_address;
    u4 npairs;
    Pair pairs[0 /*npairs*/];

    static LookupSwitchBody* from_instruction_address(const Instruction* instruction, size_t bci)
    {
        return (LookupSwitchBody*)((uint8_t*)instruction + 1 + ((4 - (bci + 1)) & 3));
    }

    size_t len() const
    {
        return sizeof(*this) + sizeof(Pair) * npairs;
    }

    void relocate_relative(BciShift a, size_t bci)
    {
        a.relocate_relative(default_address, bci);

        for(Pair& p : span<Pair>(pairs, npairs))
        {
            a.relocate_relative(p.offset, bci);
        }
    }
};

struct Instruction
{
    OpCode op;

    size_t len(size_t bci) const
    {
        if(op >= OpCode::nop && op < OpCode::bipush)
            return 1;
        if(op == OpCode::bipush)
            return 2;
        if(op == OpCode::sipush)
            return 3;
        if(op == OpCode::ldc)
            return 2;
        if(op >= OpCode::ldc_w && op <= OpCode::ldc2_w)
            return 3;
        if(op >= OpCode::iload && op <= OpCode::aload)
            return 2;
        if(op >= OpCode::iload_0 && op <= OpCode::saload)
            return 1;
        if(op >= OpCode::istore && op <= OpCode::astore)
            return 2;
        if(op >= OpCode::istore_0 && op <= OpCode::sastore)
            return 1;
        if(op >= OpCode::pop && op <= OpCode::swap)
            return 1;
        if(op >= OpCode::iadd && op <= OpCode::lxor)
            return 1;
        if(op == OpCode::iinc)
            return 3;
        if(op >= OpCode::i2l && op <= OpCode::i2s)
            return 1;
        if(op >= OpCode::lcmp && op <= OpCode::dcmpg)
            return 1;
        if(op >= OpCode::ifeq && op <= OpCode::if_acmpne)
            return 3;
        if(op >= OpCode::goto_ && op <= OpCode::jsr)
            return 3;
        if(op == OpCode::ret)
            return 2;
        if(op == OpCode::tableswitch)
        {
            TableSwitchBody* body = TableSwitchBody::from_instruction_address(this, bci);
            return ((uint8_t*)body - (uint8_t*)this) + body->len();
        }
        if(op == OpCode::lookupswitch)
        {
            LookupSwitchBody* body = LookupSwitchBody::from_instruction_address(this, bci);
            return ((uint8_t*)body - (uint8_t*)this) + body->len();
        }
        if(op >= OpCode::ireturn && op <= OpCode::return_)
            return 1;
        if(op >= OpCode::getstatic && op <= OpCode::invokestatic)
            return 3;
        if(op >= OpCode::invokeinterface && op <= OpCode::invokedynamic)
            return 5;
        if(op == OpCode::new_)
            return 3;
        if(op == OpCode::newarray)
            return 2;
        if(op == OpCode::anewarray)
            return 3;
        if(op >= OpCode::arraylength && op <= OpCode::athrow)
            return 1;
        if(op >= OpCode::checkcast && op <= OpCode::instanceof)
            return 3;
        if(op >= OpCode::monitorenter && op <= OpCode::monitorexit)
            return 1;
        if(op == OpCode::wide)
        {
            const Instruction* next = this + 1;

            if(next->op == OpCode::iinc)
                return 6;
            else
                return 4;
        }
        if(op == OpCode::multianewarray)
            return 4;
        if(op >= OpCode::ifnull && op <= OpCode::ifnonnull)
            return 3;
        if(op >= OpCode::goto_w && op <= OpCode::jsr_w)
            return 5;
        if(op == OpCode::breakpoint)
            return 1;
        if(op >= OpCode::impdep1 && op <= OpCode::impdep2)
            return 1;

        assert(false && "Unknown OpCode!");
    }

    void relocate_relative(BciShift a, size_t bci)
    {
        bool needs_relocation = false;

        if(op >= OpCode::ifeq && op <= OpCode::if_acmpne
           || op >= OpCode::goto_ && op <= OpCode::jsr
           || op >= OpCode::ifnull && op <= OpCode::ifnonnull)
        {
            a.relocate_relative(*(i2*)((uint8_t*)this + 1), bci);
        }
        else if(op >= OpCode::goto_w && op <= OpCode::jsr_w)
        {
            a.relocate_relative(*(i4*)((uint8_t*)this + 1), bci);
        }
        else if(op == OpCode::tableswitch)
        {
            auto body = TableSwitchBody::from_instruction_address(this, bci);
            body->relocate_relative(a, bci);
        }
        else if(op == OpCode::lookupswitch)
        {
            auto body = LookupSwitchBody::from_instruction_address(this, bci);
            body->relocate_relative(a, bci);
        }
    }
};

template<>
class table_iterator<Instruction>
{
    Instruction* ptr;
    size_t _bci;

public:
    table_iterator(Instruction* ptr, size_t bci) : ptr(ptr), _bci(bci) {}

    table_iterator& operator++()
    {
        size_t len = ptr->len(_bci);
        ptr += len;
        _bci += len;
        return *this;
    }

    bool operator!=(table_iterator<Instruction> other) const
    {
        assert(ptr <= other.ptr);
        return ptr < other.ptr;
    }

    Instruction& operator*()
    {
        return *ptr;
    }

    Instruction* operator->() { return ptr; }

    size_t bci() const { return _bci;}
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
    Dynamic = 17,
    InvokeDynamic = 18
};

struct BYTEWISE cp_info
{
    cp_tag tag;

    explicit cp_info(cp_tag tag) : tag(tag) {}

    [[nodiscard]] size_t len() const;
};

template<class T, class U>
concept Derived = std::is_base_of<U, T>::value;

template<Derived<cp_info> T_info, typename T = size_t>
struct BYTEWISE ConstantPoolIndex
{
    T index;
    ConstantPoolIndex() = default;

    explicit ConstantPoolIndex(T index) : index(index) {}
};

template<cp_tag t>
struct BYTEWISE cp_info_tagged : public cp_info
{
    explicit cp_info_tagged() : cp_info(t) {}

    bool check_tag() const { return tag == t; }
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

struct BYTEWISE Integer_info : public cp_info_tagged<Integer>
{
    u4 bytes;
};

struct BYTEWISE Float_info : public cp_info_tagged<Float>
{
    u4 bytes;
};

struct BYTEWISE Long_info : public cp_info_tagged<Long>
{
    u4 high_bytes;
    u4 low_bytes;
};

struct BYTEWISE Double_info : public cp_info_tagged<Double>
{
    u4 high_bytes;
    u4 low_bytes;
};

struct BYTEWISE Utf8_info : public cp_info_tagged<Utf8>
{
    u2 length;
    u1 bytes[];

    explicit Utf8_info(const char* str)
    {
        write(str);
    }

    [[nodiscard]] std::string_view str() const
    {
        assert(tag == Utf8);
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

struct BYTEWISE String_info : public cp_info_tagged<String>
{
    ConstantPoolIndex<Utf8_info, u2> string_index;
};

struct BYTEWISE NameAndType_info : public cp_info_tagged<NameAndType>
{
    ConstantPoolIndex<Utf8_info, u2> name_index;
    ConstantPoolIndex<Utf8_info, u2> descriptor_index;

    explicit NameAndType_info(ConstantPoolIndex<Utf8_info> name, ConstantPoolIndex<Utf8_info> descriptor) : name_index(name.index), descriptor_index(descriptor.index)
    { }
};

struct BYTEWISE Class_info : public cp_info_tagged<Class>
{
    ConstantPoolIndex<Utf8_info, u2> name_index;

    explicit Class_info(ConstantPoolIndex<Utf8_info> name) : name_index(name.index) {}
};
static_assert(sizeof(Class_info) == 3);

struct BYTEWISE ref_info : public cp_info
{
    ConstantPoolIndex<Class_info, u2> class_index;
    ConstantPoolIndex<NameAndType_info, u2> name_and_type_index;

    ref_info(cp_tag tag, ConstantPoolIndex<Class_info> clazz, ConstantPoolIndex<NameAndType_info> name_and_type)
        : cp_info(tag), class_index(clazz.index), name_and_type_index(name_and_type.index)
    {}

    bool check_tag() const { return tag == Methodref || tag == InterfaceMethodref || tag == Fieldref; }
};

struct BYTEWISE MethodHandle_info : public cp_info_tagged<MethodHandle>
{
    u1 reference_kind;
    ConstantPoolIndex<ref_info, u2> reference_index;
};

struct BYTEWISE MethodType_info : public cp_info_tagged<MethodType>
{
    ConstantPoolIndex<Utf8_info, u2> descriptor_index;
};

struct BYTEWISE Dynamic_info : public cp_info_tagged<Dynamic>
{
    u2 bootstrap_method_attr_index;
    ConstantPoolIndex<NameAndType_info, u2> name_and_type_index;
};

struct BYTEWISE InvokeDynamic_info : public cp_info_tagged<InvokeDynamic>
{
    u2 bootstrap_method_attr_index;
    ConstantPoolIndex<NameAndType_info, u2> name_and_type_index;
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
        case Dynamic: return sizeof(Dynamic_info);
        case InvokeDynamic: return sizeof(InvokeDynamic_info);
        default:
            assert(false);
    }
}






// --- Attributes ---

struct BYTEWISE attribute_info
{
    ConstantPoolIndex<Utf8_info, u2> attribute_name_index;
    u4 attribute_length;

    size_t len() const
    {
        return sizeof(attribute_info) + (size_t)attribute_length;
    }
};

struct BYTEWISE Code_attribute_2;

struct BYTEWISE Code_attribute_1 : public attribute_info
{
    u2 max_stack;
    u2 max_locals;
    u4 code_length;
    Instruction code[0 /*code_length*/];

    Code_attribute_2* next()
    {
        return (Code_attribute_2*)&code[code_length];
    }

    table_iterator<Instruction> begin() {
        /*cerr << "Begin of instruction iteration!" << endl;*/ return {code, 0}; }
    table_iterator<Instruction> end() { return {code + code_length, code_length }; }
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

    void adjust_offset(BciShift a, size_t bci);
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

void verification_type_info::adjust_offset(BciShift a, size_t bci)
{
    if(tag == tag::Uninitialized)
    {
        a.relocate_absolute(((Uninitialized_variable_info *) this)->offset);
    }
}

struct BYTEWISE stack_map_frame
{
    u1 frame_type;

    size_t len() const;
    void adjust_offset(BciShift a, size_t bci);
    size_t offset_delta() const;
};

struct BYTEWISE same_frame : public stack_map_frame
{
    size_t len() const { return sizeof(*this); }
    void adjust_offset(BciShift a, size_t bci) { }
    size_t offset_delta() const { return frame_type; }
};

struct BYTEWISE same_locals_1_stack_item_frame : public stack_map_frame
{
    verification_type_info stack[0];

    size_t len() const { return sizeof(*this) + stack[0].len(); }
    void adjust_offset(BciShift a, size_t bci) { stack[0].adjust_offset(a, bci); }
    size_t offset_delta() const { return frame_type - 64; }
};

struct BYTEWISE same_locals_1_stack_item_frame_extended : public stack_map_frame
{
    u2 _offset_delta;
    verification_type_info stack[0];

    size_t len() const { return sizeof(*this) + stack[0].len(); }
    void adjust_offset(BciShift a, size_t bci) { stack[0].adjust_offset(a, bci); }
    size_t offset_delta() const { return _offset_delta; }
};

struct BYTEWISE chop_frame : public stack_map_frame
{
    u2 _offset_delta;

    size_t len() const { return sizeof(*this); }
    void adjust_offset(BciShift a, size_t bci) { }
    size_t offset_delta() const { return _offset_delta; }
};

struct BYTEWISE same_frame_extended : public stack_map_frame
{
    u2 _offset_delta;

    size_t len() const { return sizeof(*this); }
    void adjust_offset(BciShift a, size_t bci) { }
    size_t offset_delta() const { return _offset_delta; }
};

struct BYTEWISE append_frame : public stack_map_frame
{
    u2 _offset_delta;
    verification_type_info locals[0 /*frame_type - 251*/];

    table_iterator<verification_type_info> begin() { return {locals, (size_t)(frame_type - 251)}; }
    table_iterator_end end() { return {}; }

    size_t len() const
    {
        return (u1*)iterate_to_end(locals, (size_t)(frame_type - 251)) - (u1*)this;
    }

    void adjust_offset(BciShift a, size_t bci)
    {
        for(auto& local : *this)
            local.adjust_offset(a, bci);
    }

    size_t offset_delta() const { return _offset_delta; }
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

    void adjust_offset(BciShift a, size_t bci)
    {
        for(auto& i : *this)
            i.adjust_offset(a, bci);
    }
};

struct BYTEWISE full_frame : public stack_map_frame
{
    u2 _offset_delta;
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

    void adjust_offset(BciShift a, size_t bci)
    {
        for(auto& i : *this)
            i.adjust_offset(a, bci);

        next()->adjust_offset(a, bci);
    }

    size_t offset_delta() const { return _offset_delta; }
};

// I'd come up with a much nicer solution in DLang, but i don't know how to get a custom field-based virtual dispatch into C++...
// Therefore this ugliness:
#define SWITCH_DISPATCH(tag, fun, return) \
if(frame_type < 64) \
    return ((same_frame*)this)->fun; \
else if(frame_type < 128) \
    return ((same_locals_1_stack_item_frame*)this)->fun; \
else if(frame_type < 247) \
    assert(false); \
else if(frame_type == 247) \
    return ((same_locals_1_stack_item_frame_extended*)this)->fun; \
else if(frame_type <= 250) \
    return ((chop_frame*)this)->fun; \
else if(frame_type == 251) \
    return ((same_frame_extended*)this)->fun; \
else if(frame_type <= 254) \
    return ((append_frame*)this)->fun; \
else if(frame_type == 255) \
    return ((full_frame*)this)->fun; \
else \
    assert(false);

size_t stack_map_frame::len() const
{
    SWITCH_DISPATCH(frame_type, len(), return);
}

void stack_map_frame::adjust_offset(BciShift a, size_t bci)
{
    SWITCH_DISPATCH(frame_type, adjust_offset(a, bci),);
}

size_t stack_map_frame::offset_delta() const
{
    SWITCH_DISPATCH(frame_type, offset_delta(), return);
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
    ConstantPoolIndex<Utf8_info, u2> name_index;
    ConstantPoolIndex<Utf8_info, u2> descriptor_index;
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
    ConstantPoolIndex<Class_info, u2> this_class;
    ConstantPoolIndex<Class_info, u2> super_class;
    u2 interfaces_count;
    ConstantPoolIndex<Class_info, u2> interfaces[];

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



class ConstantPoolAppender
{
    size_t cp_index;
    u1* ptr;

public:
    explicit ConstantPoolAppender(void* ptr, size_t cp_count) : cp_index(cp_count), ptr((u1*)ptr)
    { }

    template<Derived<cp_info> T, typename... Args>
    ConstantPoolIndex<T> append(Args... args)
    {
        cp_info* cp = new (ptr) T(args...);
        ptr += cp->len();
        return ConstantPoolIndex<T>(cp_index++);
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

    template<Derived<cp_info> T_info, typename T>
    const T_info* operator[](ConstantPoolIndex<T_info, T> i) const
    {
        assert(i.index);
        T_info* cp_entry = (T_info*)((u1*)start + offsets[i.index]);
        cp_entry->check_tag();
        return cp_entry;
    }
};


template<typename T>
T* apply_offset(intptr_t offset, const T* ptr)
{
    return (T*)((u1*)ptr + offset);
}

static void relocate_instructions(span<Instruction> ins, BciShift bci_shift, size_t bci)
{
    table_iterator<Instruction> inst_it(&*ins.begin(), bci);
    table_iterator<Instruction> inst_end(&*ins.end(), bci + ins.size());

    while(inst_it != inst_end)
    {
        inst_it->relocate_relative(bci_shift, inst_it.bci());
        ++inst_it;
    }
}

// Returns number of written bytes
// This is 0 if the method does not have any code and therefore no replacement happened
static size_t copy_method_with_insertions(const ConstantPoolOffsets& cp, const method_or_field_info* src_method, method_or_field_info* dst_method, const span<const Insertion> insertions)
{
    size_t insertions_size = std::accumulate(insertions.begin(), insertions.end(), 0, [](size_t sum, const auto& insertion) { return sum + insertion.data.size(); });

    const uint8_t* src_method_end = (const uint8_t*)src_method + ((method_or_field_info*)src_method)->len();

    Code_attribute_1* code1 = nullptr;

    for(const attribute_info& m_attr : *(method_or_field_info*)src_method)
    {
        if(cp[m_attr.attribute_name_index]->str() == "Code")
        {
            code1 = (Code_attribute_1*)&m_attr;
            break;
        }
    }

    if(!code1)
        return 0;

    Code_attribute_2* code2 = code1->next();

    const uint8_t* src = (const uint8_t*)src_method;
    uint8_t* dst = (uint8_t*)dst_method;

    dst = std::copy(src, (const uint8_t*)code1->code, dst);
    src = (const uint8_t*)code1->code;

    Code_attribute_1* dst_code1 = apply_offset(dst - src, code1);

    size_t original_bci = 0;
    BciShift bci_shift(insertions);

    for(const auto& insertion : insertions)
    {
        auto prev_dst = dst;
        dst = std::copy(src, (const unsigned char*)code1->code + insertion.pos, dst);
        src = (const unsigned char*)code1->code + insertion.pos;

        relocate_instructions({(Instruction*)prev_dst, (Instruction*)dst}, bci_shift, original_bci);
        original_bci += (dst - prev_dst);

        assert((insertion.data.size() % 4) == 0 && "Switch Jumps may need to be 4-byte-aligned, so only the insertion of multiples of 4 is safe");
        dst = std::copy(insertion.data.begin(), insertion.data.end(), dst);
    }

    auto prev_dst = dst;
    auto prev_src = src;
    dst = std::copy(src, src_method_end, dst);
    src = src_method_end;

    relocate_instructions({(Instruction*)prev_dst, size_t((Instruction*)code1->next() - (Instruction*)prev_src)}, bci_shift, original_bci);

    assert(dst_code1->attribute_length == code1->attribute_length);
    assert(dst_code1->code_length == code1->code_length);
    dst_code1->attribute_length += insertions_size;
    dst_code1->code_length += insertions_size;


    for(auto& e : apply_offset(dst - src, code2)->exceptions())
    {
        bci_shift.relocate_absolute(e.start_pc);
        bci_shift.relocate_absolute(e.end_pc);
        bci_shift.relocate_absolute(e.handler_pc);
    }

    Code_attribute_3* code3 = code2->next();
    Code_attribute_3* dst_code3 = apply_offset(dst - src, code3);

    for(attribute_info& c_attr : *dst_code3)
    {
        auto str = cp[c_attr.attribute_name_index]->str();

        if(str == "StackMapTable")
        {
            auto* smt = (StackMapTable_attribute*)&c_attr;

            {
                auto insertion = insertions.begin();
                int bci_index = -1;

                for(auto &frame: *smt)
                {
                    bci_index += 1 + frame.offset_delta();
                    frame.adjust_offset(bci_shift, bci_index);

                    size_t offset = 0;
                    while(insertion != insertions.end() && bci_index >= insertion->pos)
                    {
                        offset += insertion->data.size();
                        insertion++;
                    }

                    if(offset == 0) // No shift necessary
                        continue;

                    u1& frame_type = frame.frame_type;

                    if(offset <= 64 && (frame_type < 64 - offset || frame_type >= 64 && frame_type < 128 - offset))
                    {
                        assert(offset <= 64 && "TODO");
                        frame_type += offset;
                    }
                    else if(frame_type >= 247)
                    {
                        // All have the same layout as same_frame_extended
                        auto typed_frame = (same_frame_extended*)&frame;
                        typed_frame->_offset_delta += offset;
                    }
                    else if(frame_type < 128)
                    {
#if LOG
                        cerr << "StackMapTable: Problematic entry. Trying to fix..." << endl;
#endif
                        // We have to extend
                        size_t bci = frame_type & 63;
                        bci += offset;

                        if(frame_type & 64)
                        {
                            frame_type = 247;
                        }
                        else
                        {
                            frame_type = 251;
                        }

                        // Make little space
                        dst_code1->attribute_length += 2;
                        c_attr.attribute_length += 2;
                        dst = std::copy(((u1*)&frame) + 1, dst, ((u1*)&frame) + 3);

                        auto typed_frame = (same_frame_extended*)&frame;
                        typed_frame->_offset_delta = bci;
                    }
                    else
                    {
                        assert(false && "Bad frame type");
                    }
                }
            }
        }
        else if(str == "LineNumberTable")
        {
            auto* lnt = (LineNumberTable_attribute*)&c_attr;

            for(auto& line : lnt->lines())
                bci_shift.relocate_absolute(line.start_pc);
        }
        else if(str == "LocalVariableTable")
        {
            auto* lvt = (LocalVariableTable_attribute*)&c_attr;

            for(auto& e : lvt->local_variables())
            {
                bci_shift.relocate_relative(e.length, e.start_pc);
                bci_shift.relocate_absolute(e.start_pc);
            }
        }
        else if(str == "LocalVariableTypeTable")
        {
            auto* lvtt = (LocalVariableTypeTable_attribute*)&c_attr;

            for(auto& e : lvtt->local_variable_types())
            {
                bci_shift.relocate_relative(e.length, e.start_pc);
                bci_shift.relocate_absolute(e.start_pc);
            }
        }
    }

    assert(((u1*)iterate_to_end(code3->attributes, code3->attributes_count)) == ((u1*)code1 + code1->len()));

    return dst - (uint8_t*)dst_method;
}

static ConstantPoolIndex<ref_info> create_method_ref(ConstantPoolAppender& cpa, ConstantPoolIndex<Class_info> declaringClass, const char* name, const char* descriptor)
{
    auto name_index = cpa.append<Utf8_info>(name);
    auto descriptor_index = cpa.append<Utf8_info>(descriptor);
    auto nameAndType_index = cpa.append<NameAndType_info>(name_index, descriptor_index);
    return cpa.append<ref_info>(Methodref, declaringClass, nameAndType_index);
}

#define SLACK_SPACE 100000

bool add_clinit_hook(jvmtiEnv* jvmti_env, const unsigned char* src_start, jint src_len, unsigned char** dst_ptr, jint* dst_len_ptr)
{
    auto file1 = (ClassFile1*)src_start;
    ConstantPoolOffsets cp(file1);
    auto file2 = file1->continuation();
    auto file3 = file2->continuation();
    auto file4 = file3->continuation();


    unsigned char* dst;
    jvmti_env->Allocate(src_len + SLACK_SPACE, &dst);
    unsigned char* dst_start = dst;

    // Copy ClassFile1:
    auto dst_file1 = (ClassFile1*)dst;
    dst = std::copy((const unsigned char*)file1, (const unsigned char*)file2, dst);

    // Add necessary constants
    ConstantPoolAppender cpa(dst, file1->constant_pool_count);

    auto instrumentation_class_name = cpa.append<Utf8_info>("ClassInitializationTracing");
    auto instrumentation_class = cpa.append<Class_info>(instrumentation_class_name);

    auto onClinitStart = create_method_ref(cpa, instrumentation_class, "onClinitStart", "()V");
    auto onArrayWrite = create_method_ref(cpa, instrumentation_class, "onArrayWrite", "([Ljava/lang/Object;ILjava/lang/Object;)V");
    auto onThreadStart = create_method_ref(cpa, instrumentation_class, "onThreadStart", "(Ljava/lang/Thread;)V");

    dst_file1->constant_pool_count = cpa.cp_count();

    // Copy ClassFile 2,3,4 until "<clinit>"-method
    auto dst_file2 = (ClassFile2*)cpa.end();

    dst = (uint8_t*)dst_file2;

    // Insert NOPS behind aastore and then replace it using the newly gained space
    uint8_t call_onArrayWrite_code[4] = { 0 };

    uint8_t call_onClinitStart_code[4];
    call_onClinitStart_code[0] = static_cast<uint8_t>(OpCode::invokestatic);
    *(u2*)&call_onClinitStart_code[1] = onClinitStart.index;
    call_onClinitStart_code[3] = static_cast<uint8_t>(OpCode::nop); // Padding

    uint8_t call_onThreadStart_code[4];
    call_onThreadStart_code[0] = (uint8_t)OpCode::aload_0;
    call_onThreadStart_code[1] = (uint8_t)OpCode::invokestatic;
    *(u2*)&call_onThreadStart_code[2] = onThreadStart.index;

    auto src = (const uint8_t*)file2;
    bool modified = false;

    for(auto& m : *file4)
    {
        dst = std::copy(src, (const uint8_t*)&m, dst);
        src = (const uint8_t*)&m;

        auto name = cp[m.name_index]->str();

        Code_attribute_1* code1 = nullptr;

        for(const attribute_info& m_attr : *(method_or_field_info*)&m)
        {
            if(cp[m_attr.attribute_name_index]->str() == "Code")
            {
                code1 = (Code_attribute_1*)&m_attr;
                break;
            }
        }

        if(!code1)
        {
            continue;
        }

        bool insert_clinit_callback = name == "<clinit>";

#if LOG
        if(insert_clinit_callback)
        {
            cerr << "Found <clinit> of " << class_name << '\n';
        }
#endif

        bool insert_threadstart_callback =
                name == "start"
                //&& cp[m.descriptor_index]->str() == "()V"
                && cp[cp[file2->this_class]->name_index]->str() == "java/lang/Thread";

        size_t insertion_count = 0;

        if(insert_clinit_callback)
            insertion_count++;

        if(insert_threadstart_callback)
            insertion_count++;

        for(Instruction& i : *code1)
        {
            if(i.op == OpCode::aastore)
                insertion_count++;
        }

        if(insertion_count == 0)
            continue;

        Insertion insertions[insertion_count];

        size_t insertion_index = 0;
        if(insert_clinit_callback)
        {
            insertions[insertion_index++] = { .data = call_onClinitStart_code, .pos = 0 };
        }

        if(insert_threadstart_callback)
        {
            insertions[insertion_index++] = { .data = call_onThreadStart_code, .pos = 0 };
        }

        for(Instruction& i : *code1)
        {
            if(i.op == OpCode::aastore)
            {
                if(insertion_index < insertion_count)
                    insertions[insertion_index++] = { .data = call_onArrayWrite_code, .pos = (size_t)(&i + 1 - code1->code) };
            }
        }

        size_t bytes_copied = copy_method_with_insertions(cp, (const method_or_field_info*)src, (method_or_field_info*)dst, {insertions, insertion_count});

        if(!bytes_copied)
            continue;

        modified = true;

        {
            // Replace aastore in target code
            Code_attribute_1* dst_code1 = nullptr;

            for(attribute_info& m_attr : *(method_or_field_info*)dst)
            {
                if(cp[m_attr.attribute_name_index]->str() == "Code")
                {
                    dst_code1 = (Code_attribute_1*)&m_attr;
                    break;
                }
            }

            assert(dst_code1);

            for(Instruction& i : *dst_code1)
            {
                if(i.op == OpCode::aastore)
                {
                    i.op = OpCode::invokestatic;
                    *(u2*)(&i + 1) = onArrayWrite.index;
                }
            }
        }

        dst += bytes_copied;
        src = (const uint8_t*)&m + m.len();
    }

    if(!modified)
    {
        auto res = jvmti_env->Deallocate(dst_start);
        assert(res == JVMTI_ERROR_NONE);
    }
    else
    {
        assert((dst - dst_start) <= (src_len + SLACK_SPACE));
        dst = std::copy(src, src_start + src_len, dst);
        *dst_ptr = dst_start;
        *dst_len_ptr = dst - dst_start;
    }

    return modified;
}