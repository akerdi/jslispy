const util = require("util");
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

function stdoutWrite(prompt: string) {
  process.stdout.write(prompt);
}

class lenv {
  paren: lenv;
  syms: string[];
  vals: lval[];
}
function newLenv() {
  const env = new lenv();
  env.paren = null;
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
function lenv_copy(env: lenv) {
  const _env = newLenv();
  for (let i = 0; i < env.syms.length; i++) {
    _env.syms.push(env.syms[i]);
    _env.vals.push(lval_copy(env.vals[i]));
  }
  if (env.paren) _env.paren = env.paren;

  return _env;
}
function lenv_get(env: lenv, key: lval) {
  for (let i = 0; i < env.syms.length; i++) {
    const sym = env.syms[i];
    if (sym === key.sym) {
      return lval_copy(env.vals[i]);
    }
  }
  if (env.paren) {
    return lenv_get(env.paren, key);
  }
  return lval_err("Unbound Symbol: %s", [key.sym]);
}
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

function lenv_def(env: lenv, key: lval, value: lval) {
  while (env.paren) {
    env = env.paren;
  }
  lenv_put(env, key, value);
}

enum LVAL {
  // 错误类型
  ERR,
  // 数字类型
  NUM,
  // 形参、参数类型
  SYM,
  // 字符串类型
  STR,
  // 内建方法类型
  FUNC,
  // semi Expr - S容器
  SEXPR,
  // quote Expr - Q容器
  QEXPR,
}
type lbuildinFunc = (env: lenv, v: lval) => lval;
class lval {
  type: LVAL; // 类型

  num: number; // LVAL.NUM时保存数字
  err: string; // LVAL.ERR时保存错误
  sym: string; // LVAL.SYM时保存形参、参数
  str: string; // LVAL.STR时保存字符串
  func: lbuildinFunc; // type=Func时保存的内建方法

  env: lenv; // Lambda表达式形式的环境上下文
  formal: lval; // Lambda表达式的参数列表
  body: lval; // Lambda表达式的body表达式列表

  cells: lval[]; // LVAL.SEXPR时保存子lval数组
}
// 创建各类型lval便捷方法
function lval_err(fmt: string, args?: any[]) {
  const _lval = new lval();
  _lval.type = LVAL.ERR;
  _lval.err = util.format(fmt, ...(args || []));
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
function lval_func(func: lbuildinFunc) {
  const _lval = new lval();
  _lval.type = LVAL.FUNC;
  _lval.func = func;
  return _lval;
}
function lval_str(str: string) {
  const _lval = new lval();
  _lval.type = LVAL.STR;
  _lval.str = str;
  return _lval;
}
function lval_lambda(formal: lval, body: lval) {
  const _lval = new lval();
  _lval.type = LVAL.FUNC;
  _lval.env = newLenv();
  _lval.func = null;
  _lval.formal = formal;
  _lval.body = body;
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
function lval_copy(v: lval) {
  const x = new lval();
  x.type = v.type;
  switch (x.type) {
    case LVAL.ERR:
      x.err = v.err;
      break;
    case LVAL.NUM:
      x.num = v.num;
      break;
    case LVAL.SYM:
      x.sym = v.sym;
      break;
    case LVAL.STR:
      x.str = v.str;
      break;
    case LVAL.FUNC:
      {
        if (v.func) {
          x.func = v.func;
        } else {
          x.env = lenv_copy(v.env);
          x.formal = lval_copy(v.formal);
          x.body = lval_copy(v.body);
          x.func = null;
        }
      }
      break;
    case LVAL.SEXPR:
    case LVAL.QEXPR:
      x.cells = [];
      for (let i = 0; i < v.cells.length; i++) {
        x.cells.push(lval_copy(v.cells[i]));
      }
      break;
    default:
      throw lval_err("Unknown Function: %d", [x.type]);
  }
  return x;
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
    case LVAL.STR:
      x.str = null;
      break;
    case LVAL.FUNC:
      {
        if (!x.func) {
          lenv_del(x.env);
          lval_del(x.formal);
          lval_del(x.body);
        }
      }
      break;
    case LVAL.SEXPR:
    case LVAL.QEXPR:
      lval_expr_del(x);
      break;
  }
}
function lval_compare(a: lval, b: lval) {
  if (a.type != b.type) return false;
  switch (a.type) {
    case LVAL.ERR:
      return a.err === b.err;
    case LVAL.NUM:
      return a.num === b.num;
    case LVAL.SYM:
      return a.sym === b.sym;
    case LVAL.STR:
      return a.str === b.str;
    case LVAL.FUNC: {
      if (a.func) return a.func === b.func;
      if (!a.env || !b.env) return false;
      if (a.env.syms.length != b.env.syms.length) return false;
      const a_symlength = a.env.syms.length;
      for (let i = 0; i < a_symlength; i++) {
        if (a.env.syms[i] != b.env.syms[i]) return false;
        if (!lval_compare(a.env.vals[i], b.env.vals[i])) return false;
      }
      return lval_compare(a.formal, b.formal) && lval_compare(a.body, b.body);
    }
    case LVAL.SEXPR:
    case LVAL.QEXPR: {
      if (a.cells.length != b.cells.length) return false;
      const a_cellslength = a.cells.length;
      for (let i = 0; i < a_cellslength; i++) {
        if (!lval_compare(a.cells[i], b.cells[i])) return false;
      }
    }
  }
  return true;
}

function lval_read(ast: INode) {
  // 单体数据直接转化
  if (ast.type === "number") return lval_check_number(ast.content);
  if (ast.type === "symbol") return lval_sym(ast.content);
  if (ast.type === "string") return lval_str(ast.content);
  // 容器类型数据使用lval_expr_read方法辅助
  return lval_expr_read(ast);
}
function lval_expr_read(ast: INode) {
  let x;
  if (ast.type === ">") x = lval_sexpr();
  else if (ast.type === "sexpr") x = lval_sexpr();
  else if (ast.type === "qexpr") x = lval_qexpr();
  for (let i = 0; i < ast.children.length; i++) {
    if (["(", ")", "{", "}"].includes(ast.children[i].content)) continue;
    if (ast.children[i].type === "comment") continue;
    const a = lval_read(ast.children[i]);
    x = lval_add(x, a);
  }
  return x;
}

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
    if (key.sym === "&") {
      if (op.formal.cells.length != 1) {
        lval_del(v);
        lval_del(key);
        return lval_err("Function '%s' passed '&' must followed by one symbol!", ["call"]);
      }
      lval_del(key);
      key = lval_pop(op.formal, 0);
      const list = buildin_list(env, v);
      lenv_put(op.env, key, list);
      lval_del(key);
      break;
    }
    const value = lval_pop(v, 0);
    lenv_put(op.env, key, value);
    lval_del(key);
    lval_del(value);
  }
  lval_del(v);

  if (op.formal.cells.length && op.formal.cells[0].sym === "&") {
    if (op.formal.cells.length != 2) {
      lval_del(v);
      lval_del(key);
      return lval_err("Function '%s' passed '&' must followed by one symbol!", ["call"]);
    }
    lval_del(lval_pop(op.formal, 0));
    const key = lval_pop(op.formal, 0);
    const empty_list = lval_qexpr();
    lenv_put(op.env, key, empty_list);
    lval_del(key);
    lval_del(empty_list);
  }

  if (!op.formal.cells.length) {
    op.env.paren = env;
    return buildin_eval(op.env, lval_add(lval_qexpr(), lval_copy(op.body)));
  } else {
    return lval_copy(op);
  }
}

