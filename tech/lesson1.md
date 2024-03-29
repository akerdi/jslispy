# 1. 实现最简单的计算器功能

支持表达式: `+ 3 2` 打印`5`

## 先实现读取用户输入

首先实现下方的方法, 动作是:

1. 获得用户的输入
2. 输入经过 compiler 转化为`INode`格式的虚拟状态树数据
3. `INode`经过`lval_read`转为本编译器可读的 expr 对象
4. `lval_eval`负责执行 expr 对象
5. `lval_println`打印结果
6. 最后`lval_del`删除结果

以上便是最基础的编译原理要执行的流程: `REPL`(read/eval/print/loop)

```ts
function main() {
  // 设置用户输入的编码格式
  process.stdin.setEncoding("utf8");
  // 提示用户输入箭头(下方也有一个)
  stdoutWrite("> ");
  // 等待用户输入
  process.stdin.on("data", (chunk: any) => {
    const result = chunk.replace(/[\r\n]/g, "");
    if (!!result) {
      try {
        const ast: INode = compiler.compiler(result);
        // 开始lval_read
        const expr = lval_read(ast);
        // 开始lval_eval(expr对象在lval_eval中会被del掉)
        const res = lval_eval(expr);
        // 打印expr
        lval_println(res);
        // 删除res对象
        lval_del(res);
      } catch (error) {
        // 如果是主动抛出来的都是需要特殊打印的格式，其他使用系统的打印即可
        if (error.constructor.name === "lval") {
          lval_println(error);
        } else {
          console.error(error);
        }
      }
      stdoutWrite("> ");
    }
  });
}
// 启动main 方法
main();
```

## 初识 lval

`lval` 是 lisp value 简称, 也是整篇文章操作的对象。

设置数据类型:

```ts
enum LVAL {
  // 错误类型
  ERR,
  // 数字类型
  NUM,
  // 形参、参数类型
  SYM,
  // semi Expr
  SEXPR,
}
```

这里说明 SEXPR，SEXPR 指`(...)`类型。只要是被括号括起来的都会被解析成`SEXPR`. 并且他的执行特性是，遇到就一定执行。

SEXPR 称为 S 容器(后面章节会再遇到一个新的类型 LVAL.QEXPR: Q 容器)。

```ts
class lval {
  type: LVAL; // 类型

  num: number; // LVAL.NUM时保存数字
  err: string; // LVAL.ERR时保存错误
  sym: string; // LVAL.SYM时保存形参、参数
  cells: lval[]; // LVAL.SEXPR时保存子lval数组
}
// 创建各类型lval便捷方法
function lval_err(err: string);
function lval_number(num: number);
function lval_sym(sym: string);
function lval_sexpr();
```

定义 lval 之后，为其增加一组便捷方法:

```ts
// 为容器x的cells增加元素
function lval_add(x: lval, a: lval) {
  x.cells.push(a);
  return x;
}
// 弹出容器x的cells第index的元素
function lval_pop(x: lval, index: number) {
  return x.cells.splice(index, 1)[0];
}
// 弹出容器x的cells第index的元素，并且删除x
function lval_take(x: lval, index: number) {
  const a = lval_pop(x, index);
  lval_del(x);
  return a;
}
// 删除lval数据
function lval_expr_del(x: lval) {
  // 便利删除所有容器内数据
  for (let i = 0; i < x.cells.length; i++) {
    lval_del(x.cells[i]);
  }
  x.cells = null;
}
// 根据类型置空对应数据
function lval_del(x: lval) {
  switch (x.type) {
    case LVAL.ERR:
      x.err = null;
      break;
    case LVAL.NUM:
      x.num = null;
      break;
    case LVAL.SYM:
      x.sym = null;
      break;
    case LVAL.SEXPR:
      lval_expr_del(x);
      break;
  }
}

// 打印lval对象
function lval_expr_print(a: lval, open: string, close: string) {
  stdoutWrite(open);
  for (let i = 0; i < a.cells.length; i++) {
    lval_print(a.cells[i]);
    if (i != a.cells.length - 1) {
      stdoutWrite(" ");
    }
  }
  stdoutWrite(close);
}
function lval_print(a: lval) {
  switch (a.type) {
    case LVAL.ERR:
      return stdoutWrite(a.err);
    case LVAL.NUM:
      return stdoutWrite(a.num + "");
    case LVAL.SYM:
      return stdoutWrite(a.sym);
    case LVAL.SEXPR:
      return lval_expr_print(a, "(", ")");
  }
}
function lval_println(a: lval) {
  lval_print(a);
  stdoutWrite("\n");
}
```

