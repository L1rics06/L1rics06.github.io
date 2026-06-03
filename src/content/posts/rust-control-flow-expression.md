---
title: "?????????????????  RUST? Day4?????????????"
description: "? if?loop?while?for ? match?? Rust ?????????????????"
date: 2026-06-03
tags:
  - rust
  - LCSUFG
cover: "/covers/004-cover.png"
series: "?????????????????"
day: 4
draft: false
---

参考来源 The Rust Book 和 ai

### 控制流先分一下

Rust 里面常见的控制流大概就是这几类：

- `if / else if / else`
- `loop`
- `while`
- `for`
- `match`

如果只从长相来看，它们和 C、Java、Python 里的控制流差不多。但是 Rust 这里有一个很重要的点：**很多控制流结构本身就是表达式**。

表达式的意思就是它能算出一个值。比如 `1 + 2` 是表达式，`if score >= 60 { "pass" } else { "fail" }` 在 Rust 里也可以是表达式。

这个点一开始很容易被忽略，因为我们以前经常把 `if` 当成“执行哪一段代码”的语句来看。但在 Rust 里，它还可以直接参与赋值。

### 表达式和语句

先把这两个词分一下：

- **表达式**会产生值。
- **语句**执行动作，但不把一个有用的值交出来。

Rust 里面分号很关键。很多时候，最后一行不加分号就是表达式，加了分号就变成语句，结果也就变成了 `()`。

```rust
fn main() {
    let a = {
        let base = 3;
        base + 2
    };

    let b = {
        let base = 3;
        base + 2;
    };

    println!("a = {a}");
    println!("b = {:?}", b);
}
```

这里 `a` 是 `5`，因为代码块最后一行 `base + 2` 没有分号。`b` 是 `()`，因为 `base + 2;` 已经变成语句了。

可以这样理解：**分号不是单纯的行尾装饰，它会改变这段代码有没有返回值。**

### if 可以直接算出一个值

`if` 在 Rust 里可以写在等号右边。也就是说，它不只是控制分支，还可以把分支结果交给一个变量。

```rust
fn main() {
    let score = 86;

    let level = if score >= 90 {
        "excellent"
    } else if score >= 60 {
        "pass"
    } else {
        "retry"
    };

    println!("level = {level}");
}
```

这里 `level` 最后会拿到某个分支里的字符串切片。

注意这里有一个硬规则：**所有分支返回的类型必须一致**。

```rust
fn main() {
    let ok = true;

    let value = if ok {
        1
    } else {
        0
        // "no"
        // error[E0308]: `if` and `else` have incompatible types
    };

    println!("value = {value}");
}
```

如果一个分支返回整数，另一个分支返回 `&str`，编译器就没法决定 `value` 到底是什么类型。Rust 不会说“那我帮你转一下”，它会直接让你把类型对齐。

### if 条件必须是 bool

Rust 的 `if` 条件必须是 `bool`，不能直接拿整数当真假。

```rust
fn main() {
    let count = 3;

    if count > 0 {
        println!("not empty");
    }

    // if count {
    //     println!("this does not compile");
    // }
    // error[E0308]: expected `bool`, found integer
}
```

这和 C 里面 `if (count)` 的习惯不一样。Rust 这里要求你把判断条件写完整，因为 `3` 本身是数字，不是布尔值。

我感觉这个规则看起来少了一点方便，但能减少很多“这个数字到底是在表示数量还是状态”的含糊。

### loop 是无限循环，但 break 可以带值

`loop` 表示一直循环。它一般需要配合 `break`，否则就真的停不下来。

比较有意思的是，`break` 后面可以带一个值，这个值会成为整个 `loop` 表达式的结果。

```rust
fn main() {
    let mut n = 0;

    let first_square_over_30 = loop {
        n += 1;

        if n * n > 30 {
            break n * n;
        }
    };

    println!("first_square_over_30 = {first_square_over_30}");
}
```

这里 `loop { ... }` 最后不是单纯“执行完”，而是通过 `break n * n` 把值带出来。

