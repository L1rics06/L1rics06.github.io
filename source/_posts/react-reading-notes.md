---
title: "ReAct: Synergizing Reasoning and Acting in Language Models 阅读笔记"
description: "回到 Agent 的原点读 ReAct：推理轨迹负责规划与处理异常，动作负责从外部环境收集信息，二者协同缓解事实幻觉与错误传播。"
date: 2026-10-20
tags:
  - 笔记
  - Agent
  - LLM
---

回到AGENT的原点，沉下心来读一读这篇论文
**REACT: SYNERGIZING REASONING AND ACTING IN LANGUAGE MODELS**

## Reason and Act 

原文在`Abstact`中这样写到：

> *reasoning traces help the model induce, track, and update action plans as well as handle exceptions, while actions allow it to interface with and gather additional information from external sources such as knowledge bases or environments*

实际上这就揭露`ReAct`的本质，就是所谓的Reason and Act，利用推理对任务进行规划以及处理异常，在act中收集信息反作用于reason。

也就是看到了下面两种框架的局限性：
- 纯 CoT：所有“事实”都来自模型内部。你看到它说“X 公司成立于 1998 年”，没法判断这是模型记得的真事还是编的。
- Act-only：模型直接输出动作，你看不到它为什么这么做。

常常导致事实幻觉(fact hallucination)以及错误传播(error propagation)

其实用很简单的语言来说，`ReAct`干的事情就是把原先的*observation space*以及*action space*给结合起来了。

也就是说，模型除了能“做事”，还能“说话”——那些从语言空间里抽出来的动作，就叫做 thought（推理轨迹）。

thought 有两个定义性特征：

它不改变外部环境，也不产生 observation 反馈。跑完一个 thought，循环里不会出现新的 Observation，模型直接继续。对比：`Search[X]` 会改变“模型看到了什么”并触发环境回话；Thought: ... 什么都不触发。
它的作用是“整理信息、更新上下文”。这是最容易忽略的一点：一个 thought 本质上是模型往自己的草稿纸上写了一行字，让后续步骤（它们都要重读 c_t）能看到这行字。它改的不是世界，是模型自己的工作记忆。

其实我在读的时候一直在想一个问题，这样记录所谓的`thought`是不是需要大上下文容量,于是我让ai调查了一番，
得到了下面的结果：

> ReAct 的前提不是上下文容量的攀升，上下文在论文里恰恰是被当作“限制”来处理的；它的真正前提是大模型规模带来的涌现推理能力（CoT）、few-shot in-context learning，以及“LLM 能产出 action、环境能回吐 observation”这个闭环。

