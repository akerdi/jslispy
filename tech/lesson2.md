# 2. QEXPR 和内置方法

上一章是最基础的一课, 这章将加入 LVAL.QEXPR - Q 容器。并且增加内建方法: `head`/`tail`/`list`/`eval`/`join`.

## 2.1. LVAL.QEXPR

为 enum LVAL 类型增加 QEXPR, 为 lval 创建 qexpr 类型提供便捷方法以及在`lval_read`/`lval_del`/`lval_print`增加识别`LVAL.QEXPR`

```ts
enum LVAL {
  SEXPR,
  // quote Expr - Q容器
+ QEXPR
}
+function lval_qexpr() {
+ const _lval = new lval();
+ _lval.type = LVAL.QEXPR;
+ _lval.cells = [];
+ return _lval;
+}
function lval_del(x:lval) {
    case LVAL.SEXPR:
+   case LVAL.QEXPR:
      lval_expr_del(x); break;
}
function lval_read(ast:INode) {
  let x;
  if (ast.type === ">") x = lval_sexpr();
  else if (ast.type === "sexpr") x = lval_sexpr();
+ else if (ast.type === "qexpr") x = lval_qexpr();
  for (let i = 0; i < ast.children.length; i++) {
-   if (["(", ")"].includes(ast.children[i].content)) continue;
+   // 去掉`{` `}`
+   if (["(", ")", "{", "}"].includes(ast.children[i].content)) continue;
    const a = lval_read(ast.children[i]);
    x = lval_add(x, a);
  }
  return x;
}
function lval_print(a:lval) {
    case LVAL.SEXPR:
      return lval_expr_print(a, "(", ")");
+   // 增加LVAL.QEXPR, 并且前后使用`{`,`}` 括起来
+   case LVAL.QEXPR:
+     return lval_expr_print(a, "{", "}");
}
```

以上便把 Q 容器加进来了。他的作用是包住里面的元素，直到有人指定去启动，里面的表达式才会运转，否则只是保存的作用。

运行`npm run dev:lesson2.1`, 输入如: `{ 1 2 a b c }` 可以看到结果打印出了原来的数据, 其他功能仍然保留。

## 2.2. 内建 Head 方法

增加`head`/`tail`/`list`/`eval`/`join`。

`head`方法作用是获取所有参数的第一个, 如 `head { 1 2 3 }` 实际是`(head { 1 2 3 })`, 当取出 head 后，传给函数`buildin_head`的参数实际是: `({ 1 2 3 })`.

先拿到 Q 容器`{1 2 3}`, 然后去除 Q 容器第二个值留下第一个值就是了! 做这个之前我们要先对方法增加判断, 如果用户传的格式不对呢？

```ts
function buildin_head(v: lval) {
  const func_name = "head";
  if (v.cells.length !== 1) {
    return lval_err(`Function '${func_name}' passed invalid count of arguments! Expect ${1}, Got ${v.cells.length}.`);
  }
  const assert_type_index = 0;
  if (v.cells[assert_type_index].type !== LVAL.QEXPR) {
    return lval_err(`Function '${func_name}' passed invalid type argument at index: ${assert_type_index}. Expect ${ltype_name(LVAL.QEXPR)}, Got ${ltype_name(v.cells[assert_type_index].type)}.`);
  }
  const assert_length_index = 0;
  if (v.cells[assert_length_index].cells.length == 0) {
    return lval_err(`Function '${func_name}' passed {} at index: ${assert_length_index}.`);
  }
  const x = lval_take(v, 0);
  while (x.cells.length > 1) {
    lval_del(lval_pop(x, 1));
  }
  return x;
}
```

执行方法 lval_expr_eval 执行对象修改:

```ts
function lval_expr_eval(v: lval) {
+ // const res = build_op(v, op.sym);
+ const res = build(v, op.sym);
  return res;
}
```

试下`npm run dev:lesson2.2`:

    > head 1 2 // Function 'head' passed invalid count of arguments! Expect 1, Got 2.
    > head 1 // Function 'head' passed invalid type argument at index: 0. Expect <Q-Expr>, Got <Number>.
    > head {} // Function 'head' passed {} at index: 0.
    > head { 1 2 3 } // {1}

## 2.3 内建其他方法

由于每个很多方法都要用到这类 assert 判断，那么我们改造下:

```ts
+const util = require("util");

-function lval_err(err: string) {
+function lval_err(fmt: string, args?: any) {
  const _lval = new lval();
  _lval.type = LVAL.ERR;
- _lval.err = err;
+ _lval.err = util.format(fmt, ...(args || []));
  return _lval;
}
+function lassert(v: lval, cond: boolean, fmt: string, ...args) {
+ if (cond) return;

+ const err = lval_err(fmt, args);
+ v = null;
+ throw err;
+}
+function lassert_num(func: string, v: lval, expect: number) {
+ return lassert(v, v.cells.length === expect, "Function '%s' passed invalid count of arguments! Expect: %d, Got: %d!", func, expect, v.cells.length);
+}
+function lassert_type(func: string, v: lval, index: number, expect: LVAL) {
+ return lassert(v, v.cells[index].type === expect, "Function '%s' passed invalid type at index: %d! \
+   Expect: %s, Got: %s!  \
+   ", func, index, ltype_name(expect), ltype_name(v.cells[index].type));
+}
+function lassert_not_empty(func: string, v: lval, index: number) {
+ return lassert(v, v.cells[0].cells.length !== 0, "Function '%s' passed {} at index: %d!", func, index);
+}
```

修改后的 buildin_head 如下:

```ts
function buildin_head(env: lenv, v: lval) {
  lassert_num("head", v, 1);
  lassert_type("head", v, 0, LVAL.QEXPR);
  lassert_not_empty("head", v, 0);

  const x = lval_take(v, 0);
  while (x.cells.length > 1) {
    let y = lval_pop(x, 1);
    lval_del(y);
  }
  return x;
}
```

剩下的依次实现其他方法: `buildin_tail`/`buildin_list`/`buildin_eval`/`buildin_join`

运行`npm run dev:lesson2.3`, 输入如:

    join { 1 2 3 a } { b c d }
    eval { tail (eval { join { 1 2 3 } { a b c d } } ) }