也就是说，`loop` 有点像一个不断尝试的计算过程，直到满足某个条件时，顺便把结果返回出来。

### 多层 loop 可以加标签

如果有多层循环，只写 `break` 默认跳出最近的一层。Rust 可以给循环加标签，然后指定要跳出哪一层。

```rust
fn main() {
    let mut row = 0;

    'outer: loop {
        let mut col = 0;

        loop {
            if row == 2 && col == 1 {
                break 'outer;
            }

            col += 1;

            if col >= 3 {
                break;
            }
        }

        row += 1;
    }

    println!("stopped at row = {row}");
}
```

`'outer` 这个写法看起来有点像生命周期标注，但这里它是循环标签。先不用和生命周期混在一起记，只要知道它是给循环起了个名字，方便 `break 'outer` 指定跳出外层循环。

### while 更适合条件循环

如果循环条件很明确，比如“只要 n 还大于 0 就继续”，`while` 会更直观。

```rust
fn main() {
    let mut n = 3;

    while n > 0 {
        println!("{n}");
        n -= 1;
    }

    println!("done");
}
```

`while` 的重点是条件。每轮开始之前先判断，条件为 `true` 才进入循环体。

注意这里 `n -= 1` 需要 `n` 本身是 `mut`。控制流没有绕过变量可变性的规则，该写 `mut` 的地方还是要写。

### for 更适合遍历一组东西

遍历数组、切片、`Vec` 或范围时，`for` 通常比手写下标更稳。

```rust
fn main() {
    let names = ["Rust", "C", "Python"];

    for name in names {
        println!("{name}");
    }

    for index in 0..3 {
        println!("index = {index}");
    }
}
```

`0..3` 是范围，包含 `0, 1, 2`，不包含 `3`。如果想包含右边界，可以写 `0..=3`。

这里我个人更倾向先用 `for item in collection`，少写 `collection[index]`。因为下标很容易写出越界，而直接遍历元素更贴近“我要看每一个值”这件事本身。

如果需要下标，可以用 `enumerate()`：

```rust
fn main() {
    let names = ["Rust", "C", "Python"];

    for (index, name) in names.iter().enumerate() {
        println!("{index}: {name}");
    }
}
```

### match 也是表达式

`match` 可以理解为更强的分支匹配。它不只是判断 `true / false`，而是把一个值的不同形态拆开处理。

先看一个简单的数字匹配：

```rust
fn main() {
    let code = 404;

    let message = match code {
        200 => "ok",
        404 => "not found",
        500 => "server error",
        _ => "unknown",
    };

    println!("{message}");
}
```

这里 `_` 表示兜底分支。Rust 的 `match` 要求把所有可能情况都处理到，所以如果没有 `_`，又没有列完全部情况，就会报“不完整”的错误。

`match` 和 `if` 一样，作为表达式时，每个分支返回的类型也要一致。

### if let 先简单记一下

后面讲 `Option` 和 `Result` 的时候会经常遇到 `match`。但如果只关心其中一种情况，Rust 还有一个比较省事的写法：`if let`。

```rust
fn main() {
    let maybe_name = Some("Ferris");

    if let Some(name) = maybe_name {
        println!("name = {name}");
    } else {
        println!("no name");
    }
}
```

这段代码的意思是：如果 `maybe_name` 刚好是 `Some(name)`，就把里面的 `name` 拿出来用；否则走 `else`。

现在先不用把 `Option` 展开，只要先记住：**Rust 很多分支不是只判断真假，而是在匹配值的形状。**

### 这里容易混

最容易混的是三件事：

1. `if` 可以返回值，但每个分支类型要一样。
2. 分号会把表达式变成语句，返回值会变成 `()`。
3. `loop` 可以用 `break value` 带出结果，但 `while` 和 `for` 更多是用来执行重复流程。

还有一个细节：`if` 条件必须是 `bool`，不能拿整数硬当真假。这个规则和前面基本类型那里是连上的，Rust 会一直要求我们把类型和含义写清楚。

这篇先记到这里。下一篇继续看函数返回值，尤其是为什么 Rust 函数最后一行可以不写 `return`。
