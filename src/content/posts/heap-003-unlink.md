---
title: "想要成为 heap 高手（3）：unlink"
description: "从 unlink 的触发位置、双向链表摘除过程到现代 glibc 的完整性检查。"
date: 2026-06-04
tags:
  - rust
  - LCSUFG
cover: "/covers/heap-003-cover.png"
series: "想要成为 heap 高手"
day: 1003
draft: false
---
## 想要成为heap高手（3） unlink

- malloc
  - 从恰好大小合适的 large bin 中获取 chunk。
    - **这里需要注意的是 fastbin 与 small bin 就没有使用 unlink，这就是为什么漏洞会经常出现在它们这里的原因。**
    - 依次遍历处理 unsorted bin 时也没有使用 unlink 。
  - 从比请求的 chunk 所在的 bin 大的 bin 中取 chunk。
- free
  - 后向合并，合并物理相邻低地址空闲 chunk。
  - 前向合并，合并物理相邻高地址空闲 chunk（除了 top chunk）。
- malloc_consolidate
  - 后向合并，合并物理相邻低地址空闲 chunk。
  - 前向合并，合并物理相邻高地址空闲 chunk（除了 top chunk）。
- realloc
  - 前向扩展，合并物理相邻高地址空闲 chunk（除了 top chunk）。

### small bin unlink过程

```
一、unlink 前

        BK                  P                  FD
+---------------+   +---------------+   +---------------+
| prev_size     |   | prev_size     |   | prev_size     |
| size          |   | size          |   | size          |
| fd ---------- |-->| fd ---------- |-->| fd            |
| bk            |<--| bk            |<--| bk ---------- |
| unused bytes  |   | unused bytes  |   | unused bytes  |
+---------------+   +---------------+   +---------------+

链表关系：

        fd              fd
BK ------------> P ------------> FD

        bk              bk
BK <------------ P <------------ FD


此时：

P->fd = FD
P->bk = BK
```

```
二、取出 P 的前后节点

FD = P->fd
BK = P->bk


        BK                  P                  FD
+---------------+   +---------------+   +---------------+
| prev_size     |   | prev_size     |   | prev_size     |
| size          |   | size          |   | size          |
| fd ---------- |-->| fd ---------- |-->| fd            |
| bk            |<--| bk            |<--| bk ---------- |
| unused bytes  |   | unused bytes  |   | unused bytes  |
+---------------+   +---------------+   +---------------+

也就是：

FD 指向 P 后面的 chunk
BK 指向 P 前面的 chunk
```

```
三、执行 FD->bk = BK

把 FD 的 bk 指针改为 BK：

        BK                  P                  FD
+---------------+   +---------------+   +---------------+
| prev_size     |   | prev_size     |   | prev_size     |
| size          |   | size          |   | size          |
| fd ---------- |-->| fd ---------- |-->| fd            |
| bk            |<--| bk            |   | bk ---------- |
| unused bytes  |   | unused bytes  |   | unused bytes |
+---------------+   +---------------+   +-------|-------+
                                                    |
                                                    |
                                                    v
                                                   BK

链表关系变成：

BK ------------> P ------------> FD
^                                |
|                                |
+------------- FD->bk = BK ------+
```

### unsafe unlink 的典型触发场景

最经典的场景是 **堆溢出覆盖后一个 chunk 的 chunk header**。

假设有两个相邻 chunk：

```
chunk A | chunk B
```

其中 `chunk A` 存在溢出，可以覆盖 `chunk B` 的头部。

攻击者伪造：

```
B->prev_size
B->size
fake_chunk->fd
fake_chunk->bk
```

然后让 glibc 误以为：

```
B 前面的 chunk 是 free 状态
```

也就是清掉 `B->size` 里的 `PREV_INUSE` 位。

当程序执行：

```
free(B);
```

glibc 会检查到：

```
B 的前一个 chunk 是空闲的
```

于是它会向前合并：

```
prev_chunk + B
```

而在合并前，glibc 需要把前一个 free chunk 从 bin 链表中摘出来：

```
unlink(prev_chunk);
```

如果这个 `prev_chunk` 是攻击者伪造的 fake chunk，那么就会触发 unsafe unlink。

glibc 在 free 合并前后相邻空闲 chunk 时确实会调用 `unlink_chunk`，例如向后找到前一个 chunk 后执行 unlink，以及向前合并 next chunk 时也会 unlink。

### 现代 glibc 的 unlink 检查

检查一：size 与 prev_size 是否匹配

现代 glibc 会检查：

```
chunksize(P) == prev_size(next_chunk(P))
```

也就是：

```
当前 chunk P 的 size
必须等于
下一个物理相邻 chunk 的 prev_size
```

图示：

```
        P                         next_chunk(P)
+---------------+          +----------------------+
| prev_size     |          | prev_size            |
| size = 0x100  |--------->| should be 0x100      |
| fd            |          | size                 |
| bk            |          | ...                  |
+---------------+          +----------------------+
```

检查二：双向链表完整性检查

会检查：

```
FD = P->fd;
BK = P->bk;

if (FD->bk != P || BK->fd != P)
    malloc_printerr("corrupted double-linked list");
```

也就是说，glibc 要确认：

```
P->fd->bk == P
P->bk->fd == P
```

图示：

```
正常链表：

BK <-------> P <-------> FD

必须满足：

FD->bk == P
BK->fd == P
```

检查三：large bin 的 nextsize 检查

如果是 large bin，除了普通的：

```
fd / bk
```

还有：

```
fd_nextsize / bk_nextsize
```

所以 large bin unlink 还要检查：

```
P->fd_nextsize->bk_nextsize == P
P->bk_nextsize->fd_nextsize == P
```
