const compiler = require("./compiler/compiler")

function stdoutWrite(prompt:string) {
  process.stdout.write(prompt)
}

enum LVAL {
  ERR, NUM, SYM, SEXPR
}

class lval {
  type:LVAL

  num:number
  err:string
  sym:string

  cells:lval[]
}
function lval_number(num:number) {
  const _lval = new lval()
  _lval.type = LVAL.NUM
  _lval.num = num
  return _lval
}
function lval_err(err:string) {
  const _lval = new lval()
  _lval.type = LVAL.ERR
  _lval.err = err
  return _lval
}
function lval_sym(sym:string) {
  const _lval = new lval()
  _lval.type = LVAL.SYM
  _lval.sym = sym
  return _lval
}
function lval_sexpr() {
  const _lval = new lval()
  _lval.type = LVAL.SEXPR
  _lval.cells = []
  return _lval
}

function lval_add(x:lval, a:lval) {
  x.cells.push(a)
  return x
}
function lval_pop(x:lval, index:number) {
  return x.cells.splice(index, 1)[0]
}
function lval_take(x:lval, index:number) {
  const a = lval_pop(x, index)
  x = null
  return a
}
function build_op(v:lval, sym:string) {
  for (let i = 0; i < v.cells.length; i++) {
    if (v.cells[i].type !== LVAL.NUM) {
      return lval_err("operation on non-number!")
    }
  }
  let x = lval_pop(v, 0)
  while (v.cells.length) {
    const y = lval_pop(v, 0)
    if (sym === "+") x.num += y.num
    if (sym === "-") x.num -= y.num
    if (sym === "*") x.num *= y.num
    if (sym === "/") {
      if (y.num === 0) {
        x = lval_err("Division on zero!")
        break
      }
      x.num /= y.num
    }
  }
  return x
}
function lval_expr_eval(v:lval) {
  let i
  for (i = 0; i < v.cells.length; i ++) {
    v.cells[i] = lval_eval(v.cells[i])
  }
  for (i = 0; i < v.cells.length; i++) {
    if (v.cells[i].type === LVAL.ERR) {
      return v.cells[i]
    }
  }
  if (!v.cells.length) return v
  if (v.cells.length == 1) return lval_take(v, 0)
  const op = lval_pop(v, 0)
  if (op.type != LVAL.SYM) {
    return lval_err("sexpr must start with symbol!")
  }

  const res = build_op(v, op.sym)
  return res
}
function lval_eval(v:lval) {
  if (v.type === LVAL.SEXPR) return lval_expr_eval(v)
  return v
}

function lval_expr_read(ast) {
  let x
  if (ast.type === ">") x = lval_sexpr()
  else if (ast.type === "sexpr") x = lval_sexpr()
  for (let i = 0; i < ast.children.length; i++) {
    if (ast.children[i].content === "(") continue
    if (ast.children[i].content === ")") continue
    if (ast.children[i].content === "{") continue
    if (ast.children[i].content === "}") continue
    const a = lval_read(ast.children[i])
    x = lval_add(x, a)
  }
  return x
}

function lval_read(ast) {
  if (ast.type === "number") return lval_number(Number(ast.content))
  if (ast.type === "symbol") return lval_sym(ast.content)

  return lval_expr_read(ast)
}

function lval_expr_print(a:lval) {
  for (let i = 0; i < a.cells.length; i++) {
    lval_print(a.cells[i])
    if (i != (a.cells.length-1)) {
      stdoutWrite(" ")
    }
  }
}
function lval_print(a:lval) {
  switch (a.type) {
    case LVAL.ERR: return stdoutWrite(a.err)
    case LVAL.NUM: return stdoutWrite(a.num+"")
    case LVAL.SYM: return stdoutWrite(a.sym)
    case LVAL.SEXPR:
      return lval_expr_print(a)
  }
}
function lval_println(a:lval) {
  lval_print(a)
  stdoutWrite("\n")
}


function main() {
  process.stdin.setEncoding("utf8")
  stdoutWrite("> ")
  process.stdin.on("data", (chunk:any) => {
    const result = chunk.replace(/[\r\n]/g, '')
    if (!!result) {
      console.log(result)
      try {
        const ast = compiler.compiler(result)
        // 开始lval_read
        const expr = lval_read(ast)
        // 开始lval_eval
        const res = lval_eval(expr)
        // 打印expr
        lval_println(res)

      } catch (error) {
        console.error(error)
      }

      stdoutWrite("> ")
    }
  })
}

main()