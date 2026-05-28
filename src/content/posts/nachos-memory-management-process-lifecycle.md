---
title: "从一个进程的生命周期来看 Nachos 的内存管理"
description: "从 halt.noff 的加载、地址空间创建、模拟 CPU 执行到 TLB miss 处理，梳理 Nachos 的内存管理路径。"
date: 2026-05-28
tags:
  - OS
  - Nachos
cover: "/covers/nachos-memory.png"
series: "操作系统"
draft: false
---

nachos 本质是模拟架构的 `mips` 最简单系统内核

本文意在总结从一个 `halt.noff` 可执行 `mips` 文件出发，从一个进程的生命周期来看 nachos 的内存管理，同时带有个人对操作系统的思考。

### 进程创建

`./nachos -x ../test/halt.noff`

Nachos 启动后，首先进入主函数，也就是 `threads/main.cc`

检测到带有 `-x` 参数在以下判断语句给用户进程命名

```c
	else if (strcmp(argv[i], "-x") == 0) {
	    ASSERT(i + 1 < argc);
	    userProgName = argv[i + 1];
	    i++;
	}
```

并在之后检测如果已有命名，则会为这个进程划分出一个 `AddrSpace` 地址空间对象

```c
    // finally, run an initial user program if requested to do so
    if (userProgName != NULL) {
      AddrSpace *space = new AddrSpace;
      ASSERT(space != (AddrSpace *)NULL);
      if (space->Load(userProgName)) {  // load the program into the space
	space->Execute();              // run the program
	ASSERTNOTREACHED();            // Execute never returns
      }
    }
```

然后 `Load(userProgname)` ：**Load a user program into memory from a file.**

`load` 函数有这样几个功能

1. 打开用户程序文件 读取 NOFF 文件头
2. 计算程序需要的地址空间大小 计算需要多少页
3. 检查物理内存是否够用 把代码段、数据段读入 mainMemory
4. 返回加载成功

`RDATA` 宏表示程序包含了只读数据段

这里我们只关心内存管理，内存大小由如下计算出

```c
size = noffH.code.size + noffH.readonlyData.size + noffH.initData.size +
       noffH.uninitData.size + UserStackSize;
```

如果没有只读数据段，就没有 `noffH.readonlyData.size`

其中 `UserStackSize` 代表用户的栈空间大小，在 `addrspace.h` 中被定义为 `#define UserStackSize 1024 // increase this as necessary!`

```c
numPages = divRoundUp(size, PageSize);
    size = numPages * PageSize;
```

这两个就是在计算需要内存页的数量，以及重新将大小替换成页的整数倍，也就是**内存分页机制**

```cpp
    if (noffH.code.size > 0) {
        executable->ReadAt(
		&(kernel->machine->mainMemory[noffH.code.virtualAddr]), 
			noffH.code.size, noffH.code.inFileAddr);
    }
    if (noffH.initData.size > 0) {
        executable->ReadAt(
		&(kernel->machine->mainMemory[noffH.initData.virtualAddr]),
			noffH.initData.size, noffH.initData.inFileAddr);
    }
```

这两段是将程序载入到内存中，分别对应代码段和初始化变量段，个人感觉有点像 text 段和 bss 段。

同样的 后面也有加载只读段文件，在这里不在赘述。

注意这条注释 `// Note: this code assumes that virtual address = physical address`

这段加载代码假设虚拟地址就等于物理地址。这种写法在最简单的 Nachos 中可以工作，但它有明显问题。

`OpenFile::ReadAt(char *into, int numBytes, int position)`

这个函数的作用是从一个已经打开的文件中，从指定位置 `position` 开始读取 `numBytes` 个字节，把读到的数据放进 `into` 指向的内存缓冲区中。

以下是我个人的思考：NachOS 在将程序载入到内存上同时使用了内存分页技术，至于内存分段，我倒是觉得只调用了读取 `noff` 格式文件的方法。

由此便想到，nachos 在内存安全性上存在很大问题，但 Nachos 的页表项 `TranslationEntry` 里确实有一个字段：

```cpp
bool readOnly;
```

理论上可以把代码页设置成只读。如果用户程序试图写代码页，就可以触发异常。

整个用户程序放进一个**连续的虚拟地址空间**里。

大概结构是：

```text
用户虚拟地址空间
+------------------+
| code / text      |
+------------------+
| initialized data |
+------------------+
| bss              |
+------------------+
| stack            |
+------------------+
```

### 进程执行

由上一步成功程序载入内存后回到 `main.cc` 执行 `space->Execute();`

```c
    kernel->currentThread->space = this;

    this->InitRegisters();		// set the initial register values
    this->RestoreState();		// load page table register

    kernel->machine->Run();		// jump to the user progam

    ASSERTNOTREACHED();			// machine->Run never returns;
```

这里的 `this` 是在 `main.cc` 里面的 `AddrSpace *space = new AddrSpace;`

我们来看看这个 `space`，也就是 `AddrSpace` 类型

