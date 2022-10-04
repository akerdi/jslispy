# 4. Lambda 表达式

Lambda 表达式形如`\ { x y } { + x y }`, 搭配`def`食用: `def { add } (\ { x y } { + x y })`, 执行时: `add 10 20`.

本课分为`4.1. 定义Lambda表达式`, `4.2. 执行Lambda表达式`, `4.3. 形参 "&"表达式`.

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
+ formal: lval; // Lambda表达式的参数列表
+ body: lval; // Lambda表达式的body表达式列表
  ...
}
// 快捷生成lambda对象
+function lval_lambda(formal: lval, body: lval) {
+ const _lval = new lval();
+ _lval.type = LVAL.FUNC;
+ _lval.env = newLenv();
+ _lval.func = null;
+ _lval.formal = formal;
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
+       x.formal = lval_copy(v.formal);
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
+       lval_del(x.formal);
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
+       lval_print(a.formal);
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
+ let formalVal = lval_pop(v, 0);
+ let bodyVal = lval_pop(v, 0);
+ const lambdaVal = lval_lambda(formalVal, bodyVal);
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

## 4.2. 执行 Lambda 表达式

Lambda 表达式很依赖[lesson3](./lesson3.md)中的环境上下文。如我们要为 lenv {} 增加父节点变量: `paren`。可以理解为 Lambda 对象的 env，可以依靠 paren 找到上层的环境上下文，从而得到上层设置的变量:

```ts
class lenv {
+ paren: lenv;
  ...
}
function newLenv() {
  const env = new lenv();
+ env.paren = null; // 默认为null
  ...
}
function lenv_copy(env: lenv) {
  ...
+ if (env.paren) _env.paren = env.paren;

  return _env;
}
function lenv_get(env: lenv, key: lval) {
  ...
  // 当前节点找不到参数? 试试上层节点
+ if (env.paren) {
+   return lenv_get(env.paren, key);
+ }
  return lval_err("Unbound Symbol: %s", [key.sym]);
}
-function lenv_def(env: lenv, key: lval, value: lval) {
+function lenv_put(env: lenv, key: lval, value: lval) {
  for (let i = 0; i < env.syms.length; i++) {
    ...
  }
}
// 环境上下文def作用是在顶层设置变量，所以while循环找到顶层环境
+function lenv_def(env: lenv, key: lval, value: lval) {
+ while (env.paren) {
+   env = env.paren;
+ }
+ lenv_put(env, key, value);
+}
function buildin_var(env: lenv, v: lval, sym: string) {
  ...
  for (let i = 0; i < args.cells.length; i++) {
-   lenv_def(env, args.cells[i], v.cells[i + 1]);
+   if (sym === "def") lenv_def(env, args.cells[i], v.cells[i + 1]);
+   else lenv_put(env, args.cells[i], v.cells[i+1]);
  }
  lval_del(v);
  return lval_sexpr();
}
+function buildin_put(env: lenv, v: lval) {
+ return buildin_var(env, v, "var");
+}
function buildin_envs(env: lenv) {
  ...
  buildin_env(env, "def", buildin_def);
+ buildin_env(env, "=", buildin_put); // 为当前的环境上下文设置变量
  buildin_env(env, "\\", buildin_lambda);
}
```

以上为准备工作，目的是将不同层的环境上下文严格区分开，下面开始执行:

```ts
function lval_expr_eval(env: lenv, v: lval) {
  ...
+ // const res = op.func(env, v);
+ const res = lval_call(env, v, op);

  lval_del(op);
  return res;
}
```

方法`lval_expr_eval` 调用`lval_call`来执行。

如果是内建方法，直接执行，否则依次将形参和实参绑定到 op 的环境上下文:

```ts
function lval_call(env: lenv, v: lval, op: lval) {
  if (op.func) return op.func(env, v);

  const count = v.cells.length;
  const total = op.formal.cells.length;
  while (v.cells.length) {
    if (!op.formal.cells.length) {
      lval_del(v);
      return lval_err("Function '%s' passed invalid count of arguments to variable. Expect %d, Got %d", ["call", total, count]);
    }
    let key = lval_pop(op.formal, 0);
    const value = lval_pop(v, 0);
    lenv_put(op.env, key, value);
    lval_del(key);
    lval_del(value);
  }
  ...
}
```

如果还有形参，则返回拷贝后的 Lambda 函数，拷贝后的 Lambda 函数的环境上下文将带有写入的实参 - 作用是方法演变:

    > def {add} (\ {x y} {+ x y})
    > def {add_ten} (add 10) // 将add 转为 add_ten
    > add_ten 20 // 10 + 20 = 30

如果没有形参，则使用`buildin_eval` 执行。代入 op.env 及装有 op.body 的 QEXPR 容器:

```ts
function lval_call(env: lenv, v: lval, op: lval) {
  ...
  lval_del(v);

  if (!op.formal.cells.length) {
    op.env.paren = env;
    return buildin_eval(op.env, lval_add(lval_qexpr(), lval_copy(op.body)));
  } else {
    return lval_copy(op);
  }
}
```

执行`npm run dev:lesson4.2` 验证是否正确执行。

## 4.3. 形参 "&"表达式

想象我们要表达剩余参数，使用内建辅助方法的话，`def {join_left} (\ { x y & z } { eval (join { + x y } z) } )` &和 z 就可以组合起来表达输入的更多参数。如

`> join_left 10 20 30 40 50 60` ->

`> \ { 10 20 {30 40 50 60} } { eval (join { + x y } z) } )` ->

`> eval (join { + x[10] y[20] } z[30 40 50 60])` ->

`> eval {+ x[10] y[20] 30 40 50 60 }` ->

`> 210`

这比开发者将`z`参数直接改为 Q 容器好用多了(`> join_left 10 20 {30 40 50 60}`).

```ts
function lval_call(env: lenv, v: lval, op: lval) {
  ...
  while (v.cells.length) {
    ...
    let key = lval_pop(op.formal, 0);
    // '&' 后面必须紧接着一个symbol!
+   if (key.sym === "&") {
+     if (op.formal.cells.length != 1) {
+       lval_del(v);
+       lval_del(key);
+       return lval_err("Function '%s' passed '&' must followed by one symbol!", ["call"]);
+     }
      // '&' 实际是没有意义的，要的后面的symbol写入到环境上下文中
+     lval_del(key);
+     key = lval_pop(op.formal, 0);
+     const list = buildin_list(env, v);
+     lenv_put(op.env, key, list);
+     lval_del(key);
+     break;
+   }
    ...
  }
  lval_del(v);
  // 如果参数剩余`& x`则直接为x赋值为空的Q容器
  if (op.formal.cells.length && op.formal.cells[0].sym === "&") {
+   if (op.formal.cells.length != 2) {
+     lval_del(v);
+     lval_del(key);
+     return lval_err("Function '%s' passed '&' must followed by one symbol!", ["call"]);
+   }
+   lval_del(lval_pop(op.formal, 0));
+   const key = lval_pop(op.formal, 0);
+   const empty_list = lval_qexpr();
+   lenv_put(op.env, key, empty_list);
+   lval_del(key);
+   lval_del(empty_list);
+ }
}
```

正如代码块中描述，'&'后面必须跟着一个 symbol 作为形参，用来在环境上下文中保存 Q 容器数据。

执行 `npm run dev:lesson4.3`，并且执行上面的开发者运行示例。
