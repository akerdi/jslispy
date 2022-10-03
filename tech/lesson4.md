# 4. Lambda 表达式

Lambda 表达式形如`\ { x y } { + x y }`, 搭配`def`食用: `def { add } (\ { x y } { + x y })`, 执行时: `add 10 20`.

本课分为`4.1. 定义Lambda表达式`, `4.2. 执行Lambda表达式`.

## 4.1. 定义 Lambda 表达式

Lambda 定义为 LVAL.FUNC, 他和内建方法区别是:

内建方法:

```
lval {
  type: LVAL.FUNC
  func: lbuildin_func
}
```

Lambda:

```
lval {
  type: LVAL.FUNC
  func: null
  env: lenv
  formal: lval
  body: lval
```

> 确保 Lambda 的 func 为空，func 是区别两者的关键。

```ts
// 为lenv 增加copy 方法
+function lenv_copy(env: lenv) {
+ const _env = newLenv();
+ for (let i = 0; i < env.syms.length; i++) {
+   _env.syms.push(env.syms[i]);
+   _env.vals.push(lval_copy(env.vals[i]));
+ }
+ return _env;
+}
class lval {
  ...
  func: lbuildinFunc;

+ env: lenv; // Lambda表达式形式的环境上下文
+ format: lval; // Lambda表达式的参数列表
+ body: lval; // Lambda表达式的body表达式列表
  ...
}
// 快捷生成lambda对象
+function lval_lambda(format: lval, body: lval) {
+ const _lval = new lval();
+ _lval.type = LVAL.FUNC;
+ _lval.env = newLenv();
+ _lval.func = null;
+ _lval.format = format;
+ _lval.body = body;
+ return _lval;
+}
function lval_copy(v: lval) {
-   case LVAL.FUNC:
-     x.func = v.func;
+   case LVAL.FUNC: {
+     if (v.func) {
+       x.func = v.func;
+     } else {
+       x.env = lenv_copy(v.env);
+       x.format = lval_copy(v.format);
+       x.body = lval_copy(v.body);
+       x.func = null;
+     }
+   }
    break;
}
function lval_del(x: lval) {
-   case LVAL.FUNC:
+   case LVAL.FUNC: {
+     if (!x.func) {
+       lenv_del(x.env);
+       lval_del(x.format);
+       lval_del(x.body);
+     }
+   }
    break;
}
function lval_print(x: lval) {
  ...
+   case LVAL.FUNC:
+     if (a.func) {
+       stdoutWrite(ltype_name(LVAL.FUNC));
+     } else {
+       stdoutWrite("\\");
+       stdoutWrite(" ");
+       lval_print(a.format);
+       stdoutWrite(" ");
+       lval_print(a.body);
+     }
+     return;
  ...
}
```

以上为准备阶段，接下来加入内建方法`\`，并实现:

```ts
+function buildin_lambda(env: lenv, v: lval) {
+ lassert_num("\\", v, 2);
+ lassert_type("\\", v, 0, LVAL.QEXPR);
+ lassert_type("\\", v, 1, LVAL.QEXPR);
+ let formatVal = lval_pop(v, 0);
+ let bodyVal = lval_pop(v, 0);
+ const lambdaVal = lval_lambda(formatVal, bodyVal);
+ lval_del(v);
+ return lambdaVal;
+}
function buildin_envs(env: lenv) {
  ...
  buildin_env(env, "def", buildin_def);
+ buildin_env(env, "\\", buildin_lambda);
}
```

执行: `npm run dev:lesson4.1`, 接着输入: `\ { x y } { + x y }`和`\` 可以看到对应的输出。