function lval_eval(env: lenv, v: lval) {
  // 优先查看SYM类型
  if (v.type === LVAL.SYM) {
    const val = lenv_get(env, v);
    lval_del(v);
    return val;
  }
  // 容器对象使用lval_expr_eval辅助方法
  if (v.type === LVAL.SEXPR) return lval_expr_eval(env, v);
  // 普通lval对象直接返回即可
  return v;
}
// 容器执行方法从外层往内层执行，最后得到结果
function lval_expr_eval(env: lenv, v: lval) {
  let i;
  for (i = 0; i < v.cells.length; i++) {
    v.cells[i] = lval_eval(env, v.cells[i]);
  }
  for (i = 0; i < v.cells.length; i++) {
    if (v.cells[i].type === LVAL.ERR) {
      return v.cells[i];
    }
  }
  if (!v.cells.length) return v;
  if (v.cells.length == 1) return lval_take(v, 0);
  const op = lval_pop(v, 0);
  if (op.type != LVAL.FUNC) {
    return lval_err("sexpr must start with %s!", [ltype_name(LVAL.FUNC)]);
  }

  // const res = build_op(v, op.sym);
  // const res = build(v, op.sym);
  // const res = op.func(env, v);
  const res = lval_call(env, v, op);

  lval_del(op);
  return res;
}

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
function ltype_name(type: LVAL) {
  switch (type) {
    case LVAL.ERR:
      return "<Error>";
    case LVAL.NUM:
      return "<Number>";
    case LVAL.SYM:
      return "<Symbol>";
    case LVAL.STR:
      return "<String>";
    case LVAL.FUNC:
      return "<Function>";
    case LVAL.SEXPR:
      return "<S-Expr>";
    case LVAL.QEXPR:
      return "<Q-Expr>";
    default:
      return "<Unknown Type>: " + type;
  }
}
function lassert(v: lval, cond: boolean, fmt: string, ...args) {
  if (cond) return;

  const err = lval_err(fmt, args);
  v = null;
  throw err;
}
function lassert_num(func: string, v: lval, expect: number) {
  return lassert(v, v.cells.length === expect, "Function '%s' passed invalid count of arguments! Expect: %d, Got: %d!", func, expect, v.cells.length);
}
function lassert_type(func: string, v: lval, index: number, expect: LVAL) {
  return lassert(v, v.cells[index].type === expect, "Function '%s' passed invalid type at index: %d! \
    Expect: %s, Got: %s!  \
    ", func, index, ltype_name(expect), ltype_name(v.cells[index].type));
}
function lassert_not_empty(func: string, v: lval, index: number) {
  return lassert(v, v.cells[0].cells.length !== 0, "Function '%s' passed {} at index: %d!", func, index);
}
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
function buildin_tail(env: lenv, v: lval) {
  lassert_num("head", v, 1);
  lassert_type("head", v, 0, LVAL.QEXPR);
  lassert_not_empty("head", v, 0);

  const x = lval_take(v, 0);
  lval_del(lval_pop(x, 0));
  return x;
}
function buildin_list(env: lenv, v: lval) {
  v.type = LVAL.QEXPR;
  return v;
}
function buildin_eval(env: lenv, v: lval) {
  lassert_num("eval", v, 1);
  lassert_type("eval", v, 0, LVAL.QEXPR);
  lassert_not_empty("eval", v, 0);
  const x = lval_take(v, 0);
  x.type = LVAL.SEXPR;
  return lval_eval(env, x);
}
function buildin_join(env: lenv, v: lval) {
  lassert_num("join", v, 2);
  lassert_type("join", v, 0, LVAL.QEXPR);
  lassert_type("join", v, 1, LVAL.QEXPR);
  lassert_not_empty("join", v, 0);
  let x = lval_pop(v, 0);
  while (v.cells.length) {
    const y = lval_pop(v, 0);
    while (y.cells.length) {
      const a = lval_pop(y, 0);
      x = lval_add(x, a);
    }
    lval_del(y);
  }
  lval_del(v);
  return x;
}
function buildin_add(env: lenv, v: lval) {
  return build_op(v, "+");
}
function buildin_sub(env: lenv, v: lval) {
  return build_op(v, "-");
}
function buildin_mul(env: lenv, v: lval) {
  return build_op(v, "*");
}
function buildin_div(env: lenv, v: lval) {
  return build_op(v, "/");
}
function buildin_var(env: lenv, v: lval, sym: string) {
  lassert_type(sym, v, 0, LVAL.QEXPR);
  const args = v.cells[0];
  lassert(v, args.cells.length == v.cells.length - 1, "Function '%s' passed count of args not equal to count of vals. Args: %d, Vals: %d", sym, args.cells.length, v.cells.length - 1);
  for (let i = 0; i < args.cells.length; i++) {
    lassert_type(sym, args, i, LVAL.SYM);
  }
  for (let i = 0; i < args.cells.length; i++) {
    if (sym === "def") lenv_def(env, args.cells[i], v.cells[i + 1]);
    else lenv_put(env, args.cells[i], v.cells[i + 1]);
  }
  lval_del(v);
  return lval_sexpr();
}
function buildin_put(env: lenv, v: lval) {
  return buildin_var(env, v, "var");
}
function buildin_def(env: lenv, v: lval) {
  return buildin_var(env, v, "def");
}

