---
title: "想要成为 heap 高手（2）：bin 与 arena"
description: "从 bins、fastbin、small bin、large bin 到 arena，把空闲 chunk 的链表组织方式串起来。"
date: 2026-06-03
tags:
  - pwn
  - heap
cover: "/covers/heap-002-cover.png"
series: "想要成为 heap 高手"
day: 2
draft: false
---

参考资料来源CTFwiki和ai

### 微观结构 bin

当你将某一个`chunk` free之后，前面说到为了避免频繁的系统调用，chunk并不会立刻返回给操作系统，而是通过堆管理器进行管理，当用户再一次请求分配内存时，堆管理器会在空闲的chunk中挑选一块合适的给用户。

那么`bin` 就是 `malloc_state / arena` 中用来保存空闲 chunk 的链表头或链表数组。

初步分为 4 类：`fast bins`，`small bins`，`large bins`，`unsorted bin`。

#### bins

在 glibc 的 `malloc_state` 结构里，有一个成员大致叫：

```c
mchunkptr bins[NBINS * 2 - 2];
```

它用来管理很多个 bin 的数组。

每个 bin 本质上是一个链表头，用来挂空闲 chunk。

大致结构可以理解成：

```
bins 数组
 |
 |-- unsorted bin header <-> free chunk A <-> free chunk B
 |
 |-- small bin[0x20] header <-> free chunk C <-> free chunk D
 |
 |-- small bin[0x30] header <-> free chunk E
 |
 |-- small bin[0x40] header
 |
 |-- ...
 |
 |-- large bin header <-> free chunk F <-> free chunk G
 |
 |-- large bin header <-> free chunk H
 |
 |-- ...
```

glibc 会给每个 bin 设置一个 **bin header**，让链表变成双向循环链表：

```
bin header <-> chunk A <-> chunk B <-> chunk C <-> bin header
```

**`bins` 数组真实存的是每个 `bin header` 的 fd/bk。**

如下面所示：

```
bins[0]   bins[1]   bins[2]   bins[3]   bins[4]   bins[5]
  |         |         |         |         |         |
bin1.fd   bin1.bk   bin2.fd   bin2.bk   bin3.fd   bin3.bk
```

可以看到，bin2 的 `prev_size`、`size` 和 bin1 的 `fd`、`bk` 是重合的。由于我们只会使用 `fd` 和` bk `来索引链表，所以该重合部分的数据其实记录的是 bin1 的 `fd`、`bk`。 也就是说，虽然后一个 bin 和前一个 bin 共用部分数据，但是其实记录的仍然是前一个 bin 的链表数据。通过这样的复用，可以节省空间。

数组中的 bin 依次如下

1. 第一个为 unsorted bin，字如其面，这里面的 `chunk` 没有进行排序，存储的 `chunk` 比较杂。
2. 索引从 2 到 63 的 bin 称为 small bin，同一个 small bin 链表中的 `chunk` 的大小相同。两个相邻索引的 small bin 链表中的 `chunk` 大小相差的字节数为 **2 个机器字长**，即 32 位相差 8 字节，64 位相差 16 字节。
3. small bins 后面的 bin 被称作 large bins。large bins 中的每一个 bin 都包含一定范围内的 chunk，其中的 chunk 按 fd 指针的顺序从大到小排列。相同大小的 chunk 同样按照最近使用顺序排列。

#### fastbin

大多数程序经常会申请以及释放一些比较小的内存块, `fastbin` 是 glibc malloc 中专门管理“小尺寸空闲 chunk”的快速链表。

**不同大小的 fastbin chunk 会进入不同的 fastbin 链表**,它是 `malloc_state` 结构里的另一个单独数组，叫：`fastbinsY`

为了更加高效地利用 fast bin，glibc 采用单向链表对其中的每个 bin 进行组织，并且**每个 bin 采取 LIFO 策略**，最近释放的 `chunk` 会更早地被分配，所以会更加适合于局部性。也就是说，当用户需要的 `chunk` 的大小小于 fastbin 的最大大小时， ptmalloc 会首先判断 fastbin 中相应的 bin 中是否有对应大小的空闲块，如果有的话，就会直接从这个 bin 中获取 chunk。如果没有的话，ptmalloc 才会做接下来的一系列操作。

默认情况下（**32 位系统为例**）， fastbin 中默认支持最大的 `chunk` 的数据空间大小为 64 字节。但是其可以支持的 chunk 的数据空间最大为 80 字节。除此之外， fastbin 最多可以支持的 bin 的个数为 10 个，从数据空间为 8 字节开始一直到 80 字节（注意这里说的是数据空间大小，也即除去 prev_size 和 size 字段部分的大小）

