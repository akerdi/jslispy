# jslispy

使用 Typescript 编译 lisp 语法，并支持运行时环境。

## 语言

Typescript

## 运行

`npm i` 先安装开发必要的库

    cp .vscode/launch.example.json .vscode/launch.json // 然后按键盘 F5

> windows 用户修改文件(.vscode/launch.json) - runtimeArgs 内容为["run", "dev:win"]

或者

    yarn dev // windows执行yarn dev:win
    yarn dev:lesson1 // 执行第一课

## 目标

- [x] Library
- [x] String/Load file
- [x] Order/Compare/If
- [x] Function
- [x] Env
- [x] Q-Express
- [x] S-Express
- [x] AST
- [x] REPL
- [x] init

## 使用

    > + 3 2
    > + (* 30 20) (eval (eval { tail { 10 - 20 10  } })) // + (* 30 20) (eval (tail { 10 - 20 10  }) )

eval { tail { 10 - 20 10 } }

## 推荐平台

IDE: vscode
Node: 10.20.0
Platform: darwin

## 历史

- 20220921 lesson1
- 20220906 qexpr
- 20220317 init

## 教程

[compiler 教程](https://github.com/akerdi/compiler)

[jslispy 教程](./tech/README.md)

## 相关

[clispy](https://github.com/akerdi/buildyourownlisp)

[Build Your Own Lisp](https://buildyourownlisp.com/)
