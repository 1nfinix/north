---
description: "叠在 dsh-base 和 dsh-web-app 之上的诺思发行层：品牌、局域网模型、办公预设与技能、收紧的权限，以及关闭遥测；面向诺思的管理员和维护者。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-north-bundle

[English](README.md) | 中文

## 概述

本配置包把桌面版组合变成诺思（North）。它替换品牌，把默认模型指向公司的 OpenAI 兼容局域网网关，加入「办公助手」预设作为默认值并挂载诺思写作技能，去掉「完全权限」预设，禁用终端服务、插件管理和「设置 → 内置插件」页，普通同事看不到终端和插件页，并禁用所有向 DeepSeek 上报的遥测和反馈。桌面版 profile 把它列在两个上游配置包之后。

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

`north-lan` 提供者在启动时读取以下变量；诺思桌面版从安装目录下的 `resources/north.env` 加载它们。

| 变量 | 含义 | 默认值 |
|---|---|---|
| `NORTH_LLM_BASE_URL` | 网关地址，以 `/v1` 结尾 | `http://127.0.0.1:8000/v1` |
| `NORTH_LLM_MODEL` | 网关提供的模型 id | `north-default` |
| `NORTH_LLM_API_KEY` | 网关要求时填写的 key | `EMPTY`（桌面版设置） |
| `NORTH_LLM_DISPLAY_NAME` | 模型选择器中显示的名称 | `模型` |
| `NORTH_LLM_CONTEXT_WINDOW` | 上下文长度（token） | `32768` |
| `NORTH_LLM_MAX_TOKENS` | 输出上限（token） | `8192` |

用户在「模型设置」页保存提供者后，会把具体值写入自己的 profile 补丁，此后覆盖本层的设置。

### 预装侧边栏

本层以 `better-sidebar` 行挂载第三方插件 [`dsh-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar)；`package.json` 锁定其确切版本，桌面版运行时随之打包，无需在插件页安装。它在右侧边栏和底部工作台提供文件树、编辑器、Git 变动、任务和侧边对话。它的终端页依赖宿主终端服务，该服务启动的用户 shell 不受沙箱和审批策略限制；本层禁用 `terminal-controller` 行，并通过 `tabsEnabled` 默认关闭该终端页，因此两个终端都不出现；用户在侧边栏设置中重新开启该页时，它显示为不可用。其文件接口可访问操作系统用户能访问的任何路径，不受会话工作区和审批策略限制。本包还列出侧边栏声明为 peer 的工作区包，使 pnpm 链接这些包而不是安装注册表副本。升级时修改锁定版本并运行 `pnpm install`。

### 内网离线

诺思运行在不能访问互联网的网络中，因此本层关闭所有访问公网的条目：网页搜索与 HTTP 抓取提供者、DeepSeek 模型，以及只附加在 DeepSeek 官方 API 请求上的字段。`web` 服务保留且不固定提供者，使标准预设仍能加载；其中的 `web_search` 和 `web_fetch` 工具仍会列出，每次调用都返回不可用错误。

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

间接影响，通过本层配置的条目：`dsh-system-prompt` 以诺思的角色设定开头并去掉 harness 身份声明，办公预设加上自己的中文角色设定，默认路由为局域网模型。

#### KV Cache 影响

本层不直接添加请求内容；两段角色文本在一次部署中固定不变，因此留在缓存前缀内。

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
