# 5. Order/Compare/If

实现三个内建函数`Order`/`Compare`/`If`.

## 5.1. Order

```ts
// 先注册想要实现的函数
function buildin_envs(env: lenv) {
  ...
  buildin_env(env, ">", buildin_gt);
  buildin_env(env, ">=", buildin_gte);
  buildin_env(env, "<", buildin_lt);
  buildin_env(env, "<=", buildin_lte);
}
// 实现对应的4个函数
function buildin_order(env: lenv, v: lval, sym: ">" | ">=" | "<" | "<=") {
  lassert_num(sym, v, 2);
  lassert_type(sym, v, 0, LVAL.NUM);
  lassert_type(sym, v, 1, LVAL.NUM);

  const a = v.cells[0];
  const b = v.cells[1];
  let res = 0;
  switch (sym) {
    case ">":
      res = a.num > b.num ? 1 : 0;
      break;
    case ">=":
      res = a.num >= b.num ? 1 : 0;
      break;
    case "<":
      res = a.num < b.num ? 1 : 0;
      break;
    case "<=":
      res = a.num <= b.num ? 1 : 0;
      break;
  }
  lval_del(v);
  return lval_number(res);
}
function buildin_gt(env: lenv, v: lval) {
  return buildin_order(env, v, ">");
}
function buildin_gte(env: lenv, v: lval) {
  return buildin_order(env, v, ">=");
}
function buildin_lt(env: lenv, v: lval) {
  return buildin_order(env, v, "<");
}
function buildin_lte(env: lenv, v: lval) {
  return buildin_order(env, v, "<=");
}
```

运行`npm run dev:lesson5.1`, 输入如`> 3 2` / `> 3 4`.

## 5.2. Compare

Compare 实现的是 `==` / `!=`方法，比较函数需要根据类型、数量、值等都需要一一对应:

```ts

```