```cpp
  TranslationEntry *pageTable; // Assume linear page table translation
                               // for now!
  unsigned int numPages;       // Number of pages in the virtual
                               // address space
```

最核心的就是这两属性，也就是**页表 + 地址空间页数**

```cpp
  bool Load(char *fileName); // Load a program into addr space from
                             // a file
                             // return false if not found

  void Execute(); // Run a program
                  // assumes the program has already
                  // been loaded
```

不仅如此，上文提到的 `Load` 和 `Execute` 都已经封装好了。

这样来理解，其实这个 `Execute()` 其实就干了三件事：

1. 初始化模拟寄存器
2. 将页表和页号载入到全局变量上，也就是 `machine` 这个虚拟 CPU
3. 最后运行 `machine` 的 `run` 方法

现在控制权交给了 `machine`，那我们就来看看这个类，它的声明在 `machine\machine.h` 中

`machine` 注释为 `simulated CPU`，我个人感觉是整个 nachos 最重要的类

他的功能如下：

- CPU 寄存器
- 物理内存指针 `mainMemory`
- 页表 / TLB 地址转换
- 用户指令执行
- 系统调用和异常陷入内核

有 `AddrSpace` 类型相似的方法，也声明像 `Transalte` 一样的重要的系统调用，具体的这里也不再赘述，相信聪明的你加上详细的注释全都能看懂。

### Step by Step

```cpp
void
Machine::Run()
{
    Instruction *instr = new Instruction;  // storage for decoded instruction

	...
        
    kernel->interrupt->setStatus(UserMode);

    for (;;) {
        OneInstruction(instr);
        kernel->interrupt->OneTick();

        if (singleStep && (runUntilTime <= kernel->stats->totalTicks))
            Debugger();
    }
}
```

现在我们终于来到了 `machine::run()` 这个程序一步一步执行的无情机器

**启动 Nachos 模拟 CPU，进入用户态，然后不断取指、译码、执行用户程序指令。**

这里 `Instruction` 对象，用来保存**当前正在执行的用户指令**。

`kernel->interrupt->setStatus(UserMode);` 则是将内核态切换到用户态，由于本文的主题是内存管理，这里就不过多讨论 nachos 的两种状态。

后面的 for 循环则是在无限重复，执行指令，推进模拟时间，调试（如果开启并到达时间）

既然如此，`OneInstruction(instr);` 就可能是我们观察的重点，但涉及到具体指令的执行，内容复杂，并且涉及到 `mips` 指令集，已经超出了我的能力范围，

详细可以自己去看 `machine/mipssim.cc`

大概过程是：

```text
根据 PC 寄存器取出指令
        ↓
通过 Translate 把虚拟地址转成物理地址
        ↓
从 mainMemory 读取指令内容
        ↓
解码成 Instruction
        ↓
执行指令
        ↓
更新寄存器和 PC
```

### TLB

在刚刚提到的 `machine` 类中，我们已经可以看到在新建对象时已经会生成 `tlb` 指针

```cpp
    TranslationEntry *tlb;		// this pointer should be considered 
					// "read-only" to Nachos kernel code
```

在 `machine.cc` 中有

```cpp
#ifdef USE_TLB
    tlb = new TranslationEntry[TLBSize];
    for (i = 0; i < TLBSize; i++)
	tlb[i].valid = FALSE;
    pageTable = NULL;
```

说明我们要使用 TLB，先要有 `USE_TLB` 这个宏，那么就要 `build.linux` 目录下 `Makefile` 文件中的 `DEFINES=` 后添加 ` -DUSE_TLB`

同时修改 `machine` 目录下的 `translate.cc` 文件，注释掉 `ASSERT` 函数；因为有 `assert` 就说明不能同时使用页表和 TLB

`1. 在 Nachos 现有页表的基础上，增加 TLB 快表机制，使得在做虚拟地址到物理地址的转换时，优先从 TLB 快表中读取；`

然后最关键的部分来了：**我们要在 `ExceptionHandler` 中处理 TLB miss**

先看有哪些异常，在 `machine.h` 中：

```cpp
enum ExceptionType { NoException,           // Everything ok!
		     SyscallException,      // A program executed a system call.
		     PageFaultException,    // No valid translation found
		     ReadOnlyException,     // Write attempted to page marked 
					    // "read-only"
		     BusErrorException,     // Translation resulted in an 
					    // invalid physical address
		     AddressErrorException, // Unaligned reference or one that
					    // was beyond the end of the
					    // address space
		     OverflowException,     // Integer overflow in add or sub.
		     IllegalInstrException, // Unimplemented or reserved instr.
		     
		     NumExceptionTypes
};
```

**没有单独的 `TLBMissException`**，所以 **TLB miss 会被归类为 `PageFaultException`**

在 `exception.cc` 中的 `case SyscallException:` **后（注意是后不是中**，因为 `PageFaultException` 也是异常的一种，地位与 `SyscallException` 相同）

加上：

