import util from "util";

const compiler = require("./compiler/compiler");
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

enum LVAL {
  ERR,
  NUM,
  SYM,
  STR,
  SEXPR,
  QEXPR,
  FUNC,
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
function lenv_get(env: lenv, key: lval) {
  let i;
  for (i = 0; i < env.syms.length; i++) {
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
function lenv_def(env: lenv, key: lval, val: lval) {
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
function lenv_put(env: lenv, key: lval, val: lval) {
  while (env.paren) {
    env = env.paren;
  }
  lenv_def(env, key, val);
}
function lenv_copy(env: lenv) {
  const x = newLenv();
  x.paren = env.paren;
  for (let i = 0; i < env.syms.length; i++) {
    const key = env.syms[i];
    x.syms.push(key);
    x.vals.push(lval_copy(env.vals[i]));
  }
  return x;
}
function lenv_del(env: lenv) {
  for (let i = 0; i < env.syms.length; i++) {
    env.syms[i] = null;
    lval_del(env.vals[i]);
  }
}

type lbuildinFunc = (env: lenv, val: lval) => lval;
class lval {
  type: LVAL;

  num: number;
  err: string;
  sym: string;
  str: string;
  func: lbuildinFunc;
  formals: lval;
  body: lval;
  env: lenv;

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
function lval_str(str: string) {
  const _lval = new lval();
  _lval.type = LVAL.STR;
  _lval.str = str;
  return _lval;
}
function lval_func(func: lbuildinFunc) {
  const _lval = new lval();
  _lval.type = LVAL.FUNC;
  _lval.func = func;
  return _lval;
}
function lval_lambda(formals: lval, body: lval) {
  const _lval = new lval();
  _lval.type = LVAL.FUNC;
  _lval.func = null;
  _lval.formals = formals;
  _lval.body = body;
  _lval.env = newLenv();
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
  if (!/[0-9]/.test(content)) return lval_err("Invalid number: %s!", [content]);

  return lval_number(Number(content));
}
function lval_escape_doublequote_str(content: string) {
  const content_length = content.length;
  const str = content.substring(1, content_length - 1);
  return lval_str(str);
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
    case LVAL.STR:
      x.str = null;
      break;
    case LVAL.FUNC:
      if (x.func) {
        x.func = null;
      } else {
        lval_del(x.formals);
        lval_del(x.body);
        lenv_del(x.env);
      }
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
    case LVAL.STR:
      _lval.str = x.str;
      break;
    case LVAL.FUNC:
      if (x.func) {
        _lval.func = x.func;
      } else {
        _lval.func = null;
        _lval.formals = lval_copy(x.formals);
        _lval.body = lval_copy(x.body);
        _lval.env = lenv_copy(x.env);
      }
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
      return "<NUMBER>";
    case LVAL.SYM:
      return "<SYMBLE>";
    case LVAL.STR:
      return "<STRING>";
    case LVAL.SEXPR:
      return "<SEXPR>";
    case LVAL.FUNC:
      return "<FUNCTION>";
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
  lassert_type("def", v, 0, LVAL.QEXPR);
  const node = v.cells[0];
  lassert(
    v,
    node.cells.length === v.cells.length - 1,
    "Function '%s' passed count of arguments not equal to count of values. Argument: %d, Values: %d",
    "def",
    node.cells.length,
    v.cells.length - 1
  );
  for (let i = 0; i < node.cells.length; i++) {
    lenv_def(env, node.cells[i], v.cells[i + 1]);
  }
  lval_del(v);
  return lval_sexpr();
}
function buildin_lambda(env: lenv, v: lval) {
  lassert_num("\\", v, 2);
  lassert_type("\\", v, 0, LVAL.QEXPR);
  lassert_type("\\", v, 1, LVAL.QEXPR);
  const formals = lval_pop(v, 0);
  const body = lval_pop(v, 0);
  const lamdaVal = lval_lambda(formals, body);
  lval_del(v);

  return lamdaVal;
}
function lval_order(env: lenv, v: lval, op: ">" | "<" | ">=" | "<=") {
  lassert_num(op, v, 2);
  lassert_type(op, v, 0, LVAL.NUM);
  lassert_type(op, v, 1, LVAL.NUM);
  let a = v.cells[0],
    b = v.cells[1];
  let res: boolean;
  switch (op) {
    case ">":
      res = a.num > b.num;
      break;
    case ">=":
      res = a.num >= b.num;
      break;
    case "<":
      res = a.num < b.num;
      break;
    case "<=":
      res = a.num <= b.num;
      break;
  }
  lval_del(v);
  return lval_number(res ? 1 : 0);
}
function lval_compare(a: lval, b: lval) {
  if (a.type != b.type) return 0;

  switch (a.type) {
    case LVAL.NUM:
      return a.num == b.num;
    case LVAL.ERR:
      return a.err == b.err;
    case LVAL.SYM:
      return a.sym == b.sym;
    case LVAL.FUNC: {
      if (a.func) return a.func == b.func;
      else {
        // 先判别env
        if (a.env.paren != b.env.paren) return false;
        for (let i = 0; i < a.env.syms.length; i++) {
          const a_env_sym = a.env.syms[i];
          if (a_env_sym != b.env.syms[i]) return false;
          if (!lval_compare(a.env.vals[i], b.env.vals[i])) return false;
        }
        return (
          lval_compare(a.formals, b.formals) && lval_compare(a.body, b.body)
        );
      }
    }
    case LVAL.SEXPR:
    case LVAL.QEXPR: {
      if (a.cells.length != b.cells.length) return false;
      for (let i = 0; i < a.cells.length; i++) {
        return lval_compare(a.cells[i], b.cells[i]);
      }
    }
  }
  return false;
}
function buildin_gt(env: lenv, v: lval) {
  return lval_order(env, v, ">");
}
function buildin_gte(env: lenv, v: lval) {
  return lval_order(env, v, ">=");
}
function buildin_lt(env: lenv, v: lval) {
  return lval_order(env, v, "<");
}
function buildin_lte(env: lenv, v: lval) {
  return lval_order(env, v, "<=");
}
function buildin_compare(env: lenv, v: lval, op: "==" | "!=") {
  lassert_num(op, v, 2);
  lassert_type(op, v, 0, LVAL.NUM);
  lassert_type(op, v, 0, LVAL.NUM);

  const a = v.cells[0];
  const b = v.cells[1];
  let res: boolean;
  if (op === "==") {
    res = lval_compare(a, b);
  } else {
    res = !lval_compare(a, b);
  }
  lval_del(v);
  return lval_number(res ? 1 : 0);
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

  v.cells[1].type = LVAL.SEXPR;
  v.cells[2].type = LVAL.SEXPR;

  let res: lval;
  if (v.cells[0].num > 0) {
    res = lval_eval(env, lval_pop(v, 1));
  } else {
    res = lval_eval(env, lval_pop(v, 2));
  }
  lval_del(v);
  return res;
}
function buildin_print(env: lenv, v: lval) {
  lassert(
    v,
    v.cells.length > 0,
    "Function '%s' passed empty arguments!",
    "print"
  );

  for (let i = 0; i < v.cells.length; i++) {
    lval_print(v.cells[i]);
    if (i != v.cells.length) {
      stdoutWrite(" ");
    }
  }
  stdoutWrite("\n");
  return lval_sexpr();
}
function buildin_load(env: lenv, v: lval) {
  lassert_num("load", v, 1);
  lassert_type("load", v, 0, LVAL.STR);

  try {
    let program: INode = compiler.loadfile(v.cells[0].str);
    const sexpr = lval_read(program);
    while (sexpr.cells.length) {
      const a = lval_pop(sexpr, 0);
      const res = lval_eval(env, a);
      if (res.type != LVAL.ERR) {
        lval_println(res);
        continue;
      } else {
        program = null;
        lval_del(sexpr);
        return res;
      }
    }
    program = null;
    lval_del(sexpr);
    return lval_sexpr();
  } catch (error) {
    return lval_err(error);
  }
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
  // const res = op.func(env, v);
  const res = lval_call(env, v, op);

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
function lval_call(env: lenv, v: lval, op: lval) {
  if (op.func) return op.func(env, v);

  const count = op.formals.cells.length;
  const total = v.cells.length;
  while (v.cells.length) {
    if (!op.formals.cells.length) {
      lval_del(v);
      lval_del(op);
      return lval_err(
        "Function '%s' passed too much arguments! Expect %d, Got %d",
        ["call", count, total]
      );
    }
    let keyVal = lval_pop(op.formals, 0);
    if (keyVal.sym === "&") {
      if (
        op.formals.cells.length != 1 &&
        op.formals.cells[0].type === LVAL.SYM
      ) {
        lval_del(keyVal);
        lval_del(op);
        lval_del(v);
        return lval_err(
          "Function '%s' passed '&' must followed by one symbol!",
          ["call"]
        );
      }
      lval_del(keyVal);
      keyVal = lval_pop(op.formals, 0);
      const elseVals = buildin_list(env, v);
      lenv_def(op.env, keyVal, elseVals);
      lval_del(keyVal);
      keyVal = null;
      break;
    }
    let valVal = lval_pop(v, 0);
    lenv_def(op.env, keyVal, valVal);
    keyVal = valVal = null;
  }
  lval_del(v);
  // 判别变量中如果是'余'变量，则为其添加一个qexpr
  if (op.formals.cells.length && op.formals.cells[0].sym === "&") {
    if (op.formals.cells.length != 2 && op.formals.cells[1].type === LVAL.SYM) {
      return lval_err("Function '%s' passed '&' must followed by one symbol!", [
        "call",
      ]);
    }
    lval_del(lval_pop(op.formals, 0));
    let keyVal = lval_pop(op.formals, 0);
    let valVal = lval_qexpr();
    lenv_def(op.env, keyVal, valVal);
    lval_del(keyVal);
    lval_del(valVal);
    keyVal = valVal = null;
  }
  if (op.formals.cells.length) {
    return lval_copy(op);
  } else {
    op.env.paren = env;
    return buildin_eval(op.env, lval_add(lval_qexpr(), lval_copy(op.body)));
  }
}

function lval_expr_read(ast: INode) {
  let x: lval;
  if (ast.type === ">") x = lval_sexpr();
  else if (ast.type === "sexpr") x = lval_sexpr();
  else if (ast.type === "qexpr") x = lval_qexpr();
  for (let i = 0; i < ast.children.length; i++) {
    if (ast.children[i].content === "(") continue;
    if (ast.children[i].content === ")") continue;
    if (ast.children[i].content === "{") continue;
    if (ast.children[i].content === "}") continue;
    if (ast.children[i].type === "comment") continue;
    const a = lval_read(ast.children[i]);
    x = lval_add(x, a);
  }
  return x;
}

function lval_read(ast: INode) {
  if (ast.type === "number") return lval_check_number(ast.content);
  if (ast.type === "symbol") return lval_sym(ast.content);
  if (ast.type === "string") return lval_escape_doublequote_str(ast.content);

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
  buildin_env(env, "\\", buildin_lambda);
  buildin_env(env, ">", buildin_gt);
  buildin_env(env, ">=", buildin_gte);
  buildin_env(env, "<", buildin_lt);
  buildin_env(env, "<=", buildin_lte);
  buildin_env(env, "==", buildin_eq);
  buildin_env(env, "!=", buildin_neq);
  buildin_env(env, "if", buildin_if);
  buildin_env(env, "print", buildin_print);
  buildin_env(env, "load", buildin_load);
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
  lenv_del(env);
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
    case LVAL.STR: {
      stdoutWrite('"');
      stdoutWrite(a.str);
      stdoutWrite('"');
      return;
    }
    case LVAL.FUNC:
      if (a.func) {
        return stdoutWrite(ltype_name(LVAL.FUNC));
      } else {
        stdoutWrite("\\");
        stdoutWrite(" ");
        lval_print(a.formals);
        stdoutWrite(" ");
        lval_print(a.body);
      }
      break;
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
