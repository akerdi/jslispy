# 制作jslisp

本教程使用子仓库([compiler](https://github.com/akerdi/compiler)), 通过compiler得到读取后的虚拟状态树数据: 见`INode`结构。

其中也使用另外两个js原生功能:
1. util.format 来组合字符串格式化
2. process.stdout / process.stdin

下面就来说明本教程制作过程。

## [1. 最简易的计算器功能](./lesson1.md)
## 2. QEXPR
## 3. ENV
## 4. Lambda
## 5. Order/Compare/If
## 6. String/Load file
## 7. Library