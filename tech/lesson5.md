# 5. Order/Compare/If

实现三个内建函数`Order`/`Compare`/`If`.

## 5.1. Order

```ts
// 先注册想要实现的函数
function buildin_envs(env: lenv) {
  ...
+ buildin_env(env, ">", buildin_gt);
+ buildin_env(env, ">=", buildin_gte);
+ buildin_env(env, "<", buildin_lt);
+ buildin_env(env, "<=", buildin_lte);
+ buildin_env(env, "==", buildin_eq);
+ buildin_env(env, "!=", buildin_neq);
+ buildin_env(env, "if", buildin_if);
}
// 实现对应的4个函数
+function buildin_order(env: lenv, v: lval, sym: ">" | ">=" | "<" | "<=") {
+ lassert_num(sym, v, 2);
+ lassert_type(sym, v, 0, LVAL.NUM);
+ lassert_type(sym, v, 1, LVAL.NUM);
+ const a = v.cells[0];
+ const b = v.cells[1];
+ let res = 0;
+ switch (sym) {
+   case ">":
+     res = a.num > b.num ? 1 : 0;
+     break;
+   case ">=":
+     res = a.num >= b.num ? 1 : 0;
+     break;
+   case "<":
+     res = a.num < b.num ? 1 : 0;
+     break;
+   case "<=":
+     res = a.num <= b.num ? 1 : 0;
+     break;
+ }
+ lval_del(v);
+ return lval_number(res);
+}
+function buildin_gt(env: lenv, v: lval) {
+ return buildin_order(env, v, ">");
+
+function buildin_gte(env: lenv, v: lval) {
+ return buildin_order(env, v, ">=");
+
+function buildin_lt(env: lenv, v: lval) {
+ return buildin_order(env, v, "<");
+
+function buildin_lte(env: lenv, v: lval) {
+ return buildin_order(env, v, "<=");
+}
```

运行`npm run dev:lesson5.1`, 输入如`> 3 2` / `> 3 4`.

## 5.2. Compare

Compare 实现的是 `==` / `!=`方法，比较函数需要根据类型、数量、值等都需要一一对应:

```ts
+function buildin_compare(env: lenv, v: lval, sym: "==" | "!=") {
+ lassert_num(sym, v, 2);
+ const a = v.cells[0];
+ const b = v.cells[1];
+ let res = 0;
+ if (sym === "==") {
+   res = lval_compare(a, b) ? 1 : 0;
+ } else {
+   res = !lval_compare(a, b) ? 1 : 0;
+ }
+ lval_del(v);
+ return lval_number(res);
+}
+function buildin_eq(env: lenv, v: lval) {
+ return buildin_compare(env, v, "==");
+}
+function buildin_neq(env: lenv, v: lval) {
+ return buildin_compare(env, v, "!=");
+}
```

提供 lval_compare 方法来对比输入的两个值是否完全一致相等，包括类型、数量、值等等:

```ts
+function lval_compare(a: lval, b: lval) {
+ if (a.type != b.type) return false;
+ switch (a.type) {
+   case LVAL.ERR:
+     return a.err === b.err;
+   case LVAL.NUM:
+     return a.num === b.num;
+   case LVAL.SYM:
+     return a.sym === b.sym;
+   case LVAL.FUNC: {
+     if (a.func) return a.func === b.func;
+     if (!a.env || !b.env) return false;
+     if (a.env.syms.length != b.env.syms.length) return false;
+     const a_symlength = a.env.syms.length;
+     for (let i = 0; i < a_symlength; i++) {
+       if (a.env.syms[i] != b.env.syms[i]) return false;
+       if (!lval_compare(a.env.vals[i], b.env.vals[i])) return false;
+     }
+     return lval_compare(a.formal, b.formal) && lval_compare(a.body, b.body);
+   }
+   case LVAL.SEXPR:
+   case LVAL.QEXPR: {
+     if (a.cells.length != b.cells.length) return false;
+     const a_cellslength = a.cells.length;
+     for (let i = 0; i < a_cellslength; i++) {
+       if (!lval_compare(a.cells[i], b.cells[i])) return false;
+     }
+   }
+ }
+ return true;
+}
```

运行`npm run dev:lesson5.2`，执行:

    > def { add } (\ { x y } { + x y})
    ()
    > != add add
    0
    > == add add
    1
    > == \ \
    1
    > != \ \
    0

## 5.3. If

```ts
function buildin_if(env: lenv, v: lval) {
  lassert_num("if", v, 3);
  lassert_type("if", v, 0, LVAL.NUM);
  lassert_type("if", v, 1, LVAL.QEXPR);
  lassert_type("if", v, 2, LVAL.QEXPR);

  const a = v.cells[1];
  a.type = LVAL.SEXPR;
  const b = v.cells[2];
  b.type = LVAL.SEXPR;

  let x: lval = null;
  if (v.cells[0].num === 1) {
    x = lval_eval(env, lval_pop(v, 1));
  } else {
    x = lval_eval(env, lval_pop(v, 2));
  }
  lval_del(v);
  return x;
}
```

内建函数`if` 参数是数字和要执行的 Q 容器 1、Q 容器 2。

lassert 判断完成后，使用 lval_eval 执行对应的 Q 容器转化后的 S 容器对象。

运行`npm run dev:lesson5.3`, 执行:

    > if (== 1 2) { + 3 2 } { - 3 2 }
    1