function buildin_lambda(env: lenv, v: lval) {
  lassert_num("\\", v, 2);
  lassert_type("\\", v, 0, LVAL.QEXPR);
  lassert_type("\\", v, 1, LVAL.QEXPR);
  let formalVal = lval_pop(v, 0);
  let bodyVal = lval_pop(v, 0);
  const lambdaVal = lval_lambda(formalVal, bodyVal);

  lval_del(v);
  return lambdaVal;
}
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
function buildin_compare(env: lenv, v: lval, sym: "==" | "!=") {
  lassert_num(sym, v, 2);

  const a = v.cells[0];
  const b = v.cells[1];
  let res = 0;
  if (sym === "==") {
    res = lval_compare(a, b) ? 1 : 0;
  } else {
    res = !lval_compare(a, b) ? 1 : 0;
  }
  lval_del(v);
  return lval_number(res);
}
function buildin_eq(env: lenv, v: lval) {
  return buildin_compare(env, v, "==");
}
function buildin_neq(env: lenv, v: lval) {
  return buildin_compare(env, v, "!=");
}
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
function buildin_env(env: lenv, sym: string, func: lbuildinFunc) {
  const symVal = lval_sym(sym);
  const funcVal = lval_func(func);
  lenv_def(env, symVal, funcVal);
  lval_del(symVal);
  lval_del(funcVal);
}