```cpp
  case PageFaultException:
	cerr << "Page fault at virtual address " << kernel->machine->ReadRegister(BadVAddrReg) << "\n";
  HandleTLBMiss();
  return;
```

那么为什么是这个 `PageFaultException` 异常，答案藏在 `translate.cc` 中

```cpp
  if (tlb == NULL) { // => page table => vpn is index into table
    
      ......
      
  } else {
    for (entry = NULL, i = 0; i < TLBSize; i++)
      if (tlb[i].valid && (tlb[i].virtualPage == ((int)vpn))) {
        entry = &tlb[i]; // FOUND!
        break;
      }
    if (entry == NULL) { // not found
      DEBUG(dbgAddr, "Invalid TLB entry for this virtual page!");
      return PageFaultException; // really, this is a TLB fault,
                                 // the page may be in memory,
                                 // but not in the TLB
    }
  }
```

我们忽略没有 TLB 的情况，可以清楚地看到，程序会优先调用 TLB 来寻找内存块，如果没有找到，就会返回 `PageFaultException`

**就等于说，其实 nachos 已经预留了 TLB 正常工作的方法，而且你是要处理 TLB 异常的情况，也就是没找到的情况**

那么回到 `exception.cc` 中，我们要补全刚刚的 `HandleTLBMiss();` 函数来处理 `PageFaultException`

```cpp
static int nextTLBVictim = 0;

static int NRUvictim(TranslationEntry *pageTable, unsigned int pageTableSize)
{
    // 先找空项
    for (int i = 0; i < TLBSize; i++) {
        if (!kernel->machine->tlb[i].valid) {
            return i;
        }
    }

    // 找没用的项
    for (int cnt = 0; cnt < TLBSize; cnt++) {
        int i = (nextTLBVictim + cnt) % TLBSize;

        if (!kernel->machine->tlb[i].use) {
            nextTLBVictim = (i + 1) % TLBSize;
            return i;
        }
    }

    // 都用过了，清零前先同步回页表
    for (int i = 0; i < TLBSize; i++) {
        if (kernel->machine->tlb[i].valid) {
            int oldVpn = kernel->machine->tlb[i].virtualPage;

            if (oldVpn >= 0 && (unsigned int)oldVpn < pageTableSize) {
                pageTable[oldVpn].use =
                    pageTable[oldVpn].use || kernel->machine->tlb[i].use;

                pageTable[oldVpn].dirty =
                    pageTable[oldVpn].dirty || kernel->machine->tlb[i].dirty;
            }
        }

        kernel->machine->tlb[i].use = false;
    }

    // 轮转选择 victim
    int victim = nextTLBVictim;
    nextTLBVictim = (nextTLBVictim + 1) % TLBSize;

    return victim;
}

static void HandleTLBMiss()
{
    int badVAddr = kernel->machine->ReadRegister(BadVAddrReg);
    unsigned int vpn = (unsigned int)badVAddr / PageSize;

    TranslationEntry *pageTable = kernel->machine->pageTable;
    unsigned int pageTableSize = kernel->machine->pageTableSize;

    if (kernel->machine->tlb == NULL) {
        cerr << "[TLB] tlb is NULL, but got PageFaultException\n";
        ASSERT(false);
    }

    if (pageTable == NULL) {
        cerr << "[TLB] pageTable is NULL\n";
        ASSERT(false);
    }

    if (vpn >= pageTableSize) {
        cerr << "[TLB] invalid virtual page: vpn = " << vpn
             << ", pageTableSize = " << pageTableSize << "\n";
        ASSERT(false);
    }

    if (!pageTable[vpn].valid) {
        cerr << "[TLB] invalid page table entry, vpn = " << vpn << "\n";
        ASSERT(false);
    }

    // 用 NRU 算法选择一个 victim 来替换
    int victim = NRUvictim(pageTable, pageTableSize);
    

    // 把当前 vpn 的页表项装入 TLB
    kernel->machine->tlb[victim] = pageTable[vpn];
    kernel->machine->tlb[victim].valid = true;

    cout << "[TLB] miss, badVAddr = " << badVAddr
         << ", vpn = " << vpn
         << ", insert tlb[" << victim << "]"
         << ", ppn = " << pageTable[vpn].physicalPage
         << "\n";
}
```

中间可能会有一些头文件错误

```cpp
#include "machine.h"
#include "translate.h"
```

加在 `addspace.h`

TLB 工作流程可以理解为：

```text
用户程序访问虚拟地址
        ↓
Machine::Translate()
        ↓
查 TLB
        ↓
命中：得到物理页号，继续执行
        ↓
未命中：触发 PageFaultException / TLBMissException
        ↓
进入 ExceptionHandler
        ↓
根据 BadVAddrReg 得到出错虚拟地址
        ↓
计算 vpn = badVAddr / PageSize
        ↓
从当前进程 AddrSpace 的 pageTable[vpn] 中取页表项
        ↓
选择一个 TLB 表项替换
        ↓
把 pageTable[vpn] 装入 machine->tlb
        ↓
返回用户态，重新执行刚才的指令
```
