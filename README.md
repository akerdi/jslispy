# jslispy

使用 Javascript 实现语言`lisp`，你会学到一门语言制作过程，简单而蕴含丰富知识！

## 语言

Typescript

## 运行

    $ git clone git@github.com:akerdi/jslispy.git
    $ git submodule update --init
    $ npm install
    $ npm run dev # windows 执行 npm run dev:win

`npm i` 先安装开发必要的库。如果需要方便的断点调试，执行下列操作

    cp .vscode/launch.example.json .vscode/launch.json
    // 然后按键盘 F5

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
