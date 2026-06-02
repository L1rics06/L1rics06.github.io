---
title: "???? heap ???1??????? function ? chunk"
description: "? malloc/free?brk/sbrk?mmap ? malloc_chunk??????????????????"
date: 2026-06-02
tags:
  - pwn
  - heap
cover: "/covers/heap-001-cover.png"
series: "???? heap ??"
day: 1
draft: false
---

参考来源ctfwiki和ai

### Functions

#### malloc/free

`malloc` 函数返回对应大小字节的内存块的指针

- 当 n=0 时，返回当前系统允许的堆的最小内存块。
- 当 n 为负数时，由于在大多数系统上，**size_t 是无符号数（这一点非常重要）**，所以程序就会申请很大的内存空间，但通常来说都会失败，因为系统没有那么多的内存可以分配。

`free` 函数会释放由 p 所指向的内存块

- **当 p 为空指针时，函数不执行任何操作。**
- 当 p 已经被释放之后，再次释放会出现乱七八糟的效果，这其实就是 `double free`。
- 除了被禁用 (mallopt) 的情况下，当释放很大的内存空间时，程序会将这些内存空间还给系统，以便于减小程序所使用的内存空间。

#### brk/sbrk

`brk` 和 `sbrk` 是操作系统/类 Unix 系统中用来**调整进程堆空间大小**的接口。 

`program break`:**当前堆区的结束位置。**

而 `brk` 就是用来**直接设置 program break 的位置**。

`sbrk` 是在当前 `program break` 的基础上**增加或减少一段大小**。

注意：`malloc`和`free`并不是直接对操作系统管理的内存进行操作，而是先通过自己的堆管理器，例如`ptmalloc2`或` glibc malloc` 堆管理器

可以如下图理解

```
你的程序
  |
  | malloc / free
  v
ptmalloc2 / glibc malloc 堆管理器
  |
  | 如果现有堆空间够用
  |   -> 从已有空闲 chunk 里分配
  |
  | 如果现有堆空间不够
  |   -> 向操作系统申请更多内存
  v
brk / sbrk / mmap
  |
  v
操作系统内核
```

