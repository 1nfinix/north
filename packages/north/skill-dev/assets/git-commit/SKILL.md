---
name: git-commit
description: 根据实际 diff 拟定 Conventional Commits 提交信息，识别应拆分的改动并核对暂存内容。
---

# 提交信息与拆分

## 何时使用

准备为已完成的改动写提交信息，或需要判断一次提交是否混入多项独立工作时使用。生成建议不等于授权执行提交；仅在用户已授权时运行 `git commit`。

## 分步流程

1. 读取仓库提交约定和近期历史，确认是否有固定前缀、scope 或 issue 格式。
2. 以下命令在 PowerShell 和 Git Bash 中均可运行；分别检查工作区、暂存区和近期提交：

   ```text
   git status --short
   git diff --stat
   git diff --cached --stat
   git diff --cached --check
   git log -5 --oneline
   ```

3. 逐文件阅读实际 diff，用 `git diff --cached -- path/to/file` 核对将进入本次提交的内容；未暂存的改动不能写进本次提交描述。
4. 按可独立回退的行为划分提交。若一组变更缺少另一组就无法构建或测试，则合并；无关修复分开建议。
5. 选用 `feat`、`fix`、`docs`、`test`、`refactor`、`chore` 等 Conventional Commits 类型，使用祈使式短标题描述用户可观察的变化或明确的内部目标。
6. 若破坏兼容性，核对迁移说明，并在建议正文写明影响与迁移方式。提交前重看暂存区；按仓库要求运行相关检查和钩子。

## 检查清单

- [ ] 标题类型符合实际改动，不把修复写成重构。
- [ ] scope 或仓库固定前缀符合本仓库约定。
- [ ] 标题能说明结果，且没有含糊的“更新代码”。
- [ ] 正文解释必要的行为变化、原因和迁移影响。
- [ ] 暂存文件与标题属于同一逻辑单元。
- [ ] 未暂存文件和未追踪文件未被误写入提交说明。
- [ ] `git diff --cached --check` 通过，必要测试有真实结果。
- [ ] 提交内容与提交信息均不含凭据、个人信息或真实内网数据。

## 输出格式

````markdown
## 建议拆分
1. 范围：`path/to/file`、`path/to/test`
   原因：这组改动可独立验证和回退。

## 提交信息
```text
fix(scope): describe the behavior

Explain the reason and any migration impact.
```

## 提交前核对
- 已暂存：文件列表
- 已运行：`命令` → 结果
- 待补：未完成的验证
````

## 常见陷阱

- 只看 `git diff` 而忽略实际 `--cached` 内容。
- 为凑提交数量把必须同时生效的生产代码和测试拆开。
- 自动提交或绕过钩子，即使用户只要求拟定信息。
