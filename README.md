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

+ [Compiler 教程](https://github.com/akerdi/compiler)
    - [词法分析&AST](./compiler/tech/README.md#词法分析ast)
    - [词法分析 - tokenizer](./compiler/tech/README.md#词法分析---tokenizer)
    - [虚拟树生成 - aster](./compiler/tech/README.md#虚拟树生成---aster)
    - [Compiler](./compiler/tech/README.md#compiler)

+ [JSLispy 教程](./tech/README.md)
    - [最简易的计算器功能](./tech/lesson1.md)
    - [QEXPR 和内置方法](./tech/lesson2.md)
    - [ENV 环境上下文](./tech/lesson3.md)
    - [Lambda 表达式](./tech/lesson4.md)
    - [Order/Compare/If](./tech/lesson5.md)
    - [String/Load library](./tech/lesson6.md)
    - [Library](./tech/lesson7.md)

## 相关

[clispy](https://github.com/akerdi/buildyourownlisp)

[Build Your Own Lisp](https://buildyourownlisp.com/)
