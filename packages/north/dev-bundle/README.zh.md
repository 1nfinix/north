---
description: "North 开发能力层：开发工具、编程预设和模型请求头。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-north-dev-bundle

[English](README.md) | 中文

## 概述

North 在办公配置包之后应用本开发能力层，启用终端、插件设置、编程预设、可选的完全权限、模型请求头与开发技能。新会话默认使用办公助手；所有用户都可选择编程预设。

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

桌面 profile 在 North 配置包后列出本包。它最多注册 `north-lan`、`north-lan-2`、`north-lan-3` 和 `north-lan-4` 四条内网模型线路。只有设置了对应的 `NORTH_LLM{,2,3,4}_BASE_URL`，线路才会显示。第四条读取 `NORTH_LLM4_` 变量，模型标识和显示名的回退值为 `north-default-4` 和 `内网模型 4`。NORTH_LLM_HEADERS、NORTH_LLM2_HEADERS、NORTH_LLM3_HEADERS 和 NORTH_LLM4_HEADERS 是字符串值的 JSON 对象。桌面环境加载器在 Cordis 解析补丁前展开 NORTH_ 占位符。占位符缺失或 JSON 无效会阻止启动。某条线路未设置请求头变量时，该提供者收到空请求头对象。

有 DEEPSEEK_API_KEY 时新会话默认使用 DeepSeek 官方模型；否则依次选择首条已配置的内网线路，四条都未配置时回落官方模型。初始沙箱仍为 workspace-write，审批仍为 ask；用户可以选择 danger-full-access。

每个内置代理预设都为独立的压缩后端配置四条线路的精确策略。未注册线路的策略不会匹配任何模型，因此不会生效。每条策略读取对应的 `NORTH_LLM*_MODEL` 和 `NORTH_LLM*_MAX_TOKENS`，模型标识与输出上限的回退值和提供者一致。小上下文模型的输出上限设置合理时，压缩余量会随之缩小；若配置更大的输出上限，仍需提供足够大的上下文窗口。

本包还装载自身的 `north-dev-session-headers` 插件。必填的 `headers` 列表指定写入当前 Session id 的 HTTP 头名；发行配置使用 `X-Session-Id` 与 `x-session-affinity`。模型调用没有 Session id 时，每次调用新建一个随机 UUID，并写入所有配置的头名。已有的模型配置请求头和其他插件贡献的请求头继续保留。

-----

<a id="understand-the-implementation"></a>
## 了解实现

每个目标条目都会替换前一层的完整配置，因此模型提供者条目重写 North 提供者的全部字段。根层的 `compaction-basic` 条目已禁用，配置补丁也无法直接修改预设中的嵌套插件条目，因此各预设声明需要完整覆盖。内置技能使用独立的注册表提供者，并复用现有的用户技能根目录。Session 请求头插件通过 `ctx.on()` 监听 `llm-pi-ai/request-headers` 并调用 `next()`；仅装载本配置包时生效。

-----

<a id="further-exploration"></a>
## 延伸阅读

- [North 运维说明](../../../NORTH.md)
- [开发技能](../skill-dev/README.zh.md)

-----

<a id="dev-note"></a>
## 开发备注

组合测试核对恢复的条目、权限预设、模型选择、精确压缩策略、请求头表达式及 Session 请求头插件配置。

<a id="model-experience"></a>
## 模型体验

本配置层通过系统提示词、模型提供者和预设条目间接影响模型输入。

#### KV Cache effect

同一部署中的提示词与预设定义稳定；模型结果追加到会话历史。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

- 自定义请求头能否被网关接受取决于部署的网关，需要安装后验证。

-----
