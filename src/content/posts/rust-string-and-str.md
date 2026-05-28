---
title: "每天学习一点计算机，直到我找到对象  RUST篇 Day3：`String` 和 `&str`，为什么新人总分不清？"
description: "用字符串所有权和字符串切片解释 String 与 &str 的分工。"
date: 2026-05-27
tags:
  - LCSUFG
  - Rust
cover: "/covers/003-cover.png"
series: "RUST篇"
day: 3
legacyUrl: "/post/mei-tian-xue-xi-yi-dian-ji-suan-ji-%EF%BC%8C-zhi-dao-wo-zhao-dao-dui-xiang-%20%20RUST-pian-%20Day3%EF%BC%9A%60String%60%20-he-%20%60%26str%60%EF%BC%8C-wei-shen-me-xin-ren-zong-fen-bu-qing-%EF%BC%9F.html"
draft: false
---

## 今天记这个

用字符串所有权和字符串切片解释两个常见类型的分工。

## 先给结论

- `String` 拥有字符串内容，可以增长。
- `&str` 是字符串片段的引用，不拥有内容。
- 只读参数通常优先用 `&str`。
- 很多字符串报错，本质上是所有权和借用没分清。

## `String` 是拥有内容的字符串

`String` 通常存放在堆上，长度可以变化，它拥有自己的字符串内容。你可以往里面追加字符，也可以把它移动到另一个变量或函数里。只要记住一句话：`String` 更像一个真正装着文本的容器。

```rust
fn main() {
    let mut name = String::from("Rust");
    name.push_str(" learner");
    println!("{name}");
}
```

## `&str` 是借来看的字符串片段

`&str` 常被叫做字符串切片，它通常是对某段 UTF-8 文本的引用。它不拥有内容，只是指向一段已经存在的字符串数据。写函数参数时，如果只是读取字符串，优先接收 `&str` 往往更灵活，因为 `String` 和字符串字面量都能传进来。

```rust
fn greet(name: &str) {
    println!("hello, {name}");
}

fn main() {
    let owned = String::from("Ferris");
    greet(&owned);
    greet("Rust");
}
```


## 这里容易混

不要为了传参到处写 `.to_string()`。如果函数只是读字符串，先考虑把参数设计成 `&str`。

## 我现在先这样记

- `String` 拥有字符串内容，可以增长。
- `&str` 是字符串片段的引用，不拥有内容。
- 只读参数通常优先用 `&str`。
- 很多字符串报错，本质上是所有权和借用没分清。

这篇先记到这里。下一篇继续看：Rust 的控制流，为什么说它更像“表达式”？。

