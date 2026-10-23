---
description: "The North distribution layer over dsh-base and dsh-web-app: brand, LAN model, office preset and skills, tightened permissions, and no telemetry; for administrators and maintainers of North."
kind: "package-bundle"
---

# @deepseek-ai/dsh-north-bundle

English | [中文](README.zh.md)

## Summary

This bundle turns the Desktop composition into North (诺思). It swaps the brand, routes the default model to the company's OpenAI-compatible LAN gateway, adds the 办公助手 (office assistant) preset as the default together with the North writing skills, removes the full-access permission preset, hides the terminal and plugin tooling from staff, and disables every telemetry and feedback row that reports to DeepSeek. The Desktop profile lists it after the two upstream bundles.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

### Model settings

The `north-lan` provider reads these variables at startup; North Desktop loads them from `resources/north.env` beside the executable.

| Variable | Meaning | Default |
|---|---|---|
| `NORTH_LLM_BASE_URL` | Gateway base URL ending in `/v1` | `http://127.0.0.1:8000/v1` |
| `NORTH_LLM_MODEL` | Served model id | `north-default` |
| `NORTH_LLM_API_KEY` | Gateway key, when it enforces one | `EMPTY` (set by Desktop) |
| `NORTH_LLM_DISPLAY_NAME` | Name shown in the model picker | `模型` |
| `NORTH_LLM_CONTEXT_WINDOW` | Context length in tokens | `32768` |
| `NORTH_LLM_MAX_TOKENS` | Output limit in tokens | `8192` |

A user who saves the provider on the Models page writes literal values into their profile patch, which overrides this layer from then on.

### Preinstalled sidebar

The layer mounts the third-party [`dsh-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar) as row `better-sidebar`; `package.json` pins its exact version, so Desktop ships it in the runtime with no Plugins-page step. It adds the file tree, editor, Git changes, tasks and side chat to the right sidebar and bottom workbench. Its terminal tab drives the host terminal service, which spawns user shells outside the sandbox and approval policy; the layer disables row `terminal-controller` and turns that tab off by default (`tabsEnabled`), so neither terminal appears; a user who re-enables the tab in sidebar settings sees it greyed out. Its file routes reach every path the operating-system user can reach, outside the session workspace and its approval policy. The bundle also lists the workspace packages the sidebar declares as peers, so pnpm links them instead of installing registry copies. To upgrade, change the pinned version and run `pnpm install`.

### Offline intranet

North runs on networks without internet access, so the layer disables every row that reaches the public internet: web search and the HTTP fetch provider, the DeepSeek models, and the fields added to official DeepSeek API requests. The `web` service stays without a pinned provider, so the standard preset still loads; its `web_search` and `web_fetch` tools remain listed and every call returns an unavailable error.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

`cordis.patch.yml` holds the id-targeted overrides and `presets/office.patch.yml` inserts the preset. Each patch replaces its row's whole `config`. The office preset keeps the shell tools because the Office skills run their bundled Python through them.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [web-app](../../bundle/web-app/README.md) — the rows this layer overrides.
- [ui-brand](../ui-brand/README.md) and [skill-writing](../skill-writing/README.md) — the packages it mounts.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the rows this layer configures: `dsh-system-prompt` opens with the North persona instead of the harness identity, the office preset adds its Chinese persona, and the default route is the LAN model.

#### KV Cache effect

The layer adds no request content of its own; both persona texts are fixed for a deployment, so they stay in the cached prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Hidden is not blocked** — a user who edits their profile patch can re-enable any row; this layer sets defaults, not a security boundary.
- **One gateway** — the layer declares a single LAN provider; more routes come from the Models page or another patch.
- **Account service stays mounted** — Desktop boot reads the Gateway account state, so `deepseek-account` and `account-controller` remain enabled; sign-in is only reachable from hidden account settings and fails without internet access.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
