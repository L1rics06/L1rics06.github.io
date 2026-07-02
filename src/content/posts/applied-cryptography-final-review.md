---
title: "应用密码学考前速记"
description: "应用密码学考试前的公式快查和计算题流程速记，覆盖 CRT、GF(2^8)、AES、DES、RSA、ElGamal、ECDSA 与 Shamir 秘密共享等重点。"
date: 2026-07-03
tags:
  - 应用密码学
  - 密码学
  - 复习
cover: "/covers/applied-cryptography-final-review-cover.png"
series: "应用密码学"
draft: false
---

## 1. 公式快查

### 中国剩余定理 CRT

方程组：

$$
x\equiv a_i\pmod {m_i},\quad i=1,2,\ldots,k
$$

若各模数两两互素，则模：

$$
M=m_1m_2\cdots m_k
$$

下有唯一解。

计算步骤：

$$
M_i=\frac{M}{m_i}
$$

$$
y_i=M_i^{-1}\pmod {m_i}
$$

$$
x\equiv \sum_{i=1}^{k}a_iM_iy_i\pmod M
$$

---

## 2. GF(2) 与 GF($2^8$)

### 2.1 GF(2) 运算

元素只有 $0,1$。加法等价于异或：

$$
1+1=0
$$

$$
a+b=a\oplus b
$$

减法等于加法：

$$
a-b=a+b
$$

### 2.2 GF($2^8$) 字节多项式表示

一个字节：

$$
b_7b_6\cdots b_1b_0
$$

对应多项式：

$$
b_7x^7+b_6x^6+\cdots+b_1x+b_0
$$

例如：

$$
0x53=01010011
$$

对应：

$$
x^6+x^4+x+1
$$

### 2.3 AES 不可约多项式

AES 使用：

$$
m(x)=x^8+x^4+x^3+x+1
$$

十六进制为：

$$
0x11B
$$

乘法结果超过 8 位时，要模 $m(x)$ 约简。

### 2.4 xtime 运算

$$
\operatorname{xtime}(a)=a\cdot x
$$

若最高位为 0：

$$
\operatorname{xtime}(a)=a<<1
$$

若最高位为 1：

$$
\operatorname{xtime}(a)=((a<<1)\oplus 0x1B)\ \&\ 0xFF
$$

核心记忆：AES 中乘以 $02$ 就是 xtime。

---

## 3. 古典密码

### 3.3 Hill 密码

加密：

$$
C=KP\bmod 26
$$

解密：

$$
P=K^{-1}C\bmod 26
$$

---

## 4. 分组密码参数



DES Feistel 轮函数：

$$
L_i=R_{i-1}
$$

$$
R_i=L_{i-1}\oplus F(R_{i-1},K_i)
$$

解密与加密结构相同，只是子密钥逆序使用。

### 4.2 三重 DES

常见 EDE 模式：

$$
C=E_{K_3}(D_{K_2}(E_{K_1}(P)))
$$

若 $K_1=K_3$，称为双密钥 3DES。三重 DES 用多次加解密提高安全性。

### 4.3 AES

| AES 类型 | 分组长度 | 密钥长度 | 轮数 |
|---|---:|---:|---:|
| AES-128 | 128 bit | 128 bit | 10 |
| AES-192 | 128 bit | 192 bit | 12 |
| AES-256 | 128 bit | 256 bit | 14 |

AES 是 SPN 结构，不是 Feistel。

每轮主要操作：

1. SubBytes
2. ShiftRows
3. MixColumns
4. AddRoundKey

最后一轮没有 MixColumns。



---

## 6. 公钥密码体制

## 6.1 RSA

### 密钥生成

选择两个大素数：

$$
p,q
$$

计算：

$$
n=pq
$$

$$
\varphi(n)=(p-1)(q-1)
$$

选择 $e$：

$$
\gcd(e,\varphi(n))=1
$$

求 $d$：

