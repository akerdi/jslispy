import util from "util";

const compiler = require("./compiler/compiler");
interface INode {
  type:
    | ">" // program
    | "symbol"
    | "number"
    | "string"
    | "semi" // 保存 `(`, `)`
    | "quote"; // 保存 `{`, `}`
  content?: string; // 保存实际数据
  children?: INode[]; // 保存下层数据
}

function stdoutWrite(prompt: string) {
  process.stdout.write(prompt);
}

enum LVAL {
  ERR,
  NUM,
  SYM,
  SEXPR,
  QEXPR,
  FUNC,
}

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
function lenv_get(env: lenv, key: lval) {
  let i;
  for (i = 0; i < env.syms.length; i++) {
    const sym = env.syms[i];
    if (sym === key.sym) {
      return lval_copy(env.vals[i]);
    }
  }
  return lval_err("Unbound Symbol: %s", [key.sym]);
}
function lenv_put(env: lenv, key: lval, val: lval) {
  for (let i = 0; i < env.syms.length; i++) {
    // 存在即更新
    if (env.syms[i] === key.sym) {
      env.vals[i] = lval_copy(val);
      return;
    }
  }
  // 不存在即增加
  env.syms.push(key.sym);
  env.vals.push(lval_copy(val));
}
type lbuildinFunc = (env: lenv, val: lval) => lval;
class lval {
  type: LVAL;

  num: number;
  err: string;
  sym: string;
  func: lbuildinFunc;

  cells: lval[];
}
function lval_number(num: number) {
  const _lval = new lval();
  _lval.type = LVAL.NUM;
  _lval.num = num;
  return _lval;
}
function lval_err(fmt: string, args?: any[]) {
  const _lval = new lval();
  _lval.type = LVAL.ERR;
  _lval.err = util.format(fmt, ...(args || []));
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
function lval_expr_del(x: lval) {
  for (let i = 0; i < x.cells.length; i++) {
    lval_del(x.cells[i]);
  }
  x.cells = null;
}
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
    case LVAL.SEXPR:
    case LVAL.QEXPR:
      lval_expr_del(x);
      break;
  }
}

function lval_add(x: lval, a: lval) {
  x.cells.push(a);
  return x;
}
function lval_pop(x: lval, index: number) {
  return x.cells.splice(index, 1)[0];
}
function lval_take(x: lval, index: number) {
  const a = lval_pop(x, index);
  x = null;
  return a;
}
function lval_copy(x: lval) {
  const _lval = new lval();
  _lval.type = x.type;
  switch (_lval.type) {
    case LVAL.ERR:
      _lval.err = x.err;
      break;
    case LVAL.NUM:
      _lval.num = x.num;
      break;
    case LVAL.SYM:
      _lval.sym = x.sym;
      break;
    case LVAL.FUNC:
      _lval.func = x.func;
      break;
    case LVAL.SEXPR:
    case LVAL.QEXPR:
      _lval.cells = [];
      for (const a of x.cells) {
        _lval.cells.push(lval_copy(a));
      }
      break;
  }
  return _lval;
}
function build_op(v: lval, sym: string) {
  for (let i = 0; i < v.cells.length; i++) {
    if (v.cells[i].type !== LVAL.NUM) {
      return lval_err("operation on non-number! Expect %s, Got %s", [
        ltype_name(LVAL.NUM),
        ltype_name(v.cells[i].type),
      ]);
    }
  }
  let x = lval_pop(v, 0);
  if (!v.cells.length && sym === "-") {
    x.num = -x.num;
  }
  while (v.cells.length) {
    const y = lval_pop(v, 0);
    if (sym === "+") x.num += y.num;
    if (sym === "-") x.num -= y.num;
    if (sym === "*") x.num *= y.num;
    if (sym === "/") {
      if (y.num === 0) {
        lval_del(x);
        x = lval_err("Division on zero!");
        break;
      }
      x.num /= y.num;
    }
    lval_del(y);
  }
  lval_del(v);

  return x;
}

