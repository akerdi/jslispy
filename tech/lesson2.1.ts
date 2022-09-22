const compiler = require("../compiler/compiler");

interface INode {
  type:
    | ">" // program
    | "symbol"
    | "number"
    | "string"
    | "sexpr" // 保存 `(`, `)`
    | "qexpr" // 保存 `{`, `}`
    | "comment";
  content?: string; // 保存实际数据
  children?: INode[]; // 保存下层数据
}

enum LVAL {
  // 错误类型
  ERR,
  // 数字类型
  NUM,
  // 形参、参数类型
  SYM,
  // semi Expr - S容器
  SEXPR,
  // quote Expr - Q容器
  QEXPR
}

function stdoutWrite(prompt: string) {
  process.stdout.write(prompt);
}

class lval {
  type: LVAL // 类型

  num: number // LVAL.NUM时保存数字
  err: string // LVAL.ERR时保存错误
  sym: string // LVAL.SYM时保存形参、参数
  cells: lval[] // LVAL.SEXPR时保存子lval数组
}
// 创建各类型lval便捷方法
function lval_err(err: string) {
  const _lval = new lval();
  _lval.type = LVAL.ERR;
  _lval.err = err;
  return _lval;
}
function lval_number(num: number) {
  const _lval = new lval();
  _lval.type = LVAL.NUM;
  _lval.num = num;
  return _lval;
}
function lval_sym(sym: string) {
  const _lval = new lval();
  _lval.type = LVAL.SYM;
  _lval.sym = sym;
  return _lval;
}
function lval_sexpr() {
  const _lval = new lval();
  _lval.type = LVAL.SEXPR;
  _lval.cells = [];
  return _lval;
}
function lval_qexpr() {
  const _lval = new lval();
  _lval.type = LVAL.QEXPR;
  _lval.cells = [];
  return _lval;
}
function lval_check_number(content: string) {
  if (!/[0-9]/.test(content)) return lval_err("Invalid number!");

  return lval_number(Number(content));
}
// 为容器x的cells增加元素
function lval_add(x:lval, a:lval) {
  x.cells.push(a);
  return x;
}
// 弹出容器x的cells第index的元素
function lval_pop(x:lval, index:number) {
  return x.cells.splice(index, 1)[0];
}
// 弹出容器x的cells第index的元素，并且删除x
function lval_take(x:lval, index:number) {
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
function lval_del(x:lval) {
  switch (x.type) {
    case LVAL.ERR: x.err = null; break;
    case LVAL.NUM: x.num = null; break;
    case LVAL.SYM: x.sym = null; break;
    case LVAL.SEXPR:
    case LVAL.QEXPR:
      lval_expr_del(x); break;
  }
}

function lval_read(ast:INode) {
  // 单体数据直接转化
  if (ast.type === "number") return lval_check_number(ast.content);
  if (ast.type === "symbol") return lval_sym(ast.content);
  // 容器类型数据使用lval_expr_read方法辅助
  return lval_expr_read(ast);
}
function lval_expr_read(ast:INode) {
  let x;
  if (ast.type === ">") x = lval_sexpr();
  else if (ast.type === "sexpr") x = lval_sexpr();
  else if (ast.type === "qexpr") x = lval_qexpr();
  for (let i = 0; i < ast.children.length; i++) {
    if (["(", ")", "{", "}"].includes(ast.children[i].content)) continue;
    const a = lval_read(ast.children[i]);
    x = lval_add(x, a);
  }
  return x;
}

function lval_eval(v:lval) {
  // 容器对象使用lval_expr_eval辅助方法
  if (v.type === LVAL.SEXPR) return lval_expr_eval(v);
  // 普通lval对象直接返回即可
  return v;
}
// 容器执行方法从外层往内层执行，最后得到结果
function lval_expr_eval(v:lval) {
  let i;
  for (i = 0; i < v.cells.length; i ++) {
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
  return res;
}

function build_op(v:lval, sym:string) {
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
        lval_del(x); lval_del(y);
        x = lval_err("Division on zero!");
        break;
      }
      x.num /= y.num;
    }
    lval_del(y);
  }
  return x;
}

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
        const ast:INode = compiler.compiler(result);
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


// 打印lval对象
function lval_expr_print(a:lval, open:string, close:string) {
  stdoutWrite(open);
  for (let i = 0; i < a.cells.length; i++) {
    lval_print(a.cells[i]);
    if (i != (a.cells.length-1)) {
      stdoutWrite(" ");
    }
  }
  stdoutWrite(close);
}
function lval_print(a:lval) {
  switch (a.type) {
    case LVAL.ERR: return stdoutWrite(a.err);
    case LVAL.NUM: return stdoutWrite(a.num+"");
    case LVAL.SYM: return stdoutWrite(a.sym);
    case LVAL.SEXPR:
      return lval_expr_print(a, "(", ")");
    case LVAL.QEXPR:
      return lval_expr_print(a, "{", "}");
  }
}
function lval_println(a:lval) {
  lval_print(a);
  stdoutWrite("\n");
}