$$
d\equiv e^{-1}\pmod {\varphi(n)}
$$

公钥：

$$
(n,e)
$$

私钥：

$$
d
$$

### RSA 加密与解密

$$
C=M^e\bmod n
$$

$$
M=C^d\bmod n
$$

### RSA 签名与验证

签名：

$$
S=H(M)^d\bmod n
$$

验证：

$$
H(M)\stackrel{?}{=}S^e\bmod n
$$

### RSA-CRT 快速解密

先分别模 $p,q$ 计算：

$$
m_p=C^{d\bmod(p-1)}\bmod p
$$

$$
m_q=C^{d\bmod(q-1)}\bmod q
$$

再用 CRT 合并：

$$
M\equiv m_p\pmod p
$$

$$
M\equiv m_q\pmod q
$$

常用合并形式：

$$
q_{inv}=q^{-1}\pmod p
$$

$$
h=(q_{inv}(m_p-m_q))\bmod p
$$

$$
M=m_q+hq
$$

## 6.2 ElGamal 加密

公共参数：

$$
p,\alpha
$$

其中 $p$ 是大素数，$\alpha$ 是模 $p$ 的本原元。

私钥：

$$
d
$$

公钥：

$$
\beta=\alpha^d\bmod p
$$

加密消息 $M$，随机选 $k$：

$$
C_1=\alpha^k\bmod p
$$

$$
C_2=M\beta^k\bmod p
$$

密文：

$$
(C_1,C_2)
$$

解密：

$$
M=C_2(C_1^d)^{-1}\bmod p
$$

因为：

$$
C_1^d=(\alpha^k)^d=\alpha^{kd}=\beta^k
$$

关键条件：随机数 $k$ 不可预测、不可重用。

---

## 7. 椭圆曲线密码 ECC

### 7.1 椭圆曲线方程

素域 $F_p$ 上：

$$
E_p(a,b):y^2\equiv x^3+ax+b\pmod p
$$

要求：

$$
4a^3+27b^2\not\equiv 0\pmod p
$$

### 7.2 判断点是否在曲线上

给点 $P=(x,y)$，代入：

$$
y^2\bmod p \stackrel{?}{=} x^3+ax+b\bmod p
$$

相等则在曲线上。

### 7.3 点加公式

设：

$$
P=(x_1,y_1),\quad Q=(x_2,y_2),\quad P\ne Q
$$

斜率：

$$
\lambda=(y_2-y_1)(x_2-x_1)^{-1}\bmod p
$$

结果 $R=P+Q=(x_3,y_3)$：

$$
x_3=\lambda^2-x_1-x_2\bmod p
$$

$$
y_3=\lambda(x_1-x_3)-y_1\bmod p
$$

### 7.4 倍点公式

若 $P=Q$：

$$
\lambda=(3x_1^2+a)(2y_1)^{-1}\bmod p
$$

$$
x_3=\lambda^2-2x_1\bmod p
$$

$$
y_3=\lambda(x_1-x_3)-y_1\bmod p
$$

### 7.5 ECC 公私钥

基点：$G$  
阶：$n$  
私钥：$d$  
公钥：

$$
Q=dG
$$

安全基础：椭圆曲线离散对数困难问题。已知 $G,Q$，难以求 $d$。

---

## 8. 散列函数与消息鉴别

### 8.1 密码散列函数

$$
h=H(M)
$$

基本性质：

1. 任意长度输入。
2. 固定长度输出。
3. 易计算。
4. 单向性。
5. 弱抗碰撞性。
6. 强抗碰撞性。

### 8.2 攻击复杂度

若散列输出长度为 $n$ bit：

原像攻击：

$$
2^n
$$

第二原像攻击：

$$
2^n
$$

生日攻击：

$$
2^{n/2}
$$

结论：若想达到 128 bit 抗碰撞安全强度，通常需要 256 bit 输出。

### 8.3 常见散列算法参数

