---
description: "诺思发行版内置的六个中文办公写作技能：周报汇报、会议纪要、公文通知、邮件起草、翻译和长文总结。"
kind: "package-reference"
---

# @deepseek-ai/dsh-north-skill-writing

[English](README.md) | 中文

## 概述

本包注册六个内置技能，引导模型完成日常中文办公写作：`weekly-report`、`meeting-minutes`、`official-notice`、`email-draft`、`translation` 和 `long-summary`。用户需要 Word、Excel 或 PowerPoint 文件时，每个技能都会转交给 Office 技能。诺思配置包以 `north-skill-writing` 行在全局挂载它。

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

在任何提供 `ctx.skills` 的组合中挂载本插件。用户用 `/<名称>` 调用技能；请求与技能描述匹配时，模型会自行加载。`assetRoot` 可指向另一个包含 `<名称>/SKILL.md` 文件夹的目录，供把资源解包到其他位置的打包应用使用。

-----

<a id="understand-the-implementation"></a>
## 了解实现

<details>
<summary>实现细节——点击展开</summary>

名为 `north-writing` 的提供者以内置等级列出六个候选，因此用户自己 `.dsh/skills` 或 `~/.dsh/skills` 中的同名技能会覆盖内置版本。技能正文按需加载；卸载时移除全部候选。

</details>

-----

<a id="further-exploration"></a>
## 延伸阅读

- [skill](../../skill/skill/README.zh.md)——技能注册表、等级和提供者约定。
- [skill-office](../../skill/skill-office/README.zh.md)——这些技能转交的 Office 技能。

-----

<a id="model-experience"></a>
## 模型体验

间接影响：`dsh-tool-skill` 在技能目录中列出六个写作技能，并通过 `skill(name)` 返回所选技能的正文。

#### KV Cache 影响

目录行在各轮之间保持不变，因此留在缓存的提示前缀内；加载的正文像普通工具结果一样追加到历史中。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

- **以中文为主**——技能按中文办公习惯编写；英文输出沿用相同结构，但没有单独的英文写作规范。
- **不代发**——`email-draft` 只生成文本；诺思不连接邮件服务器。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录——点击展开</summary>

无。

</details>
