# jslispy

使用 js 覆写[clispy](https://github.com/akerdi/buildyourownlisp)

## Language

Typescript

## 开发

    cp .vscode/launch.example.json .vscode/launch.json // 然后按键盘 F5

或者

    yarn dev

## 运行

    yarn build && node dist/main.js

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

## Usage

    > + 3 2
    > + (* 30 20) (eval (eval { tail { 10 - 20 10  } })) // + (* 30 20) (eval (tail { 10 - 20 10  }) )

eval { tail { 10 - 20 10 } }

## Recommend Platform

IDE: vscode
Node: 10.20.0
Platform: darwin

## History

- 20220906 qexpr
- 20220317 init

## [jslispy 教程](./tech/README.md)
