# 2. QEXPR和内置方法

上一章是最基础的一课, 这章将加入LVAL.QEXPR - Q容器。并且增加内建方法: `head`/`tail`/`list`/`eval`/`join`.

## 先加入LVAL.QEXPR

为enum LVAL 类型增加QEXPR, 为lval创建qexpr类型提供便捷方法以及在`lval_read`/`lval_del`/`lval_print`增加识别`LVAL.QEXPR`

```ts
enum LVAL {
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
}
function lval_print(a:lval) {
    case LVAL.SEXPR:
      return lval_expr_print(a, "(", ")");
    // 增加LVAL.QEXPR, 并且前后使用`{`,`}` 括起来
    case LVAL.QEXPR:
      return lval_expr_print(a, "{", "}");
}
```

以上便把Q容器加进来了。他的作用是包住里面的元素，直到有人指定去启动，里面的表达式才会运转，否则只是保存的作用。

运行`npm run dev:lesson2.1`, 输入如: `{ 1 2 a b c }` 可以看到结果打印出了原来的数据, 其他功能仍然保留。

## 增加内建方法