| 算法 | 输出长度 | 备注 |
|---|---:|---|
| MD5 | 128 bit | 已不安全 |
| SHA-1 | 160 bit | 不推荐用于抗碰撞场景 |
| SHA-256 | 256 bit | 常用 |
| SM3 | 256 bit | 国密散列算法 |

### 8.4 MAC

生成：

$$
t=MAC_K(M)
$$

$$

$$

作用：完整性 + 消息源鉴别。  
限制：MAC 不能提供抗抵赖性，因为双方共享同一密钥。

### 8.5 CBC-MAC

设消息分组：

$$
M_1,M_2,\ldots,M_n
$$

初始化：

$$
C_0=0
$$

迭代：

$$
C_i=E_K(M_i\oplus C_{i-1})
$$

最终 MAC：

$$
T=C_n
$$

易错点：

1. CBC-MAC 的密钥 $K$ 不能公开。
2. 若密钥公开，攻击者可以自己计算合法 MAC。
3. CBC-MAC 直接用于变长消息不安全。

---

## 9. 数字签名

### 9.1 基本流程

签名：

$$
S=Sign_{sk}(H(M))
$$

验证：

$$
Verify_{pk}(M,S)
$$

提供：完整性、身份认证、抗抵赖性。

### 9.2 RSA 数字签名

签名：

$$
S=H(M)^d\bmod n
$$

验证：

$$
H(M)\stackrel{?}{=}S^e\bmod n
$$

### 9.3 ElGamal 数字签名

公共参数：

$$
p,\alpha
$$

私钥：

$$
d
$$

公钥：

$$
\beta=\alpha^d\bmod p
$$

消息散列：

$$
m=H(M)
$$

随机选择 $k$，要求：

$$
1<k<p-1
$$

$$
\gcd(k,p-1)=1
$$

计算：

$$
r=\alpha^k\bmod p
$$

$$
s=k^{-1}(m-dr)\bmod(p-1)
$$

签名：

$$
(r,s)
$$

验证：

$$
\alpha^m\stackrel{?}{=}\beta^r r^s\bmod p
$$

证明核心：

$$
s\equiv k^{-1}(m-dr)\pmod {p-1}
$$

所以：

$$
ks\equiv m-dr\pmod {p-1}
$$

$$
dr+ks\equiv m\pmod {p-1}
$$

于是：

$$
\beta^r r^s=(\alpha^d)^r(\alpha^k)^s=\alpha^{dr+ks}\equiv \alpha^m\pmod p
$$

易错点：

1. $k$ 必须保密。
2. $k$ 不能重复。
3. $k$ 必须与 $p-1$ 互素。
4. 重复使用同一个 $k$ 会泄露私钥。

### 9.4 ECDSA

公共参数：椭圆曲线 $E$、基点 $G$、阶 $n$。  
私钥：$d$。  
公钥：

$$
Q=dG
$$

消息散列：

$$
e=H(M)
$$

#### 签名过程

随机选 $k$：

$$
1\le k\le n-1
$$

计算：

$$
(x_1,y_1)=kG
$$

$$
r=x_1\bmod n
$$

若 $r=0$，重选 $k$。

计算：

$$
s=k^{-1}(e+dr)\bmod n
$$

若 $s=0$，重选 $k$。

签名：

$$
(r,s)
$$

#### 验证过程

先检查：

$$
1\le r,s\le n-1
$$

计算：

$$
w=s^{-1}\bmod n
$$

$$
u_1=ew\bmod n
$$

$$
u_2=rw\bmod n
$$

计算点：

$$
X=u_1G+u_2Q
$$

若：

$$
X=(x_1,y_1)
$$

验证：

$$
v=x_1\bmod n
$$

$$
v\stackrel{?}{=}r
$$

成立则签名有效。

ECDSA 易错点：

1. $r,s$ 都是模 $n$ 计算。
2. 验证时不是重新计算 $kG$。
3. 验证核心点是 $X=u_1G+u_2Q$。
4. $k$ 不能泄露，不能重复。

