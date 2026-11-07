---
name: script-helper
description: 编写或审查 PowerShell、Shell 脚本；Windows 优先 PowerShell，加入输入校验、安全检查和 dry-run。
---

# 脚本辅助

## 何时使用

需要自动化文件处理、构建或重复操作，或审查现有 PowerShell/Shell 脚本时使用。Windows 目标优先 PowerShell；跨平台任务先确认两种 shell 的差异和所需工具是否存在。

## 分步流程

1. 列出输入、输出、影响范围、失败后状态及恢复办法。对删除、覆盖、部署等操作先确定授权和可逆性。
2. 在 PowerShell 或 Git Bash 中先用共同的仓库检查命令查看现状：

   ```text
   git status --short
   git diff --check
   git grep -n 'scriptName'
   ```

3. 选择项目现有脚本风格。PowerShell 显式使用参数和 `-LiteralPath`；Shell 对路径变量加双引号，并处理命令退出码。不要假设两个 shell 的路径分隔符、通配符和错误行为相同。
4. 给会修改数据的脚本加入预览模式。PowerShell 可用 `SupportsShouldProcess` 与 `-WhatIf`；Shell 可定义 `--dry-run`，打印将执行的动作而不执行写入。
5. 校验必填参数、目录范围和工具存在性；对含空格路径、空输入、已存在目标、部分失败分别设计处理。避免把秘密写到命令行、日志或回显。
6. 先运行语法或静态检查，再在临时目录执行 dry-run 和实际小样本；核对产物和失败后的恢复。仅在明确授权的目标目录执行真实操作。

## 检查清单

- [ ] 输入参数、默认值和允许范围明确。
- [ ] PowerShell 与 Git Bash 的命令示例分别适用于对应 shell。
- [ ] 空格、特殊字符与通配符不会改变目标路径。
- [ ] dry-run 不执行任何写入，预览足以审查影响。
- [ ] 覆盖或删除前有授权和恢复路径。
- [ ] 失败时返回非零状态，不继续执行依赖步骤。
- [ ] 凭据通过安全来源读取，日志不输出秘密值。
- [ ] 在临时样本上验证成功、空输入与部分失败。

## 输出格式

```markdown
## 脚本用途
- 平台与 shell：
- 输入、输出和影响目录：
- 预览：PowerShell `./script.ps1 -WhatIf` 或 Git Bash `./script.sh --dry-run`

## 实现与验证
- 文件：`path/to/script`
- 已运行：`命令` → 结果
- 恢复：失败时如何回到原状态
- 未验证：平台或环境
```

## 常见陷阱

- 在 Git Bash 和 PowerShell 中混用路径、引号或错误处理语法。
- dry-run 仍创建目录、下载文件或修改权限。
- 以 `rm -rf`、`Remove-Item -Recurse` 处理未经校验的空变量或根目录。
