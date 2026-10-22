---
description: "诺思在侧栏和会话首屏的品牌占位，以及从描摹好的罗盘标志派生全部图标的脚本；面向诺思发行版的维护者。"
kind: "package-reference"
---

# @deepseek-ai/dsh-north-ui-brand

[English](README.md) | 中文

## 概述

本包为诺思发行版在侧栏显示罗盘标志和名称「North 诺思」，并在新会话首屏显示罗盘标志。它替代诺思配置包中禁用的 `@deepseek-ai/dsh-client-ui-brand-official`。本包还保存原始 logo，以及从它派生 favicon、桌面图标、安装器图片和运行中动画的脚本。它没有运行时状态，也不影响模型请求。

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

诺思配置包以 `north-brand` 行挂载本插件。它在任何客户端构建 profile 下都会注册，不需要构建变量。

### 重新生成图片

`assets/source-logo.png` 是提供的原始 logo。在仓库根目录运行 `python3 -I packages/north/ui-brand/scripts/trace-mark.py packages/north/ui-brand/assets/source-logo.png packages/north/ui-brand/assets/north-mark.svg` 描摹出矢量母版，再运行 `python3 -I packages/north/ui-brand/scripts/render-assets.py` 重写全部派生资源。之后运行 `pnpm --filter @deepseek-ai/dsh-desktop run render:tray-icon`；如果母版有变化，把路径数据同步到 `src/client/Brand.tsx`。

-----

<a id="understand-the-implementation"></a>
## 了解实现

<details>
<summary>实现细节——点击展开</summary>

三个占位作为一组感知声明的注册安装：嵌套的 `ctx.slots.inject()` 等待侧栏和会话的声明，所以任何激活顺序都能工作，HMR 时也会一起撤回。圆环和指针使用 `currentColor`，随主题变化；中心圆点保持灰金色。

</details>

-----

<a id="further-exploration"></a>
## 延伸阅读

- [ui-brand-official](../../client/ui-brand-official/README.zh.md)——本包替代的占位组。
- [ui-sidebar](../../client/ui-sidebar/README.zh.md)——声明 `sidebar.brand.mark` 和 `sidebar.brand.name`。
- [ui-conversation](../../client/ui-conversation/README.zh.md)——声明 `conversation.hero.brand.mark`。

-----

<a id="model-experience"></a>
## 模型体验

无，本包只提供浏览器端展示，不会进入模型请求。

#### KV Cache 影响

无；本包既不组装也不发送 provider 请求。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

- **硬编码文案仍在上游文件里**——首屏标题、窗口标题和桌面版文案直接修改；清单见 `NORTH.md`。
- **托盘尺寸下的细弧**——内圈细弧在 24px 以下会淡化；圆环和指针仍可辨认。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作记录——点击展开</summary>

无。

</details>
