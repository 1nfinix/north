---
description: "诺思发行版内置的六个中文办公写作技能：周报汇报、会议纪要、公文通知、邮件起草、翻译和长文总结。"
kind: "package-reference"
---

# @deepseek-ai/dsh-north-skill-writing

[English](README.md) | 中文

## 概述

本包注册六个内置技能，引导模型完成日常中文办公写作：`weekly-report`、`meeting-minutes`、`official-notice`、`email-draft`、`translation` 和 `long-summary`。用户需要 Word、Excel 或 PowerPoint 文件时，每个技能都会转交给 Office 技能。它的「设置 → 技能」分区按 `/` 菜单读取的同一份清单列出当前生效的技能，诊断用户技能文件夹，并打开该文件夹，用户把技能文件夹复制进去即可添加。诺思配置包以 `north-skill-writing` 行在全局挂载它。

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

### 技能设置分区

把 `userSkillRoot` 设为文件系统技能提供者作为用户 DSH 根目录扫描的绝对路径；诺思配置包传入 `dshHomePath('skills')`。宿主提供 `webServer` 和 `connection` 后，插件提供需要认证的 `GET /north-skills`。接口按默认工作目录和默认 Agent 预设读取 `ctx.skills.snapshot()`，这与会话技能目录为没有运行中 Agent 的会话读取的注册表视图相同，`/` 菜单再从中保留允许用户调用的条目。`effective` 的每一行都是在同名技能中胜出的技能，带有 `source`、`provider`、可选的 `path` 和 `invocation`；`complete: false` 表示有提供者没有完成发现，列表可能缺少技能。项目 `.dsh/skills`、项目和用户 `.agents/skills`、自定义根目录、用户 DSH 根目录、运行时注册和内置技能之间的优先级由注册表决定，接口不重复实现。

接口还会在用户文件夹不存在时先创建它，并按提供者的 `parseSkillFrontmatter` 和发现规则诊断其中的顶层条目：与提供者处理用户 DSH 根目录一样跳过 `.system`，读取其余所有条目，包括点文件。`invalid` 列出提供者会跳过的条目和原因：缺少 `SKILL.md`、缺少 `name` 或 `description`、名称不是 kebab-case、调用键无效，或条目无法读取（例如指向不存在目标的符号链接；扩展名既不为空也不是 `.md` 的此类链接会被跳过，因为提供者从不把这类文件当作技能）。`inactive` 列出没有解析到自身文件的可用文件夹技能：同名技能在别处胜出（由 `winner` 给出），或没有任何来源解析出这个名称。单个条目无法读取不会使整个列表失败；只有技能目录或用户文件夹本身无法读取时，接口才返回 500，记录原因，并在响应中给出用户文件夹路径。

浏览器部分在设置中「Agent 预设」之后增加「技能」分区：先显示文件夹以及「打开文件夹」和「刷新」，再列出当前生效的技能；文件夹中有问题条目时另列一组。被覆盖的文件夹技能只出现在问题条目中，并写明胜出的来源。只有允许用户调用的技能显示为 `/<name>`，与 `/` 菜单一致，仅模型调用、仅用户调用和两者均关闭的技能附带说明。每一行都标出来源。诺思内置技能以本地化名称开头（例如 `weekly-report` 显示为「周报」），调用名列在旁边；其他技能以调用名开头。只有最近一次读取可以提交结果或错误，较早发起、较晚完成的刷新不会覆盖较新的结果；卸载后才完成的读取不改变任何状态。刷新失败时保留上次结果并提示，下一次刷新成功后提示消失；首次读取失败时，若响应给出了文件夹路径，仍显示该路径以及「打开文件夹」和「刷新」。文件夹通过 open-in-app 的 Finder 或资源管理器条目打开；没有可用的文件管理器时，提示用户手动打开路径。未设置 `userSkillRoot` 时不注册接口，分区显示无法读取技能。

-----

<a id="understand-the-implementation"></a>
## 了解实现

<details>
<summary>实现细节——点击展开</summary>

名为 `north-writing` 的提供者以内置等级列出六个候选，因此用户自己 `.dsh/skills` 或 `~/.dsh/skills` 中的同名技能会覆盖内置版本。每个候选的描述和调用策略都由 `parseSkillFrontmatter` 解析，与设置接口检查用户技能时的规则相同；内置文件违反规则或声明的名称与所在文件夹不同时，插件激活失败。技能正文按需加载；卸载时移除全部候选。

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
- **只能复制添加**——技能分区不能上传、编辑或删除技能；用户在文件管理器中管理该文件夹。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录——点击展开</summary>

无。

</details>