---

## 10. Diffie-Hellman 密钥交换

公共参数：

$$
p,\alpha
$$

A 选择私钥 $a$：

$$
A=\alpha^a\bmod p
$$

B 选择私钥 $b$：

$$
B=\alpha^b\bmod p
$$

共享密钥：

$$
K=B^a\bmod p
$$

$$
K=A^b\bmod p
$$

因为：

$$
B^a=(\alpha^b)^a=\alpha^{ab}
$$

$$
A^b=(\alpha^a)^b=\alpha^{ab}
$$

所以：

$$
K=\alpha^{ab}\bmod p
$$

安全基础：离散对数困难问题。  
易错点：普通 DH 不提供身份鉴别，容易受到中间人攻击，必须结合签名、证书或 MAC。

---

## 11. Shamir 秘密共享

### 11.1 $(t,n)$ 门限含义

1. 秘密分成 $n$ 份。
2. 任意 $t$ 份可以恢复秘密。
3. 少于 $t$ 份不能恢复秘密。

### 11.2 构造

秘密为 $S$，选择随机多项式：

$$
f(x)=S+a_1x+a_2x^2+\cdots+a_{t-1}x^{t-1}\pmod p
$$

其中：

$$
f(0)=S
$$

分发份额：

$$
(x_i,f(x_i))
$$

### 11.3 拉格朗日插值恢复秘密

$$
S=f(0)=\sum_{i=1}^{t}y_il_i(0)\pmod p
$$

其中：

$$
l_i(0)=\prod_{j\ne i}\frac{0-x_j}{x_i-x_j}\pmod p
$$

即：

$$
l_i(0)=\prod_{j\ne i}\frac{-x_j}{x_i-x_j}\pmod p
$$

除法转逆元：

$$
\frac{a}{b}\equiv a\cdot b^{-1}\pmod p
$$

---

## 12. 身份鉴别与抗重放



### 12.3 质询-响应抗重放

B 发送随机数：

$$
N_B
$$

A 返回：

$$
MAC_K(N_B)
$$

或：

$$
E_K(N_B)
$$

或：

$$
Sign_A(N_B)
$$

优点：不依赖时钟同步。  
缺点：交互轮次更多。



---

## 13. 序列密码与 LFSR

### 13.1 序列密码

加密：

$$
C_i=P_i\oplus K_i
$$

解密：

$$
P_i=C_i\oplus K_i
$$

密钥流 $K_i$ 不能重复。

若密钥流重复：

$$
C_1=P_1\oplus K
$$

$$
C_2=P_2\oplus K
$$

则：

$$
C_1\oplus C_2=P_1\oplus P_2
$$

会泄露明文关系。

### 13.2 LFSR

状态递推：

$$
s_{i+n}=c_{n-1}s_{i+n-1}\oplus c_{n-2}s_{i+n-2}\oplus\cdots\oplus c_0s_i
$$

特征多项式：

$$
f(x)=x^n+c_{n-1}x^{n-1}+\cdots+c_1x+c_0
$$

最大周期 M 序列：

$$
T=2^n-1
$$

易错点：全 0 初态会一直输出 0，不能作为有效初态。

---

## 14. 综合应用方案模板

### 14.3 机密性 + 完整性 + 鉴别性

推荐 Encrypt-then-MAC：

$$
C=E_{K_1}(M)
$$

$$
T=MAC_{K_2}(C)
$$

发送：

$$
C,T
$$

接收方先验证 MAC，再解密。

### 14.4 抗抵赖性

使用数字签名：

$$
S=Sign_{sk_A}(H(M))
$$

发送：

$$
M,S
$$

验证：

$$
Verify_{pk_A}(M,S)
$$

### 14.5 混合密码体制

1. 随机会话密钥 $K_s$ 加密消息：

$$
C=E_{K_s}(M)
$$