function ltype_name(type: LVAL) {
  switch (type) {
    case LVAL.NUM:
      return "<Number>";
    case LVAL.SYM:
      return "<SYMBLE>";
    case LVAL.SEXPR:
      return "<SEXPR>";
    case LVAL.QEXPR:
      return "<QEXPR>";
    case LVAL.ERR:
      return "<ERROR>";
    default:
      return `<Unknown type: ${type}>`;
  }
}
function lassert(v: lval, cond: boolean, fmt: string, ...args) {
  if (cond) return;

  const err = lval_err(fmt, args);
  v = null;
  throw err;
}
function lassert_num(func: string, v: lval, expect: number) {
  return lassert(
    v,
    v.cells.length === expect,
    "Function '%s' passed invalid count of arguments! Expect: %d, Got: %d!",
    func,
    expect,
    v.cells.length
  );
}
function lassert_type(func: string, v: lval, index: number, expect: LVAL) {
  return lassert(
    v,
    v.cells[index].type === expect,
    "Function '%s' passed invalid type at index: %d! \
    Expect: %s, Got: %s!  \
    ",
    func,
    index,
    ltype_name(expect),
    ltype_name(v.cells[index].type)
  );
}
function lassert_not_empty(func: string, v: lval, index: number) {
  return lassert(
    v,
    v.cells[0].cells.length !== 0,
    "Function '%s' passed {} at index: %d!",
    func,
    index
  );
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

function buildin_eval(env: lenv, v: lval) {
  lassert_num("eval", v, 1);
  lassert_type("eval", v, 0, LVAL.QEXPR);
  lassert_not_empty("eval", v, 0);
  const x = lval_take(v, 0);
  x.type = LVAL.SEXPR;
  return lval_eval(env, x);
}
function buildin_def(env: lenv, v: lval) {
  return null;
}

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
    return lval_err("Sexpr must start with function type! Expect %s, Got %s", [
      ltype_name(LVAL.FUNC),
      ltype_name(op.type),
    ]);
  }

  // const res = build_op(v, op.sym);
  // const res = buildin(v, op.sym);
  const res = op.func(env, v);

  lval_del(op);

  return res;
}
function lval_eval(env: lenv, v: lval) {
  if (v.type == LVAL.SYM) {
    const val = lenv_get(env, v);
    return val;
  }
  if (v.type === LVAL.SEXPR) return lval_expr_eval(env, v);
  return v;
}

function lval_expr_read(ast) {
  let x: lval;
  if (ast.type === ">") x = lval_sexpr();
  else if (ast.type === "sexpr") x = lval_sexpr();
  else if (ast.type === "qexpr") x = lval_qexpr();
  for (let i = 0; i < ast.children.length; i++) {
    if (ast.children[i].content === "(") continue;
    if (ast.children[i].content === ")") continue;
    if (ast.children[i].content === "{") continue;
    if (ast.children[i].content === "}") continue;
    const a = lval_read(ast.children[i]);
    x = lval_add(x, a);
  }
  return x;
}

function lval_read(ast) {
  if (ast.type === "number") return lval_number(Number(ast.content));
  if (ast.type === "symbol") return lval_sym(ast.content);

  return lval_expr_read(ast);
}

function buildin_env(env: lenv, key: string, func: lbuildinFunc) {
  let symVal = lval_sym(key);
  let funcVal = lval_func(func);
  lenv_put(env, symVal, funcVal);
  symVal = null;
  funcVal = null;
}

function buildin_envs(env: lenv) {
  buildin_env(env, "head", buildin_head);
  buildin_env(env, "tail", buildin_tail);
  buildin_env(env, "eval", buildin_eval);
  buildin_env(env, "list", buildin_list);
  buildin_env(env, "join", buildin_join);
  buildin_env(env, "+", buildin_add);
  buildin_env(env, "-", buildin_sub);
  buildin_env(env, "*", buildin_mul);
  buildin_env(env, "/", buildin_div);
  buildin_env(env, "def", buildin_def);
}

function main() {
  process.stdin.setEncoding("utf8");
  stdoutWrite("> ");

  process.stdin.on("data", (chunk: any) => {
    const result = chunk.replace(/[\r\n]/g, "");
    if (!!result) {
      try {
        const ast: INode = compiler.compiler(result);
        // 开始lval_read
        const expr = lval_read(ast);
        // 开始lval_eval
        const res = lval_eval(env, expr);
        // 打印expr
        lval_println(res);
        lval_del(res);
      } catch (error) {
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

main();
let env = newLenv();
buildin_envs(env);
process.on("exit", (num) => {
  env = null;
});

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
    case LVAL.SEXPR:
      return lval_expr_print(a, "(", ")");
    case LVAL.QEXPR:
      return lval_expr_print(a, "{", "}");
  }
}
function lval_println(a: lval) {
  lval_print(a);
  stdoutWrite("\n");
}
