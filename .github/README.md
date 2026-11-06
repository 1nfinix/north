# North 诺思

North 是一款面向日常办公的 AI 桌面助手，基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（MIT）构建。它安装在 Windows 或 macOS 电脑上，连接局域网内的 vLLM 或 OpenAI 兼容模型网关；能访问互联网时，也可以使用 DeepSeek 官方模型。

[下载安装包](https://github.com/1nfinix/north/releases/latest) · [更新记录](../NORTH-CHANGELOG.md) · [维护说明](../NORTH.md)

## 能做什么

- **写作**：周报、会议纪要、公文、邮件、翻译、长文总结。
- **汇报 PPT**：按大纲生成汇报 PPT，可以套用单位自己的模板，也可以把 Word、Excel 转成 PPT。
- **文档处理**：读取、编辑和转换 Word、Excel、PowerPoint 与 PDF 文件。
- **图表与网页**：生成图表，制作简单网页，检查网页显示效果。
- **自定义技能**：把包含 `SKILL.md` 的文件夹放进 `%USERPROFILE%\.north\skills` 即可新增技能，输入 `/` 调用，不需要重启。

内置技能：周报 `/weekly-report`、会议纪要 `/meeting-minutes`、公文写作 `/official-notice`、邮件 `/email-draft`、翻译 `/translation`、长文总结 `/long-summary`、图表 `/chart`、网页检查 `/browser-check`、网页制作 `/frontend-page`、技能创建 `/skill-creator`、汇报 PPT `/ppt-report`。

## 安全与隐私

- 默认在工作区内读写文件，执行有风险的操作前会先征求同意；办公版不提供「完全权限」模式，也不开放终端和插件管理。
- 关闭遥测，不向开发者上报使用数据。
- 安装包不含任何模型地址或密钥。真实配置由管理员放在每台电脑的用户目录，只保存在本机。

## 安装

### Windows

1. 从 [Releases](https://github.com/1nfinix/north/releases/latest) 下载 `north-<版本>-win-x64-unsigned.exe`，可以用 PowerShell 的 `Get-FileHash` 核对发布说明里的 SHA-256。
2. 放好配置文件 `%USERPROFILE%\.north\north.env`（见下一节）。
3. 双击安装包。安装包未签名，如出现「Windows 已保护你的电脑」，点「更多信息」→「仍要运行」。
4. 打开 North，新建会话发一条消息，确认模型能回复。

升级时直接运行新安装包，用户目录里的配置和会话不会被覆盖。

### macOS

1. 从 [Releases](https://github.com/1nfinix/north/releases/latest) 下载与芯片对应的 DMG：Apple Silicon 选 `arm64`，Intel 选 `x64`。
2. 把配置文件放在 `~/.north/north.env`，打开 DMG，把应用拖入「应用程序」。
3. 未签名应用首次打开时，在「系统设置 → 隐私与安全性」点「仍要打开」；也可在终端执行以下命令，再打开应用。当前打包配置的 `productName` 是 `North`，更名后须使用实际应用名。

```sh
xattr -dr com.apple.quarantine "/Applications/North.app"
```

macOS 上按 [NORTH.md](../NORTH.md#管理员模型设置) 所述行为填写 `DEEPSEEK_API_KEY`，有 key 时新会话默认使用 DeepSeek 官方模型。升级时替换应用，`~/.north/north.env` 和会话保留。

## 配置模型

North 启动时按以下顺序读取配置，靠前的优先：

1. 已有环境变量；
2. 用户配置：Windows 为 `%USERPROFILE%\.north\north.env`，macOS 为 `~/.north/north.env`；
3. 安装包自带的 `resources/north.env`（只有说明，不含配置）。

以 [north.env.example](../apps/desktop/resources/north.env.example) 为模板复制一份到对应的用户目录，按实际网关修改。常用变量：

仅填写 `NORTH_LLM_BASE_URL` 或 `NORTH_LLM2_BASE_URL` 时，对应的局域网模型线路才会出现在选择器里；两条都未填写时，新会话的默认线路为 DeepSeek。填写配置后完全退出并重启 North。

| 变量 | 作用 |
|---|---|
| `NORTH_LLM_BASE_URL` / `NORTH_LLM2_BASE_URL` | 两条局域网模型线路的网关地址，以 `/v1` 结尾 |
| `NORTH_LLM_MODEL` / `NORTH_LLM2_MODEL` | 网关提供的模型 id |
| `NORTH_LLM_DISPLAY_NAME` / `NORTH_LLM2_DISPLAY_NAME` | 模型选择器里显示的名称 |
| `NORTH_LLM_CONTEXT_WINDOW`、`NORTH_LLM_MAX_TOKENS` 等 | 上下文长度与输出上限（token） |
| `NORTH_LLM_API_KEY` / `NORTH_LLM2_API_KEY` | 网关要求 key 时填写 |
| `NORTH_PROXY`、`NORTH_PROXY_NETWORK` | 本机 IPv4 以指定前缀开头时，经该代理访问模型 |
| `DEEPSEEK_API_KEY` | 能访问互联网时使用 DeepSeek 官方模型，也可以在「设置 → 模型」页填写 |
| `NORTH_BROWSER_PATH` | 浏览器自动探测失败时，指定浏览器程序的完整路径 |

修改配置后，完全退出 North 再打开即可生效。

## 从源码构建

需要 Node.js 24.9 或更高版本和 pnpm。

```sh
pnpm install
pnpm run build:artifacts
pnpm run package:desktop:win:x64:unsigned
```

本地打包会把 `apps/desktop/resources/north.env` 打进安装包，不要把含真实配置的安装包公开分发。本仓库的 [Windows](workflows/north-windows-desktop.yml) 与 [macOS](workflows/north-macos-desktop.yml) GitHub Actions 工作流只打包不含真实配置的安装包。

## 许可

North 沿用上游 DeepSeek Harness 的 [MIT 许可](../LICENSE)，第三方依赖许可见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。上游项目的说明见 [README.md](../README.md)。
