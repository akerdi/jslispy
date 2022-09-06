# jslispy

使用js 覆写[clispy](https://github.com/shaohung001/buildyourownlisp)

## Language

Typescript

## 开发

    cp .vscode/launch.example.json .vscode/launch.json // 然后按键盘 F5
或者

    yarn dev

## 运行

    yarn build && node dist/main.js

## 目标

- [ ] Library
- [ ] String/FILE
- [ ] ORDER/COMPARE/IF
- [ ] Function
- [ ] Env
- [x] Q-Express
- [x] S-Express
- [x] AST
- [x] REPL
- [x] init

## 已知遗留Bug

- [ ] lval_del 删除置空对象，没有效果

解决方式为: 将数据对象放到容器对象，传输过程可以删除该数据对象，最后再删除容器对象的方式来实现置空

## Usage

    > + 3 2
    > + (* 30 20) (eval { tail { 10 - 20 10  } })

## Recommend Platform

IDE: vscode
Node: 10.20.0
Platform: darwin

## History

- 20220906 qexpr
- 20220317 init