以上为 lval 的最基础的方法，下面进入将`INode`数据转化为 lval 表达式:

## lval_read

```ts
function lval_check_number(content: string) {
  if (!/[0-9]/.test(content)) return lval_err("Invalid number!");

  return lval_number(Number(content));
}
function lval_read(ast: INode) {
  // 单体数据直接转化
  if (ast.type === "number") return lval_check_number(ast.content);
  if (ast.type === "symbol") return lval_sym(ast.content);
  // 容器类型数据使用lval_expr_read方法辅助
  return lval_expr_read(ast);
}
function lval_expr_read(ast: INode) {
  let x;
  if (ast.type === ">") x = lval_sexpr();
  else if (ast.type === "sexpr") x = lval_sexpr();
  for (let i = 0; i < ast.children.length; i++) {
    if (["(", ")"].includes(ast.children[i].content)) continue;
    const a = lval_read(ast.children[i]);
    x = lval_add(x, a);
  }
  return x;
}
```

`INode`从`type: '>'`开始，所以最外面的 lval 就是`LVAL.SEXPR`类型。拿到 children 中的数据赋值到容器中，相当于对虚拟状态树的一次转化。

例如看下`+ 3 2`

```json
{
  "type": ">",
  "children": [
    { "type": "symbol", "content": "+" },
    { "type": "number", "content": "3" },
    { "type": "number", "content": "2" }
  ]
}
```

转为为:

```ts
lval {
  type: LVAL.SEXPR,
  cells: [
    lval { type: LVAL.SYM, sym: "+" },
    lval { type: LVAL.NUM, sym: "3" },
    lval { type: LVAL.NUM, sym: "2" },
  ]
}
```

有了 lval 之后，我们就可以执行了。

## lval_eval

```ts
function lval_eval(v: lval) {
  // 容器对象使用lval_expr_eval辅助方法
  if (v.type === LVAL.SEXPR) return lval_expr_eval(v);
  // 普通lval对象直接返回即可
  return v;
}
// 容器执行方法从外层往内层执行，最后得到结果
function lval_expr_eval(v: lval) {
  let i;
  for (i = 0; i < v.cells.length; i++) {
    v.cells[i] = lval_eval(v.cells[i]);
  }
  for (i = 0; i < v.cells.length; i++) {
    if (v.cells[i].type === LVAL.ERR) {
      return v.cells[i];
    }
  }
  if (!v.cells.length) return v;
  if (v.cells.length == 1) return lval_take(v, 0);
  const op = lval_pop(v, 0);
  if (op.type != LVAL.SYM) {
    return lval_err("sexpr must start with symbol!");
  }

  const res = build_op(v, op.sym);
  // 删除已使用完毕的op对象
  lval_del(op);
  return res;
}
```

`lval_eval` 是执行入口方法，重点看`lval_expr_eval`方法。

`lval_expr_eval`首先`for`循环将 cells 中每个子 lval 都执行，结果就是执行完子 lval 得到结果保存在对应元素上。

接下来的`for`循环判别是否子元素执行过程出过错，出错了则直接放回该元素。

接着判别没有元素，和只有一个子元素的情况，设定返回特定结果。

由于本例使用`波兰表达式`(前缀运算符，如 1+(2*4)的波兰表达式是:`+ 1 (* 2 4)`)，那么`+-\*/`是放在开头的，接下来全是数字类型。

所以`lval_pop(v, 0)` 判别完`LVAL.SYM`类型，我们就可以直接使用了。

我们使用`build_op(lval, string):lval`方法来做具体的动作:

```ts
function build_op(v: lval, sym: string) {
  // 先判别所有子元素是否都是`LVAL.NUM`类型
  for (let i = 0; i < v.cells.length; i++) {
    if (v.cells[i].type !== LVAL.NUM) {
      return lval_err("operation on non-number!");
    }
  }
  let x = lval_pop(v, 0);
  while (v.cells.length) {
    const y = lval_pop(v, 0);
    if (sym === "+") x.num += y.num;
    if (sym === "-") x.num -= y.num;
    if (sym === "*") x.num *= y.num;
    if (sym === "/") {
      // 除数分母为0时特殊判断
      if (y.num === 0) {
        lval_del(x);
        lval_del(y);
        x = lval_err("Division on zero!");
        break;
      }
      x.num /= y.num;
    }
    lval_del(y);
  }
  return x;
}
```

## 结果

以上得到拥有`+-*/`功能的计算器。

    + 3 2 (* 4 8)
    - 9 3 (/ 10 5)

[1. 实现最简单的计算器功能 - 完整代码](./lesson1.ts)