**`fastbin` 最大的特点：不立即合并**, 如果有空闲的小`chunk`,`fastbin` 选择先简单粗暴地挂进链表，后面有需要再统一整理。

并且 `fastbin chunk` 的 PREV_INUSE 位通常仍然保持为 1

假设有两个相邻 chunk：

```
+---------+---------+
| chunk A | chunk B |
+---------+---------+
```

如果 `A` 被 free 到 fastbin，`B` 的 `PREV_INUSE` 位通常不会立刻被清零。

也就是说，虽然 `A` 已经空闲了，但从 `B` 的角度看：

**前一个 `chunk` 仍然像是在使用中**

现代 glibc 里还有一个更快的结构：`tcache`,小 `chunk` 被 free 后会**优先进入 tcache**,当`tache`满了之后才可能进入fastbin

`malloc_consolidate()`方法会把 `fastbin` 中的 `chunk` 取出来，和相邻空闲 `chunk `合并，然后放入 `unsorted bin`。

#### smallbin

`smallbin` 也是 glibc malloc 中用来管理“中小尺寸空闲 chunk”的**双向循环链表**。

它比 `fastbin` 更“正规”：**smallbin 里的 chunk 通常已经完成合并，不会和物理相邻的空闲 chunk 独立并存。**

`smallbin` 管理的是**固定大小的一类空闲 chunk**。

每个 `chunk` 的大小与其所在的 bin 的 index 的关系为：**chunk_size = 2 * SIZE_SZ *index**，具体如下

| 下标 | SIZE_SZ=4（32 位） | SIZE_SZ=8（64 位） |
| :--- | :----------------- | :----------------- |
| 2    | 16                 | 32                 |
| 3    | 24                 | 48                 |
| 4    | 32                 | 64                 |
| 5    | 40                 | 80                 |
| x    | 2 * 4 * x          | 2 * 8 * x          |
| 63   | 504                | 1008               |

此外，**small bins 中每个 bin 对应的链表采用 FIFO 的规则**，所以同一个链表中先被释放的 `chunk` 会先被分配出去。

#### largebin

large bins 中一共包括 63 个 bin，每个 bin 中的 `chunk` 的大小不一致，而是处于一定区间范围内。此外，这 63 个 bin 被分成了 6 组，每组 bin 中的 `chunk` 大小之间的公差一致，

比如如果第一个 large bin 的起始 `chunk` 大小为 512 字节，位于第一组，所以该 bin 可以存储的 `chunk` 的大小范围为 [512,512+64)。

这里我们只关心64位的分布吗，这里的 `sz` 是 **chunk size（包含chunk head）** ，单位是字节。

| 分支 | 判断条件           | 实际 `sz` 范围      | 返回的 bin index   | index 范围  | 粒度      |
| ---- | ------------------ | ------------------- | ------------------ | ----------- | --------- |
| 1    | `(sz >> 6) <= 48`  | `0x400 ~ 0xc3f`     | `48 + (sz >> 6)`   | `64 ~ 96`   | `0x40`    |
| 2    | `(sz >> 9) <= 20`  | `0xc40 ~ 0x29ff`    | `91 + (sz >> 9)`   | `97 ~ 111`  | `0x200`   |
| 3    | `(sz >> 12) <= 10` | `0x2a00 ~ 0xafff`   | `110 + (sz >> 12)` | `112 ~ 120` | `0x1000`  |
| 4    | `(sz >> 15) <= 4`  | `0xb000 ~ 0x27fff`  | `119 + (sz >> 15)` | `120 ~ 123` | `0x8000`  |
| 5    | `(sz >> 18) <= 2`  | `0x28000 ~ 0xbffff` | `124 + (sz >> 18)` | `124 ~ 126` | `0x40000` |
| 6    | 以上都不满足       | `>= 0xc0000`        | `126`              | `126`       | 超大范围  |

#### Unsorted Bin

unsorted bin 处于我们之前所说的 bin 数组下标 1 处。故而 unsorted bin 只有一个链表。unsorted bin 中的空闲 `chunk` 处于乱序状态，主要有两个来源

- 当一个较大的 `chunk` 被分割成两半后，如果剩下的部分大于 MINSIZE，就会被放到 unsorted bin 中。
- 释放一个不属于 fast bin 的 chunk，并且该 `chunk` 不和 top `chunk` 紧邻时，该 `chunk` 会被首先放到 unsorted bin 中。关于 top `chunk` 的解释，请参考下面的介绍。

此外，Unsorted Bin 在使用的过程中，采用的遍历顺序是 **FIFO** 。

#### top chunk

