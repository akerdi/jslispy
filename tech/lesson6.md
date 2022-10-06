# 6. String/Load library

本章分为识别 String 和`load "filename"`

## 6.1. 实现识别 String

首先在`lval_read`识别 string, 并且为相关函数添加相应的处理:

```ts
enum LVAL {
  ...
  SYM,
+ // 字符串类型
+ STR,
  ...
}
class lval {
  ...
  sym: string; // LVAL.SYM时保存形参、参数
+ str: string; // LVAL.STR时保存字符串
  ...
}
+function lval_str(str: string) {
+ const _lval = new lval();
+ _lval.type = LVAL.STR;
+ _lval.str = str;
+ return _lval;
+}
function lval_copy(v: lval) {
  ...
    case LVAL.SYM:
      x.sym = v.sym;
      break;
+   case LVAL.STR:
+     x.str = v.str;
+     break;
  ...
}
function lval_del(x: lval) {
  ...
+   case LVAL.STR:
+     x.str = null;
+     break;
  ...
}
function lval_compare(a: lval, b: lval) {
  ...
+   case LVAL.STR: return a.str === b.str;
  ...
}
function lval_read(ast: INode) {
  ...
  if (ast.type === "symbol") return lval_sym(ast.content);
  // 此处识别单体string对象
+ if (ast.type === "string") return lval_str(ast.content);
  ...
}
function lval_expr_read(ast: INode) {
  ...
    if (["(", ")", "{", "}"].includes(ast.children[i].content)) continue;
    // 过滤comment类型, 格式为: `; anything`
+   if (ast.children[i].type === "comment") continue;
  ...
}
// 其余如ltype_name / lval_print 都需要匹配LVAL.STR类型
```

运行`npm run dev:lesson6.1`, 执行:

    > "i'm string"
    "i’m string"
    > ; i'm comment
    ()

## 6.2. Load library

注册`print`打印函数和`load`加载脚本函数:

```ts
function buildin_envs(env: lenv) {
+ buildin_env(env, "print", buildin_print);
+ buildin_env(env, "load", buildin_load);
}
+function buildin_print(env: lenv, v: lval) {
+ for (let i = 0; i < v.cells.length; i++) {
+   lval_println(v.cells[i]);
+ }
+ lval_del(v);
+ return lval_sexpr();
+}
```

`load`后面接受多个 LVAL.STR 的值，一一加载脚本:

```ts
function buildin_load(env: lenv, v: lval) {
  for (let i = 0; i < v.cells.length; i++) {
    lassert_type("load", v, i, LVAL.STR);
  }
  for (let i = 0; i < v.cells.length; i++) {
    // 失败时catch返回lval_err错误原因
    try {
      let program = compiler.loadfile(v.cells[i].str);
      const sexpr = lval_read(program);
      while (sexpr.cells.length) {
        const res = lval_eval(env, lval_pop(sexpr, 0));
        if (res.type === LVAL.ERR) lval_println(res);
        lval_del(res);
      }
      program = null;
    } catch (error) {
      lval_del(v);
      return lval_err(error);
    }
  }
  lval_del(v);
  return lval_sexpr();
}
```

运行`npm run dev:lesson6.2`, 执行:

    > load "hello.lsp" "hello.lsp"
