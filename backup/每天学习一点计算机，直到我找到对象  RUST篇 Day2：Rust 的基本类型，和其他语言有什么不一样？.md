# 每天学习一点计算机，直到我找到对象  RUST篇 Day2：Rust 的基本类型，和其他语言有什么不一样？

<!-- cover:start -->
![cover](https://raw.githubusercontent.com/L1rics06/L1rics06.github.io/main/static/covers/002-cover.png)
<!-- cover:end -->


## 今天记这个

上一篇看了 `let` 和 `mut`，今天继续往下走一层：值到底是什么类型。Rust 的类型系统一开始会显得啰嗦，尤其是 `i32`、`u8`、`usize`、`char` 这些名字不像很多语言里的 `int`、`string` 那样随手。但这套命名其实是在提醒我们：数据的范围、大小、编码和能不能失败，都应该尽早说清楚。

## 先给结论

- Rust 的基本标量类型主要包括整数、浮点数、布尔值和字符；复合类型会从元组、数组、切片、字符串这些地方慢慢展开。
- 整数类型的名字同时写出符号和位数：`i32` 是 32 位有符号整数，`u8` 是 8 位无符号整数。
- `isize` 和 `usize` 的位数跟目标平台指针宽度有关，最常见用途是索引、长度和内存大小。
- 没有足够上下文时，整数字面量默认倾向 `i32`，浮点数字面量默认倾向 `f64`。
- Rust 会做类型推断，但推断完成后仍然是静态类型；一个变量不会因为后续赋值突然变成另一种类型。
- `char` 表示 Unicode 标量值，不是一个字节；字符串长度也不能简单等同于“字符个数”。
- Rust 不喜欢偷偷做可能丢信息的隐式转换；跨类型计算通常需要你明确转换。

## 先把类型地图摊开：Rust 不把数字都叫 int

Rust 的基础类型可以先分成两层看：第一层是标量类型，也就是单个值，包括整数、浮点数、布尔值和字符；第二层是复合类型，比如元组、数组、切片、字符串和后面会大量遇到的结构体。今天主要看第一层。很多语言会给你一个很顺手的 `int`，Rust 则把选择摊开：这个整数有没有负数？占多少位？是拿来计数、索引，还是拿来和外部协议对齐？这些信息在类型名里就能看出来。

```rust
fn main() {
    let signed: i32 = -42;        // signed integer: 可以表示负数
    let unsigned: u32 = 42;       // unsigned integer: 只能表示非负数
    let index: usize = 3;         // 常用于长度和索引
    let ratio: f64 = 0.75;        // 默认浮点数通常是 f64
    let ready: bool = true;
    let mark: char = '好';

    println!("{signed}, {unsigned}, {index}, {ratio}, {ready}, {mark}");
}
```

## 整数名字里的 `i`、`u` 和数字，都是边界

`i8`、`i16`、`i32`、`i64`、`i128`、`isize` 是有符号整数；`u8`、`u16`、`u32`、`u64`、`u128`、`usize` 是无符号整数。`i` 可以表示负数，`u` 只能表示零和正数。后面的数字表示位数，位数越大，能表示的范围越大。比如 `u8` 只有 8 位，所以范围是 0 到 255；`i8` 同样 8 位，但要留一部分给负数，所以范围是 -128 到 127。学习阶段不用把每个范围都背下来，但要养成一个直觉：类型不是装饰，它决定值能不能放得下。

```rust
fn main() {
    let max_u8 = u8::MAX;
    let min_i8 = i8::MIN;
    let max_i8 = i8::MAX;

    println!("u8 max = {max_u8}");
    println!("i8 range = {min_i8}..={max_i8}");

    let small: u8 = 250;
    let bigger = u16::from(small) + 10;
    println!("bigger = {bigger}");
}
```

## `usize`：索引和长度为什么有自己的类型

`usize` 很容易让新人困惑。它不是“更普通的整数”，而是和平台指针宽度一致的无符号整数。在 64 位平台上通常是 64 位，在 32 位平台上通常是 32 位。它最常见的场景是集合长度、数组下标、切片索引、内存大小。`Vec::len()` 返回 `usize`，不是 `u32` 或 `i32`，因为理论上一个进程能处理的内存范围跟平台有关。这个设计很实际：索引不能是负数，长度也不能是负数，所以用无符号；同时它又要足够表达当前平台能寻址的大小。

```rust
fn main() {
    let names = ["Rust", "Go", "Python"];
    let len: usize = names.len();

    for index in 0..len {
        println!("{index}: {}", names[index]);
    }
}
```

## 浮点数：默认 `f64`，但别拿它做精确金额

Rust 有两种主要浮点数：`f32` 和 `f64`。如果你写 `let x = 3.14;`，没有别的上下文时通常推断成 `f64`。浮点数适合表示测量值、比例、坐标、概率这类允许近似的数据，不适合直接表示必须精确到分的金额。不是 Rust 特别奇怪，而是二进制浮点数本来就不能精确表示很多十进制小数。Rust 不会替你掩盖这个事实。

```rust
fn main() {
    let a = 0.1_f64;
    let b = 0.2_f64;
    let c = a + b;

    println!("{c:.17}");
    println!("equal to 0.3? {}", c == 0.3);
}
```

## `bool` 很小，但它经常决定分支是否清楚

`bool` 只有两个值：`true` 和 `false`。Rust 不会把整数自动当作布尔值，所以 `if 1 { ... }` 这种写法不成立。这个限制看起来少了一点便利，但换来的是条件表达式更明确：判断必须真的产生一个布尔值。写业务条件时，这反而能减少“这个数字到底代表状态、数量还是真假”的含糊。

```rust
fn main() {
    let score = 82;
    let passed = score >= 60;

    if passed {
        println!("pass");
    } else {
        println!("retry");
    }
}
```

## `char` 不是一个字节，字符串也不是字符数组

Rust 的 `char` 表示 Unicode 标量值，占 4 个字节；字符串 `str` 和 `String` 则是 UTF-8 编码的字节序列。中文、emoji、变音符号这些内容会让“字节数、char 数、用户眼里看到的字符数”变成三件不同的事。比如 `"好".len()` 返回的是 UTF-8 字节数 3，而不是 1。`chars().count()` 能数 Unicode 标量值，但它也不总等于用户眼中的一个完整字形。先记住这一点：处理字符串时别随手按字节切，后面讲 `String` 和 `&str` 会继续展开。

```rust
fn main() {
    let text = "好";
    let emoji = "🦀";

    println!("text bytes = {}", text.len());
    println!("text chars = {}", text.chars().count());
    println!("emoji bytes = {}", emoji.len());
    println!("emoji chars = {}", emoji.chars().count());
}
```

## 类型推断：少写类型，不等于类型变松

Rust 很多时候能推断类型，所以 `let n = 10;` 不用写成 `let n: i32 = 10;`。但推断不是动态类型。编译器只是在编译期把类型补出来，一旦确定，后面就不能变。字面量也会被上下文影响：传给 `takes_u8` 的 `10` 会被理解成 `u8`，传给 `takes_i64` 的 `10` 会被理解成 `i64`。如果上下文不够，或者多个可能都说得通，你就需要手动标注。

```rust
fn takes_u8(value: u8) {
    println!("u8 value = {value}");
}

fn takes_i64(value: i64) {
    println!("i64 value = {value}");
}

fn main() {
    takes_u8(10);
    takes_i64(10);

    let inferred = 42;
    let explicit: u16 = 42;
    println!("{inferred}, {explicit}");
}
```

## 转换要写出来：Rust 不爱偷偷帮你缩放类型

很多语言会在 `u8 + u16`、`int + float` 这类地方自动提升类型。Rust 更谨慎：不同整数类型通常不能直接混算，你需要明确告诉编译器怎么转换。扩大范围时，可以用 `u16::from(value)` 这种清楚的转换；可能丢信息或改变含义时，`as` 虽然能用，但要更小心。等后面遇到 `TryFrom`，还会看到“转换可能失败”也能被写进类型里。

```rust
fn main() {
    let small: u8 = 200;
    let extra: u16 = 55;

    let total = u16::from(small) + extra;
    println!("total = {total}");

    let narrowed = total as u8;
    println!("narrowed = {narrowed}");
}
```

## 学习阶段怎么选类型

初学时可以先用一条朴素规则：普通整数先用默认 `i32`，普通小数先用默认 `f64`，集合长度和索引用 `usize`，需要和文件格式、网络协议、图片像素、二进制数据对齐时再写明确位数，比如 `u8`、`u16`、`u32`。如果一个值不可能为负，也不要立刻把所有东西都改成 `u32`；因为实际计算里经常要和库函数、索引、差值混用，过早使用无符号类型有时会让转换变多。类型选择不是炫技，是让边界更贴近问题。


## 这里容易混

这一篇最容易混的是三件事。第一，`char` 不是一个字节，字符串长度默认说的是 UTF-8 字节数。第二，类型推断不是动态类型，编译器只是帮你在编译期补出类型。第三，`usize` 不是“看起来高级的整数”，它主要服务于长度、索引和平台寻址大小。写练习时少标类型没问题，但一旦涉及边界、外部数据格式、索引和可能溢出的计算，就应该主动把类型讲清楚。

## 我现在先这样记

- Rust 的标量类型包括整数、浮点数、布尔值和字符。
- `i` 表示有符号，`u` 表示无符号，数字表示位数。
- `usize` 常用于长度和索引，大小跟平台指针宽度有关。
- 普通整数字面量默认常见是 `i32`，普通浮点数字面量默认常见是 `f64`。
- Rust 的类型推断发生在编译期，不会让变量变成动态类型。
- `char` 是 Unicode 标量值，字符串是 UTF-8 字节序列。
- 跨类型计算和可能丢信息的转换，要主动写清楚。

这篇先记到这里。下一篇继续看：`String` 和 `&str`，为什么新人总分不清？。

<!-- codex-gmeek-day: 002 -->
<!-- ##{"ogImage":"https://raw.githubusercontent.com/L1rics06/L1rics06.github.io/main/static/covers/002-cover.png"}## -->
