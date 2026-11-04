---
description: "叠在 dsh-base 和 dsh-web-app 之上的诺思发行层：品牌、局域网模型、办公预设、技能与浏览器工具、收紧的权限，以及关闭遥测；面向诺思的管理员和维护者。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-north-bundle

[English](README.md) | 中文

## 概述

本配置包把桌面版组合变成诺思（North）。它替换品牌，同时提供公司的 OpenAI 兼容局域网网关和 DeepSeek 官方 API 两类模型，配置了 DeepSeek key 时默认使用 DeepSeek，加入「办公助手」预设作为默认值并挂载诺思写作技能与 Playwright 浏览器工具，去掉「完全权限」预设，禁用终端服务、插件管理和「设置 → 内置插件」页，普通同事看不到终端和插件页，并禁用所有向 DeepSeek 上报的遥测和反馈。桌面版 profile 把它列在两个上游配置包之后。

## 目录

- [使用本包](#use-this-package)
- [了解实现](#understand-the-implementation)
- [延伸阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

### 模型设置

`north-lan` 提供者在启动时读取以下变量；诺思桌面版从安装目录下的 `resources/north.env` 加载它们。第二个网关 `north-lan-2` 读取前缀为 `NORTH_LLM2_` 的同名变量（回退值为 `http://127.0.0.1:8001/v1`、`north-default-2` 和 `内网模型 2`）；随桌面版分发的环境文件把它标为 MiniMax-M2.7。Windows 和 Linux 上没有 DeepSeek key 时，新会话使用第二个网关。两个内网提供者都留在模型选择器中。

| 变量 | 含义 | 默认值 |
|---|---|---|
| `NORTH_LLM_BASE_URL` | 网关地址，以 `/v1` 结尾 | `http://127.0.0.1:8000/v1` |
| `NORTH_LLM_MODEL` | 网关提供的模型 id | `north-default` |
| `NORTH_LLM_API_KEY` | 网关要求时填写的 key | `EMPTY`（桌面版设置） |
| `NORTH_LLM_DISPLAY_NAME` | 模型选择器中显示的名称 | `内网模型` |
| `NORTH_LLM_CONTEXT_WINDOW` | 上下文长度（token） | `32768` |
| `NORTH_LLM_MAX_TOKENS` | 输出上限（token） | `8192` |

用户在「模型设置」页保存提供者后，会把具体值写入自己的 profile 补丁，此后覆盖本层的设置。

诺思桌面版还从该文件读取 `NORTH_PROXY` 和 `NORTH_PROXY_NETWORK`。尚未设置任何代理变量、且本机有以 `NORTH_PROXY_NETWORK` 开头的 IPv4 地址时，它把 `HTTP_PROXY` 和 `HTTPS_PROXY` 设为 `NORTH_PROXY`，这台电脑的模型和网页请求都经过代理；其他电脑直连。

### 预装侧边栏

`workspace-controller` 行设置 `documentsSubdirectory: North`，首次使用时默认工作区建在 `<Documents>/North/default-workspace`。已有默认工作区的安装保持原位置。

本层以 `better-sidebar` 行挂载第三方插件 [`dsh-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar)；`package.json` 锁定其确切版本，桌面版运行时随之打包，无需在插件页安装。它在右侧边栏和底部工作台提供文件树、编辑器、Git 变动、任务和侧边对话。它的终端页依赖宿主终端服务，该服务启动的用户 shell 不受沙箱和审批策略限制；本层禁用 `terminal-controller` 行，并通过 `tabsEnabled` 默认关闭该终端页，因此两个终端都不出现；用户在侧边栏设置中重新开启该页时，它显示为不可用。其文件接口可访问操作系统用户能访问的任何路径，不受会话工作区和审批策略限制。本包还列出侧边栏声明为 peer 的工作区包，使 pnpm 链接这些包而不是安装注册表副本。升级时修改锁定版本并运行 `pnpm install`。

### 内网与互联网

诺思在能否访问互联网的网络中都可以使用。`llm-deepseek` 行在两个内网网关之外加入 DeepSeek 官方模型（V4.1 Flash 和 V4 Pro）。其 key `DEEPSEEK_API_KEY` 经凭据服务解析：先取「模型设置」页保存的 key，再取启动环境（macOS 桌面版读取登录 shell 的变量，`resources/north.env` 补上未设置的变量），最后取 `.env` 文件；没有 key 时模型选择器不列出 DeepSeek 模型。端点固定为 `https://api.deepseek.com/anthropic`，因为适配器使用 Messages 协议，OpenAI 风格的 `DEEPSEEK_BASE_URL` 否则会成为请求根地址。在 macOS 上，或启动环境带有 `DEEPSEEK_API_KEY` 时，新会话默认使用 DeepSeek（模型由 `NORTH_DEEPSEEK_MODEL` 指定，默认 `deepseek-v4-pro`），否则默认使用 `north-lan-2`（随桌面版分发时为 MiniMax-M2.7）；在设置中保存的模型优先于两者。

网页工具通过 DeepSeek Search API（`deepseek-search-api`，每次搜索一个请求）搜索，并通过本地 HTTP 提供者抓取公开网页；不能访问互联网时，每次 `web_search` 和 `web_fetch` 调用都返回不可用错误。DeepSeek 账号登录、需要完整模型轮次的 `web-search-deepseek`，以及 DeepSeek 请求可附带的可选字段（会话日志上传和插件清单）保持关闭，DeepSeek 只收到模型和搜索请求本身。

### 浏览器工具

宿主配置层为诺思桌面版与网页版会话挂载 `dsh-browser-use` 和 Playwright MCP 提供者。每个活动会话各启动一个 MCP 子进程；浏览器在首次调用浏览器工具时才启动。提供者以无头模式运行，并读取 `NORTH_BROWSER_PATH`。桌面版读取 `resources/north.env` 后，若该变量未设置，则在 Windows 上依次查找系统 Edge、系统 Chrome、用户 Chrome、用户 Edge，在 macOS 上依次查找系统 Chrome、系统 Edge，再查找 `~/Applications` 下的同名浏览器。管理员可在 `north.env` 中设置浏览器程序的完整路径，覆盖自动探测。没有探测到或配置路径时，提供者省略 `executablePath`；缺少浏览器只会使浏览器工具调用报错。固定版本的 Playwright MCP 不打开 `file://` 页面，因此浏览器技能使用本机 `127.0.0.1` 服务。

-----

<a id="understand-the-implementation"></a>
## 了解实现

<details>
<summary>实现细节——点击展开</summary>

`cordis.patch.yml` 存放按 id 覆盖的条目，`presets/office.patch.yml` 插入预设。每个补丁都会替换对应条目的整个 `config`。办公预设保留 shell 工具，因为 Office 技能要通过它们运行内置的 Python。

</details>

-----

<a id="further-exploration"></a>
## 延伸阅读

- [web-app](../../bundle/web-app/README.zh.md)——本层覆盖的条目。
- [ui-brand](../ui-brand/README.zh.md) 和 [skill-writing](../skill-writing/README.zh.md)——本层挂载的包。

-----

<a id="model-experience"></a>
## 模型体验

本层配置让 `dsh-system-prompt` 以诺思角色设定开头并去掉 harness 身份声明，加入办公预设的中文角色设定，并选取默认模型路由。会话初始化后，Playwright MCP 工具目录向模型提供 `mcp__playwright-mcp__*` 的说明和 JSON schema。浏览器调用把参数、结果及准入的截图加入会话历史，增加 token 用量；内联图片字节不进入模型可见历史。

#### KV Cache 影响

两段角色文本在一次部署中固定不变，因此留在缓存前缀内。浏览器工具目录不变时，工具定义前缀可复用；浏览器结果追加到历史中，工具目录变化则可能降低前缀复用率。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

- **隐藏不等于禁止**——用户编辑自己的 profile 补丁后可以重新启用任何条目；本层只设默认值，不是安全边界。
- **只有一个网关**——本层只声明一个局域网提供者；更多路由需要通过「模型设置」页或另一个补丁添加。
- **账户服务保持挂载**——桌面端启动时读取 Gateway 账户状态，因此 `deepseek-account` 与 `account-controller` 保持启用；登录入口只在已隐藏的账户设置中，无互联网时登录会失败。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录——点击展开</summary>

无。

</details>