程序第一次进行 malloc 的时候，heap 会被分为两块，一块给用户，剩下的那块就是 top chunk。其实，所谓的 top `chunk` 就是处于当前堆的物理地址最高的 chunk。这个 `chunk` 不属于任何一个 bin，它的作用在于当所有的 bin 都无法满足用户请求的大小时，如果其大小不小于指定的大小，就进行分配，并将剩下的部分作为新的 top chunk。否则，就对 heap 进行扩展后再进行分配。在 main arena 中通过 sbrk 扩展 heap，而在 thread arena 中通过 mmap 分配新的 heap。

需要注意的是，top `chunk` 的 prev_inuse 比特位始终为 1，否则其前面的 chunk 就会被合并到 top chunk 中。

**初始情况下，我们可以将 unsorted `chunk` 作为 top chunk。**

### 宏观结构 arena

#### arena

**一套堆内存管理器的数据结构**，里面保存了 bins、top chunk、fastbins、unsorted bin 等信息，用来管理一片或多片 heap 区域。

无论是主线程还是新创建的线程，在第一次申请内存时，都会有独立的 arena。

 arena 的核心结构：`malloc_state`

该结构用于管理堆，记录每个 arena 当前申请的内存的具体状态，比如说是否有空闲 chunk，有什么大小的空闲 chunk 等等。无论是 thread arena 还是 main arena，它们都只有一个 malloc state 结构。由于 thread 的 arena 可能有多个，malloc state 结构会在最新申请的 arena 中。

**注意，main arena 的 malloc_state 并不是 heap segment 的一部分，而是一个全局变量，存储在 libc.so 的数据段。**

```c
struct malloc_state {
    /* Serialize access.  */
    __libc_lock_define(, mutex);

    /* Flags (formerly in max_fast).  */
    int flags;

    /* Fastbins */
    mfastbinptr fastbinsY[ NFASTBINS ];

    /* Base of the topmost chunk -- not otherwise kept in a bin */
    mchunkptr top;

    /* The remainder from the most recent split of a small request */
    mchunkptr last_remainder;

    /* Normal bins packed as described above */
    mchunkptr bins[ NBINS * 2 - 2 ];

    /* Bitmap of bins, help to speed up the process of determinating if a given bin is definitely empty.*/
    unsigned int binmap[ BINMAPSIZE ];

    /* Linked list, points to the next arena */
    struct malloc_state *next;

    /* Linked list for free arenas.  Access to this field is serialized
       by free_list_lock in arena.c.  */
    struct malloc_state *next_free;

    /* Number of threads attached to this arena.  0 if the arena is on
       the free list.  Access to this field is serialized by
       free_list_lock in arena.c.  */
    INTERNAL_SIZE_T attached_threads;

    /* Memory allocated from the system in this arena.  */
    INTERNAL_SIZE_T system_mem;
    INTERNAL_SIZE_T max_system_mem;
};
```

- fastbinsY[NFASTBINS]
  - 存放每个 fast `chunk` 链表头部的指针
- top
  - 指向分配区的 top chunk
- last_reminder
  - 最新的 `chunk` 分割之后剩下的那部分
- bins
  - 用于存储 unstored bin，small bins 和 large bins 的 `chunk` 链表。
- binmap
  - ptmalloc 用一个 bit 来标识某一个 bin 中是否包含空闲 `chunk` 。

#### heap_info

`heap_info` 主要用于 **非主 arena，也就是 non-main arena**，用来记录这片 heap 属于哪个 arena，以及这片 heap 和其他 heap 之间的关系。

对于 non-main arena，一片 heap 大概长这样：

```
mmap 出来的 heap 区域
低地址
+----------------------+
| heap_info            |
+----------------------+
| 第一个 chunk          |
+----------------------+
| 第二个 chunk          |
+----------------------+
| free chunk / used    |
+----------------------+
| top chunk            |
+----------------------+
高地址
```

`heap_info`的结构如下

```c

typedef struct _heap_info
{
  mstate ar_ptr; /* Arena for this heap. */
  struct _heap_info *prev; /* Previous heap. */
  size_t size;   /* Current size in bytes. */
  size_t mprotect_size; /* Size in bytes that has been mprotected
                           PROT_READ|PROT_WRITE.  */
  /* Make sure the following data is properly aligned, particularly
     that sizeof (heap_info) + 2 * SIZE_SZ is a multiple of
     MALLOC_ALIGNMENT. */
  char pad[-6 * SIZE_SZ & MALLOC_ALIGN_MASK];
} heap_info;
```

该结构主要是描述堆的基本信息，包括

- 堆对应的 arena 的地址
- 由于一个线程申请一个堆之后，可能会使用完，之后就必须得再次申请。因此，一个线程可能会有多个堆。prev 即记录了上一个 heap_info 的地址。这里可以看到每个堆的 heap_info 是通过单向链表进行链接的。
- size 表示当前堆的大小
- 最后一部分确保对齐

`heap_info`给我的感觉像是链接`chunk`和`arena`的中间人
