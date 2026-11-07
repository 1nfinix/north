---
description: "North 的八个内置开发技能。"
kind: "package-reference"
---

# @deepseek-ai/dsh-north-skill-dev

[English](README.md) | 中文

## 概述

本插件通过一个提供者注册八个内置开发技能。North 开发能力层在办公配置包之后装载本插件。

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

技能为 code-review、git-commit、debugging、unit-test、code-explain、sql-review、api-doc 和 script-helper。每个技能都有触发说明、步骤、检查清单和输出格式，并出现在技能目录和斜杠菜单中。

-----

<a id="understand-the-implementation"></a>
## 了解实现

插件经共享的文件系统技能解析器读取各技能文件，注册名为 north-dev 的内置提供者，并在插件卸载时移除候选技能。assetRoot 可以指向绝对路径下的其他资源目录。

-----

<a id="further-exploration"></a>
## 延伸阅读

- [North 开发能力层](../dev-bundle/README.zh.md)

-----

<a id="dev-note"></a>
## 开发备注

包测试加载每个内置技能并核对提供者卸载。

<a id="model-experience"></a>
## 模型体验

本包通过技能目录和读取所选技能正文的工具间接影响模型输入。

#### KV Cache effect

技能目录不变时可复用前缀；调用的技能正文增加当前会话的 token。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

- 这些技能只提供指导，不添加工具，也不授予权限。

-----