初始时，堆的起始地址 [start_brk](http://elixir.free-electrons.com/linux/v3.8/source/include/linux/mm_types.h#L365) 以及堆的当前末尾 [brk](http://elixir.free-electrons.com/linux/v3.8/source/include/linux/mm_types.h#L365) 指向同一地址。根据是否开启 ASLR，两者的具体位置会有所不同

- 不开启 ASLR 保护时，start_brk 以及 brk**（就是program break）** 会指向 data/bss 段的结尾。
- 开启 ASLR 保护时，start_brk 以及 brk 也会指向同一位置，只是这个位置是在 data/bss 段结尾后的随机偏移处。

#### mmap

创建独立的匿名映射段。匿名映射的目的主要是可以申请以 0 填充的内存，并且这块内存仅被调用进程所使用。

`mmap` 是在进程地址空间中**单独找一块区域映射出来**，不一定紧挨着原来的 heap。

如果`brk`和`sbrk`用于申请较小内存块，则`mmap` 通常用于申请比较大的内存块。

```c
void *p = mmap(addr, length, prot, flags, fd, offset);
```

`addr`:建议映射到哪个地址。如果是NULL表示让操作系统自己做决定。

`length`:映射多大空间

`prot`:权限 PROT_READ 可读// PROT_WRITE 可写//PROT_EXEC 可执行// PROT_NONE 不可访问

`flags`:映射方式，匿名映射 私有映射 共享映射 `fd`:文件描述符。`offset`:从文件的哪个偏移开始映射。 这三个针对的都是文件映射，`mmap` 可以把文件内容映射到内存中。

映射的内存不一定在 `[heap]` 里面，而也有可能是在 `mmap` 区域。

`munmap` 可以理解为mmap的`free`

### Data Structure

#### malloc_chunk

在程序的执行过程中，我们称由 malloc 申请的内存为 `chunk` 。这块内存在 ptmalloc 内部用 malloc_chunk 结构体来表示。

**无论一个 `chunk` 的大小如何，处于分配状态还是释放状态，它们都使用一个统一的结构如下**

```c
struct malloc_chunk {

  INTERNAL_SIZE_T      prev_size;  /* Size of previous chunk (if free).  */
  INTERNAL_SIZE_T      size;       /* Size in bytes, including overhead. */

  struct malloc_chunk* fd;         /* double links -- used only if free. */
  struct malloc_chunk* bk;

  /* Only used for large blocks: pointer to next larger size.  */
  struct malloc_chunk* fd_nextsize; /* double links -- used only if free. */
  struct malloc_chunk* bk_nextsize;
};
```

非常像数据结构里面的双向链表是吧，我个人的理解就是数据结构这门课程最底层下面的结构一个就是类似栈这种完全连续的，还有的就是链表这种物理不上不连续但是有指针指向的。

这刚好又与操作系统上的堆与栈关联上了。

回到正题，这里的 `INTERNAL_SIZE_T`宏可以理解为：**glibc malloc 内部专门用来保存 chunk 大小的整数类型。**

在 glibc 源码里，它默认定义为：

```c
#define INTERNAL_SIZE_T size_t
```

也就是说，通常情况下它就是 `size_t`。glibc 的 `malloc-size.h` 里说明：`INTERNAL_SIZE_T` 是 malloc 内部用于记录 chunk size 的 word-size 类型，默认版本和 `size_t` 相同

**prev_size**, 如果该 `chunk` 的 **物理相邻的前一地址 chunk（两个指针的地址差值为前一 chunk 大小）** 是空闲的话，那该字段记录的是前一个 `chunk` 的大小 (包括 `chunk` 头)。否则，该字段可以用来存储物理相邻的前一个 chunk 的数据。**这里的前一 `chunk` 指的是较低地址的 `chunk`** 。

很巧妙的思路啊，这样不就知道中间空余的大小来处理内存碎片了吗。

注意这里有个混淆的地方：

> **“下一个 chunk”指的是物理地址上紧挨着的下一个 chunk。**

如果 A 和 B 中间出现了一个空闲块，那这个空闲块本身就是一个 chunk。此时 **B 就不是 A 的下一个 chunk**。

**size** ，该 `chunk` 的大小，大小必须是 `MALLOC_ALIGNMENT` 的整数倍。如果申请的内存大小不是 `MALLOC_ALIGNMENT` 的整数倍，会被转换满足大小的最小的 `MALLOC_ALIGNMENT` 的倍数，这通过 `request2size()` 宏完成。

| 标志位           | 值    | 位置    | 含义                          |
| ---------------- | ----- | ------- | ----------------------------- |
| `PREV_INUSE`     | `0x1` | 第 0 位 | 前一个 chunk 是否正在使用     |
| `IS_MMAPPED`     | `0x2` | 第 1 位 | 当前 chunk 是否由 `mmap` 分配 |
| `NON_MAIN_ARENA` | `0x4` | 第 2 位 | 当前 chunk 是否属于非主 arena |

这三个字段在 **`size` 字段的低 3 位**里,这里用了`chunk`的字节对齐特性，如果你在调试器里看到一个 chunk 的 size 字段是：`0x31`,它不是说 chunk 真实大小是 `0x31`。

而是 **0x31 = 0x30 | 0x1** 计算真实大小时，需要把低位标志清掉。

- `fd`，`bk` `chunk`处于分配状态时，从 fd 字段开始是用户的数据。`chunk`空闲时，会被添加到对应的空闲管理链表中，其字段的含义如下
  - `fd` 指向下一个（非物理相邻）空闲的 `chunk` 。
  - `bk `指向上一个（非物理相邻）空闲的 `chunk` 。
  - 通过 fd 和 bk 可以将空闲的 `chunk` 块加入到空闲的 `chunk` 块链表进行统一管理。

注意这里的前后关系是**空闲链表里的前后关系**,chunk 处于分配状态时，`fd` / `bk` 不再作为链表指针使用，而是变成用户数据区的一部分。

- `fd_nextsize`， `bk_nextsize`，也是只有`chunk`空闲的时候才使用，不过其用于较大的 `chunk（large chunk）`。
  - `fd_nextsize` 指向前一个与当前 `chunk` 大小不同的第一个空闲块，不包含 bin 的头指针。
  - `bk_nextsize` 指向后一个与当前 `chunk` 大小不同的第一个空闲块，不包含 bin 的头指针。
  - 一般空闲的 large `chunk` 在 fd 的遍历顺序中，按照由大到小的顺序排列。**这样做可以避免在寻找合适 chunk 时挨个遍历。**

一个已经分配的 `chunk` 的样子如下。**我们称前两个字段称为 `chunk` header，后面的部分称为 user data。每次 malloc 申请得到的内存指针，其实指向 user data 的起始处。**

当一个 `chunk` 处于使用状态时，它的下一个 `chunk` 的 prev_size 域无效，所以下一个 `chunk` 的该部分也可以被当前 chunk 使用。**这就是 chunk 中的空间复用。**

可以这样理解：**`prev_size` 这个字段不是永远属于“当前 chunk 自己”的有效元数据，它有时候其实是“前一个 chunk 的尾部信息”。**

```
低地址

chunk ->
+-----------------------------+
| prev_size                   |  只有前一个 chunk 空闲时才有意义
+-----------------------------+
| size | A | M | P            |  当前 chunk 大小 + 标志位
+-----------------------------+
mem ->
+-----------------------------+
| user data                   |  malloc 返回值指向这里
|                             |
|                             |
+-----------------------------+
nextchunk ->
+-----------------------------+
| next chunk prev_size / data |
+-----------------------------+
| next chunk size | A | M | P |
+-----------------------------+

高地址
```

当 chunk 被 `free` 之后，如果进入普通 bin，比如 unsorted bin / small bin / large bin，它会变成：

```
低地址

chunk ->
+-----------------------------+
| prev_size                   |  如果前一个 chunk 空闲，则记录前一个 chunk 大小
+-----------------------------+
| size | A | 0 | P            |  当前 chunk 大小 + 标志位
+-----------------------------+
| fd                          |  指向空闲链表中的下一个 chunk
+-----------------------------+
| bk                          |  指向空闲链表中的上一个 chunk
+-----------------------------+
| fd_nextsize                 |  large bin 中使用
+-----------------------------+
| bk_nextsize                 |  large bin 中使用
+-----------------------------+
| unused space                |
+-----------------------------+
nextchunk ->
+-----------------------------+
| prev_size = 当前 chunk 大小 |
+-----------------------------+
| next chunk size | A | M | P |
+-----------------------------+

高地址
```

#### chunk的宏

| 宏                          | 作用                                            |
| --------------------------- | ----------------------------------------------- |
| `SIZE_SZ`                   | `INTERNAL_SIZE_T` 的大小，64 位常为 8           |
| `MALLOC_ALIGNMENT`          | malloc 对齐大小，64 位常为 16                   |
| `MALLOC_ALIGN_MASK`         | 对齐掩码，64 位常为 `0xf`                       |
| `CHUNK_HDR_SZ`              | chunk 头大小，64 位为 `0x10`                    |
| `MIN_CHUNK_SIZE`            | 最小 chunk 结构需求大小，64 位常为 `0x20`       |
| `MINSIZE`                   | 对齐后的最小 chunk size，64 位常为 `0x20`       |
| `request2size(req)`         | 用户请求大小转内部 chunk size                   |
| `checked_request2size(req)` | 带溢出检查的 `request2size`                     |
| `chunk2mem(p)`              | chunk 指针转用户指针                            |
| `mem2chunk(mem)`            | 用户指针转 chunk 指针                           |
| `chunksize(p)`              | 去掉 flag 后的真实 chunk size                   |
| `chunksize_nomask(p)`       | 原始 size 字段                                  |
| `next_chunk(p)`             | 下一个物理相邻 chunk                            |
| `prev_chunk(p)`             | 前一个物理相邻 chunk                            |
| `chunk_at_offset(p, s)`     | 把 `p+s` 当成 chunk                             |
| `prev_inuse(p)`             | 当前 chunk 的 P 位，表示前一个 chunk 是否使用   |
| `inuse(p)`                  | 通过下一个 chunk 的 P 位判断当前 chunk 是否使用 |
| `set_head(p, s)`            | 设置 size 字段                                  |
| `set_head_size(p, s)`       | 只设置大小，保留 flag                           |
| `set_foot(p, s)`            | 设置下一个 chunk 的 `prev_size`                 |