2. 用接收方公钥加密会话密钥：

$$
C_K=E_{pk_B}(K_s)
$$

3. 发送：

$$
C_K,C
$$

若还需要签名：

$$
S=Sign_{sk_A}(H(C))
$$

发送：

$$
C_K,C,S
$$

---

## 15. 考前必背参数表

| 算法 | 分组/输出 | 密钥 | 轮数/特点 |
|---|---:|---:|---|
| DES | 64 bit | 56 bit 有效 | 16 轮 Feistel |
| 3DES | 64 bit | 112/168 bit | EDE |
| AES-128 | 128 bit | 128 bit | 10 轮 SPN |
| AES-192 | 128 bit | 192 bit | 12 轮 |
| AES-256 | 128 bit | 256 bit | 14 轮 |
| SM4 | 128 bit | 128 bit | 32 轮 |
| MD5 | 128 bit | - | 不安全 |
| SHA-1 | 160 bit | - | 不推荐 |
| SHA-256 | 256 bit | - | 常用 |
| SM3 | 256 bit | - | 国密散列 |

---

## 16. 最容易丢分的条件

1. 求逆元前先看：

$$
\gcd(a,n)=1
$$

2. 仿射密码要求：

$$
\gcd(a,26)=1
$$

3. Hill 密码要求：

$$
\gcd(\det K,26)=1
$$

4. ElGamal 签名要求：

$$
\gcd(k,p-1)=1
$$

5. ElGamal / ECDSA 的随机数 $k$ 不能重复。
6. CBC、CFB、OFB、CTR 都要注意 IV/Nonce，尤其 CTR 绝不能重复。
7. MAC 不能抗抵赖，数字签名可以抗抵赖。
8. RSA 私钥是 $d$，ECC 私钥是标量 $d$，ECC 公钥是点 $Q=dG$。
9. DH 本身不鉴别身份，会被中间人攻击。
10. CBC-MAC 的密钥不能公开。
11. RSA 是公钥密码算法，不是分组密码。
12. AES 是 SPN，DES 是 Feistel。
13. ECDSA 验证时计算 $X=u_1G+u_2Q$，不是重新计算 $kG$。

---

## 17. 计算题快速流程

### 17.1 RSA 计算题

1. 计算 $n=pq$。
2. 计算 $\varphi(n)=(p-1)(q-1)$。
3. 检查 $\gcd(e,\varphi(n))=1$。
4. 用扩展欧几里得求 $d=e^{-1}\pmod{\varphi(n)}$。
5. 加密：$C=M^e\bmod n$。
6. 解密：$M=C^d\bmod n$。
7. 若题目要求 CRT，则先模 $p,q$ 分别算，再合并。

### 17.2 ElGamal 签名题

1. 计算公钥：$\beta=\alpha^d\bmod p$。
2. 检查 $\gcd(k,p-1)=1$。
3. 计算 $r=\alpha^k\bmod p$。
4. 计算 $s=k^{-1}(H(M)-dr)\bmod(p-1)$。
5. 验证：$\alpha^{H(M)}\stackrel{?}{=}\beta^r r^s\bmod p$。

### 17.3 ECDSA 计算题

1. 计算公钥：$Q=dG$。
2. 计算 $kG=(x_1,y_1)$。
3. 计算 $r=x_1\bmod n$。
4. 计算 $s=k^{-1}(e+dr)\bmod n$。
5. 验证时算 $w=s^{-1}\bmod n$。
6. 算 $u_1=ew\bmod n$，$u_2=rw\bmod n$。
7. 算 $X=u_1G+u_2Q$。
8. 验证 $x_X\bmod n\stackrel{?}{=}r$。

### 17.4 Shamir 秘密共享题

1. 明确门限 $t$ 和模数 $p$。
2. 用 $t$ 个点做拉格朗日插值。
3. 只需要恢复秘密时，直接求 $f(0)$。
4. 所有除法都转成模逆元。
