---
title: "Cordis: A Programming Paradigm for Spatiotemporal Composability 阅读笔记"
description: "从插件系统与自进化 harness 的运行时装卸难题出发：Cordis 用可逆效应、响应式协效应与上下文范式，把时空可组合性从类型系统搬进运行时。"
date: 2026-11-01
tags:
  - 笔记
  - Agent
  - 架构
---

最近在想学习一下`Deepseek harness`，于是把这篇技术基础的论文翻出来读了读

## 研究问题

问题背景是现代软件的**插件系统**以及**自进化harness**需要在*运行时*装卸组件。

其中涉及到**时间可组合性（temporal composability）**和**空间可组合性（spatial composability）**问题。

以我的理解，时间可组合性讲述的是移除组件时需要完全移除它的作用的能力，空间组合性则是讲述的是每个组件间相互依赖的能力。

论文形式化了**响应式协效应（reactive coeffects）**

这里解释一下什么是*effect*和*coeffect*

> 效应 / 协效应 effect / coeffect
> 效应：计算对环境做什么（状态、异常、IO）；协效应：计算需要环境提供什么（资源、权限、服务）。

![效应与协效应：一个管「对环境做了什么」，一个管「需要环境提供什么」，分别对应时间与空间可组合性](/images/cordis-reading-notes/effect-coeffect.png)

通过构建出响应式协效应，解决了单一组件的空间可组合性问题，进一步，通过把效应与协效应规范为上下文范式，把时空可组合性从单个组件推广到交错组件构成的整个系统。

简单来说，就像你`VS Code`装插件每次安装卸载基本上要触发一次进程级别的重启，但是对于一些大型系统，这样的代价过于昂贵。在卸载插件时，也会出现依赖卸载不干净的情况。

## 可逆效应与响应式协效应

具体的形式化证明步骤在此文中省略，这里我谈谈自己的感受。

论文定义了效应的**逆：将状态还原到“应用它的上一个状态”**，使用了一个上下文范式当作每次状态的记录，我们称之为**撤销存折**。

主要靠以下两个操作实现：
- track：应用效应 f 的同时，把它的逆 g 攒进存折
- recover：把存折一次性花掉，回到初始状态，存折清零。

![撤销存折：track 把每个效应的逆按 LIFO 攒进存折，recover 从栈顶依次花掉，回到初始状态](/images/cordis-reading-notes/undo-ledger.png)

注意，这里的定义实际上是很弱的，逆只要求还原到上一个状态，而不是处处可逆。总结就是：
> LIFO 是单组件内部的事；跨组件时，独立（可交换）的效应可以任意序撤销、互不波及，不可交换的纠缠（提供-依赖）则由守卫和协效应把顺序排对——全套机制的目标就是让“拔 A”永远不必劳驾 B 和 C。

并且这里论文引出了一个概念叫**观测等价**：我们这里的可逆是针对行为来的，就好比`free`释放内存块但恢复不了堆布局，这里的要求为：**两个状态在任何观察者眼里不可区分**

响应式协效应则让**满足状态的每次翻转都能在效应边界上被观测到**，协效应上下文就是一个带类型的依赖表，而协效应操作本来就是可逆效应。

**这样就使得组件只在满足其规格的状态上激活，且每一次上下文变化都会被检查。**

我自己读到这里有一种银行家算法的感觉，我觉得两者像的地方，来自于对环境资源能否满足行为的预先估计？

## 上下文范式与独立性

论文把效应上下文统一成范式，简单来说就是：
- 组件与环境之间的每次交互都经过这一个统一上下文
- 任何需要跨组件共享的状态都可以编码成一个依赖
- 每一个组件需要自带一个操作集，这个操作集确保组件读不到没有阶段的键、碰不到没有键绑定的位置

而独立性则是在说明我刚刚提到的问题，就是针对一个组件的逆在别的组件的后续效应还挂着时被执行（从运行系统里拔掉一个组件），以及多个组件的效应交错在同一序列里。

所谓满足独立性就是满足交换性，只要满足每个变换互相交换位置，结果不变，那么我们就可以说他们是满足独立性的。
而交换性跟之前的可逆性一样，都需要消费者自己提供：
> 每个 witness 认证其消费者本需自行假设的条件——逆在该点还原、操作两两交换——且都在定义处提供，而不是在使用处检查。

![独立性=可交换：独立效应交换顺序殊途同归；提供-依赖的纠缠则由 guard 排好卸载顺序](/images/cordis-reading-notes/independence-commute.png)

## 实现与落地

论文用`cordis`以及`koishi`作为论文实际落地的产物，核心函数如下：

``` typescript
async function execute(callback, guard) {
  const iter = callback()            // generator = 效应迭代器 ℑ
  let inverse = noOp                 // 存折 φ，初始为 id
  while (guard()) {                  // 每步迭代前查 guard（对应 L-Iter 的前提）
    const { value, done } = await iter.next()
    if (value) inverse = seq(value, inverse)  // 新逆排最前 → 撤销时 LIFO
    if (done) break                  // 迭代结束 = 装载完成（L-Finish）
  }
  return inverse                     // 这就是"花存折"= recover
}
```

这里的`execute`其实就是我上面说的整个流程，组件要做的每件事写在 generator 里，每做一件事，当场 yield 出这件事的逆。运行时只做一件事：把逆按 LIFO 攒进“存折”。

![组件生命周期状态机：L-Begin 进入 Reloading，L-Iter 逐条攒逆，L-Finish 落地 Active；卸载走 L-Leave/L-Divert 汇入 Unloading，最后 L-Unload 应用存折（图源：论文 Figure 1）](/images/cordis-reading-notes/component-lifecycle.png)

核心结构**组件**的定义如下：

``` typescript
const DatabaseDriver = {
  inject:  [],                 // d：我需要什么
  provide: ['database'],       // p：我可能提供什么键
  apply: function* (ctx, config) {
    const pool = createPool(config.url)

    ctx.set('database', pool)  // 内部展开就是一次 ctx.effect（Algorithm 2）：
                              //   装：  store['database'] = pool
                              //         notify(ctx, ['database'])
                              //   逆：  delete store['database']
                              //         notify(ctx, ['database'])

    const ka = setInterval(() => pool.ping(), 30_000)   // 自己的其他效应
    yield () => clearInterval(ka)
  }
}
```
也就是论文的 (d, p, e) 三元组。

大致读完之后，其实我最大的想法是这篇论文确确实实给了我们一套运行时替换组件的方法论，有点像*忒修斯之船*那个典故。

我想起之前看过一个视频是在说在agent时代，我们的code view该怎么进行 [bilibili](https://www.bilibili.com/video/BV1mRn66JERc)

里面提到的就是不要人看和改，而是直接生成，因为机器生成代码的成本现在已经很低，而且之后会越来越低，

那么这中间就会存在一个设施基础，就是代码版本的快速回退。作者举了claude团队的例子，几十个人的团队一个月怎么看的过来上万次的提交。

而这个设施基础，我的感觉就是和上面的`cordis`很像呐~

注：图片由上传时的ai寻找或生成。
