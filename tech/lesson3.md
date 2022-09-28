# 3. ENV 环境变量

环境变量是及其重要的一课。是自由组织代码？还是按功能优雅配置化？这在之后配置能明显凸显这章的重要性。

## 3.1. 加入 Env

环境对象保存指令，env.syms 链式保存指令，env.vals 保存对应的类型，可以是 NUM、FUNC、也可以是未来要保存在里面的 lambda 表达式，只要他是 lval 类型。

开始到结束: `buildin_envs`依次加入内建方法, `lval_eval`中遇到`v.type === LVAL.SYM`时，使用`lenv_get`获取环境变量中的数据。

```ts
class lenv {
  syms: string[];
  vals: lval[];
}
function newLenv() {
  const env = new lenv();
  env.syms = [];
  env.vals = [];
  return env;
}
function lenv_del(env: lenv) {
  for (let i = 0; i < env.syms.length; i++) {
    env.syms[i] = null;
    lval_del(env.vals[i]);
  }
  env.syms = env.vals = null;
}
// 遍历环境中保存的变量，找到则copy一份返回
function lenv_get(env: lenv, key: lval) {
  for (let i = 0; i < env.syms.length; i++) {
    const sym = env.syms[i];
    if (sym === key.sym) {
      return lval_copy(env.vals[i]);
    }
  }
  return lval_err("Unbound Symbol: %s", [key.sym]);
}
// 往指定的env中保存，如果已有则更新，没有则添加
function lenv_put(env: lenv, key: lval, value: lval) {
  for (let i = 0; i < env.syms.length; i++) {
    const sym = env.syms[i];
    if (sym === key.sym) {
      env.vals[i] = lval_copy(value);
      return;
    }
  }
  env.syms.push(key.sym);
  env.vals.push(lval_copy(value));
}
```

lval 也有部分更新和添加:

```ts
enum LVAL {
  SYM,
+ // 内建方法类型
+ FUNC,
}
+// 设定lbuildinFunc的方法类型
+type lbuildinFunc = (env: lenv, v: lval) = lval;
class lval {
  sym: string;
+ func: lbuildinFunc; // type=Func时保存的内建方法
}
+// 增加创建内建方法便捷函数
+function lval_func(func: lbuildinFunc) {
+ const _lval = new lval();
+ _lval.type = LVAL.FUNC;
+ _lval.func = func;
+ return _lval;
+}
+// 增加copy lval函数，给出去的都是copy后的数据
+function lval_copy(v: lval) {
+ const x = new lval();
+ x.type = v.type;
+ switch (x.type) {
+   case LVAL.ERR: x.err = v.err; break;
+   case LVAL.NUM: x.num = v.num; break;
+   case LVAL.SYM: x.sym = v.sym; break;
+   case LVAL.FUNC: x.func = v.func; break;
+   case LVAL.SEXPR:
+   case LVAL.QEXPR:
+     for (let i = 0; i < v.cells.length; i++) {
+       x.cells.push(lval_copy(v.cells[i]));
+     }
+   default: throw lval_err("Unknown Function: %d", [x.type]);
+ }
+ return x;
+}
function lval_del(x: lval) {
  ...
    case LVAL.SYM:
+   case LVAL.FUNC:
+     // 内建函数时不作处理
+     break;
}
function lval_eval(env: lenv, v: lval) {
+ // 优先查看SYM类型
+ if (v.type === LVAL.SYM) {
+   const val = lenv_get(env, v);
+   lval_del(v);
+   return val;
+ }
  if (v.type === LVAL.SEXPR) return lval_expr_eval(env, v);
  ...
}
function lval_expr_eval(env: lenv, v: lval) {
  ...
- if (op.type != LVAL.SYM) {
+ if (op.type != LVAL.FUNC) {
-   return lval_err("sexpr must start with symbol!");
+   return lval_err("sexpr must start with %s!", [ltype_name(LVAL.FUNC)]);
  }
  // const res = build_op(v, op.sym);
+ // const res = build(v, op.sym);
+ const res = op.func(env, v); // 直接使用内建方法执行函数
  return res;
}
// 废弃lesson2.3新添加的build方法
-function build_op(v: lval, sym: string) {
- ...
-}
function ltype_name(type: LVAL) {
    ...
    case LVAL.SYM: return "<Symbol>";
+   case LVAL.FUNC: return "<Function>";
    ...
}
```

以上准备好了lenv、lval相关方法，下面去使用这些方法:

```ts
main();
+// 创建全局环境变量，并且执行buildin_envs开始配置化内建方法
+let env = newLenv();
+buildin_envs(env);
+process.on("exit", (num) => {
+ lenv_del(env);
+ env = null;
+});

+function buildin_add(env: lenv, v: lval) {
+ return build_op(v, "+");
+}
+function buildin_sub(env: lenv, v: lval) {
+ return build_op(v, "-");
+}
+function buildin_mul(env: lenv, v: lval) {
+ return build_op(v, "*");
+}
+function buildin_div(env: lenv, v: lval) {
+ return build_op(v, "/");
+}
+function buildin_env(env: lenv, sym: string, func: lbuildinFunc) {
+ const symVal = lval_sym(sym);
+ const funcVal = lval_func(func);
+ lenv_put(env, symVal, funcVal);
+ lval_del(symVal);
+ lval_del(funcVal);
+}
+
+function buildin_envs(env: lenv) {
+ buildin_env(env, "head", buildin_head);
+ buildin_env(env, "tail", buildin_tail);
+ buildin_env(env, "list", buildin_list);
+ buildin_env(env, "eval", buildin_eval);
+ buildin_env(env, "join", buildin_join);
+ buildin_env(env, "+", buildin_add);
+ buildin_env(env, "-", buildin_sub);
+ buildin_env(env, "*", buildin_mul);
+ buildin_env(env, "/", buildin_div);
+}
```

由于全局env已经保存有当前所有内建方法，当`lval_eval`通过LVAL.SYM拿到存储的值或者方法，最后通过 `lval_expr_eval` 执行`const res = op.func(v, op.sym);`成功.

运行`npm run dev:lesson3.1`，输入lesson2测试结果，发现结果完全一致!

> 由于新加入lenv全局变量，那么原来的buildin_*、lval_eval、lval_expr_eval等方法接收的第一个参数添加为lenv, 如 `lval_eval(v:lval):lval` -> `lval_eval(env:lenv, v:lval):lval`

## ## 3.2. 新增内建函数`def`

`def` 如同JS语言的`let`命令，其会在对应的环境变量中存储对应数据，定义方法如`def {<arg0> <arg1> ...} val0 val1 ...`