function buildin_envs(env: lenv) {
  buildin_env(env, "head", buildin_head);
  buildin_env(env, "tail", buildin_tail);
  buildin_env(env, "list", buildin_list);
  buildin_env(env, "eval", buildin_eval);
  buildin_env(env, "join", buildin_join);
  buildin_env(env, "+", buildin_add);
  buildin_env(env, "-", buildin_sub);
  buildin_env(env, "*", buildin_mul);
  buildin_env(env, "/", buildin_div);
  buildin_env(env, "def", buildin_def);
  buildin_env(env, "=", buildin_put);
  buildin_env(env, "\\", buildin_lambda);
  buildin_env(env, ">", buildin_gt);
  buildin_env(env, ">=", buildin_gte);
  buildin_env(env, "<", buildin_lt);
  buildin_env(env, "<=", buildin_lte);
  buildin_env(env, "==", buildin_eq);
  buildin_env(env, "!=", buildin_neq);
  buildin_env(env, "if", buildin_if);
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
        const ast: INode = compiler.compiler(result);
        // 开始lval_read
        const expr = lval_read(ast);
        // 开始lval_eval(expr对象在lval_eval中会被del掉)
        const res = lval_eval(env, expr);
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
let env = newLenv();
buildin_envs(env);
process.on("exit", (num) => {
  lenv_del(env);
  env = null;
});

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
    case LVAL.STR:
      stdoutWrite('"');
      stdoutWrite(a.str);
      stdoutWrite('"');
      return;
    case LVAL.FUNC:
      if (a.func) {
        stdoutWrite(ltype_name(LVAL.FUNC));
      } else {
        stdoutWrite("\\");
        stdoutWrite(" ");
        lval_print(a.formal);
        stdoutWrite(" ");
        lval_print(a.body);
      }
      return;
    case LVAL.SEXPR:
      return lval_expr_print(a, "(", ")");
    case LVAL.QEXPR:
      return lval_expr_print(a, "{", "}");
    default:
      return stdoutWrite(ltype_name(a.type));
  }
}
function lval_println(a: lval) {
  lval_print(a);
  stdoutWrite("\n");
}
