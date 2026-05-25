# 每天学习一点计算机，直到我找到对象  RUST篇 Day1：let 和 mut

<!-- cover:start -->
![cover](https://raw.githubusercontent.com/L1rics06/L1rics06.github.io/main/static/covers/001-cover.png)
<!-- cover:end -->


> ## 写在最前面
>
> 正如名字所言，这个专栏是我模仿 up 主 **Remik1r3n** 的每天安装 Arch，直到我找到对象系列视频。
>
> 得力于现在 agent 强大的自动化功能，我感觉现在做一个每日技术小专栏不是一件很难的事情。
>
> 再加上想逼自己每天学学东西进步一点点，利用碎片化时间每日阅读一点点，于是就有了这个想法。
>
> 需要注意的是，选取的内容是我自己也在学习的东西，所以绝大多数内容是 AI 生成，如果有谬误欢迎指正补充。


## 今天记这个

今天先从最容易遇到的 `let` 和 `mut` 开始。这个点看起来很小，但它会影响后面理解所有权、借用和类型变化，所以值得第一天单独拿出来记。

## 先给结论

- `let` 语句会把一个名字引入当前作用域，名字后面可以跟模式、类型标注和初始化表达式。
- Rust 变量默认不可变。已经把值绑定到名字后，不能直接给这个绑定重新赋值。
- `mut` 写在绑定名字前面，表示这个绑定允许后续赋值；它不改变值的类型。
- 没有用到的普通变量会触发 warning；如果是故意暂时不用，可以用 `_` 或以下划线开头的变量名。
- `let` 不只绑定单个名字，也可以通过模式做解构，例如一次拿出元组里的多个值。
- shadowing 是再次使用 `let` 声明同名变量，本质是新的绑定遮住旧绑定，不是把旧绑定改成可变。
- `const` 不是 `let` 的加强版。常量必须写类型，值必须能在编译期求出，并且不能加 `mut`。

## `let`：先把名字放进作用域

`let score = 10;` 做了两件事：把 `score` 这个名字引入当前作用域，然后把它初始化为 `10`。因为没有写 `mut`，这个绑定默认不可变。这里说的不可变，指的是不能对同一个绑定再次赋值。

```rust
fn main() {
    let score = 10;
    println!("score = {score}");

    // score = 11;
    // error[E0384]: cannot assign twice to immutable variable `score`
}
```

## `mut`：允许同一个绑定被重新赋值

如果确实需要修改，就把 `mut` 写在变量名之前。这样 `score += 1` 才是合法的。注意，`mut` 不是“动态类型”，也不是“随便变”。一个 `i32` 绑定不能因为写了 `mut` 就被赋成字符串。

```rust
fn main() {
    let mut score = 10;
    score += 1;
    println!("score = {score}");

    // score = "ten";
    // error[E0308]: mismatched types
}
```

## 下划线：我知道它暂时没用

Rust 默认会提醒未使用变量，因为“写了但没用”经常意味着逻辑漏了一步。写练习代码时这个 warning 很常见。如果变量确实只是占位，可以写成 `_x`；如果连名字都不想要，可以直接写 `_`。区别是 `_x` 仍然是一个绑定，`_` 更像是把这个位置丢掉。

```rust
fn main() {
    let _draft_title = "let 和 mut";
    let day = 1;

    println!("Day {day}");
}
```

## 解构：`let` 后面可以不是单个名字

`let` 后面接的是模式，所以它可以一次绑定多个名字。下面这个例子里，`a` 默认不可变，`b` 单独写了 `mut`，所以只有 `b` 后面能改。这个写法以后在元组、结构体、枚举和模式匹配里会反复出现。

```rust
fn main() {
    let (a, mut b): (bool, bool) = (true, false);
    println!("a = {a}, b = {b}");

    b = true;
    assert_eq!(a, b);
}
```

## 先声明后初始化：可以，但不能读未初始化的值

Rust 允许先声明变量，再在后面初始化，只要编译器能确认使用前一定已经有值。这个点和“默认不可变”不冲突：不可变绑定不是不能初始化，而是初始化完成后不能再次赋值。

```rust
fn main() {
    let answer: i32;
    answer = 42;
    println!("answer = {answer}");

    // answer = 43;
    // error[E0384]: cannot assign twice to immutable variable `answer`
}
```

## shadowing：同名，但已经是新绑定

Rust 允许再次使用 `let` 声明同名变量。这个行为叫 shadowing。它经常用于“中间值处理完之后继续沿用同一个名字”，比如先拿到字符串，再把它变成长度。这里能改变类型，是因为第二个 `spaces` 已经是新变量了。

```rust
fn main() {
    let spaces = "   ";
    let spaces = spaces.len();
    println!("spaces = {spaces}");

    let mut text = "   ";
    // text = text.len();
    // error[E0308]: expected `&str`, found `usize`
}
```

## 作用域里的 shadowing：里面遮住，出来恢复

shadowing 还会受到作用域影响。花括号里面的 `x` 只在里面有效，出了花括号之后，外层的 `x` 还是外层那个值。这个例子很适合拿来区分“重新绑定”和“修改同一个变量”。

```rust
fn main() {
    let x = 5;
    let x = x + 1;

    {
        let x = x * 2;
        println!("inner x = {x}");
    }

    println!("outer x = {x}");
}
```

## `const`：常量和不可变变量不是一回事

`const` 声明的是常量，必须写类型，命名习惯是全大写加下划线。它的值必须能在编译期求出来。相比之下，`let` 绑定可以接收运行时算出来的值，只是默认不能再次赋值。

```rust
const THREE_HOURS_IN_SECONDS: u32 = 60 * 60 * 3;

fn main() {
    let started_at = std::time::SystemTime::now();
    println!("{started_at:?}, {THREE_HOURS_IN_SECONDS}");
}
```


## 这里容易混

这一篇最容易混的是四件事：`mut` 是修改同一个绑定；shadowing 是创建同名的新绑定；解构是用一个模式同时绑定多个名字；`const` 是编译期常量。它们看起来都和“值会不会变”有关，但语义不一样。`mut` 更适合反复更新同一个状态，shadowing 更适合把一个中间值转换成下一个形态。

## 我现在先这样记

- `let` 把名字引入作用域，默认不可变。
- `mut` 允许同一个绑定被重新赋值，但不能改变绑定的类型。
- `_x` 可以表达“这个变量我暂时不用”，避免未使用变量 warning。
- `let` 后面是模式，所以可以做元组等结构的解构绑定。
- shadowing 使用新的 `let`，所以可以改变类型。
- `const` 必须写类型，值必须能在编译期求出。

这篇先记到这里。下一篇继续补 Rust 的基本类型，把整数、浮点数、布尔值、字符和类型推断放在一起看。

<!-- codex-gmeek-day: 001 -->
<!-- ##{"ogImage":"https://raw.githubusercontent.com/L1rics06/L1rics06.github.io/main/static/covers/001-cover.png"}## -->
