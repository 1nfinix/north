---
description: "The North distribution layer over dsh-base and dsh-web-app: brand, LAN model, office preset, skills and browser tools, tightened permissions, and no telemetry; for administrators and maintainers of North."
kind: "package-bundle"
---

# @deepseek-ai/dsh-north-bundle

English | [中文](README.zh.md)

## Summary

This bundle turns the Desktop composition into North (诺思). It swaps the brand, offers the company's OpenAI-compatible LAN gateway and the official DeepSeek API as models, defaulting to DeepSeek when its key is configured, adds the default 办公助手 preset, North skills, and Playwright browser tools, removes the full-access permission preset, disables the terminal service, the plugin manager, and the Settings → Built-in plugins page, so staff see no terminal and no plugin page, and disables every telemetry and feedback row that reports to DeepSeek. The Desktop profile lists it after the two upstream bundles.

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

The `north-lan` provider reads these variables at startup; North Desktop loads them from `resources/north.env` beside the executable. The second gateway, `north-lan-2`, reads the `NORTH_LLM2_` variables (fallbacks `http://127.0.0.1:8001/v1`, `north-default-2`, and `内网模型 2`); the shipped environment labels it MiniMax-M2.7. On Windows and Linux without a DeepSeek key, new Sessions use this second gateway. Both LAN providers remain in the model picker.

| Variable | Meaning | Default |
|---|---|---|
| `NORTH_LLM_BASE_URL` | Gateway base URL ending in `/v1` | `http://127.0.0.1:8000/v1` |
| `NORTH_LLM_MODEL` | Served model id | `north-default` |
| `NORTH_LLM_API_KEY` | Gateway key, when it enforces one | `EMPTY` (set by Desktop) |
| `NORTH_LLM_DISPLAY_NAME` | Name shown in the model picker | `内网模型` |
| `NORTH_LLM_CONTEXT_WINDOW` | Context length in tokens | `32768` |
| `NORTH_LLM_MAX_TOKENS` | Output limit in tokens | `8192` |

A user who saves the provider on the Models page writes literal values into their profile patch, which overrides this layer from then on.

North Desktop also reads `NORTH_PROXY` and `NORTH_PROXY_NETWORK` from that file. When no proxy variable is already set and a local IPv4 address starts with `NORTH_PROXY_NETWORK`, it sets `HTTP_PROXY` and `HTTPS_PROXY` to `NORTH_PROXY`, so every model and web request from that machine goes through the proxy; other machines connect directly.

### Preinstalled sidebar

Row `workspace-controller` sets `documentsSubdirectory: North`, so first use creates the default Workspace at `<Documents>/North/default-workspace`. An installation that already has a default Workspace keeps it where it is.

The layer mounts the third-party [`dsh-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar) as row `better-sidebar`; `package.json` pins its exact version, so Desktop ships it in the runtime with no Plugins-page step. It adds the file tree, editor, Git changes, tasks and side chat to the right sidebar and bottom workbench. Its terminal tab drives the host terminal service, which spawns user shells outside the sandbox and approval policy; the layer disables row `terminal-controller` and turns that tab off by default (`tabsEnabled`), so neither terminal appears; a user who re-enables the tab in sidebar settings sees it greyed out. Its file routes reach every path the operating-system user can reach, outside the session workspace and its approval policy. The bundle also lists the workspace packages the sidebar declares as peers, so pnpm links them instead of installing registry copies. To upgrade, change the pinned version and run `pnpm install`.

### Intranet and internet

North works on networks with or without internet access. The `llm-deepseek` row adds the official DeepSeek models (V4.1 Flash and V4 Pro) beside the two LAN gateways. Its key `DEEPSEEK_API_KEY` resolves through the credentials service: a key saved on the Models page, then the launching environment (Desktop reads the login shell's variables on macOS, and `resources/north.env` fills unset ones), then `.env` files; without a key the picker lists no DeepSeek model. The endpoint is pinned to `https://api.deepseek.com/anthropic`, because the adapter speaks the Messages protocol and an OpenAI-style `DEEPSEEK_BASE_URL` would otherwise become its request root. New Sessions default to DeepSeek on macOS or when the launching environment carries `DEEPSEEK_API_KEY` (model `NORTH_DEEPSEEK_MODEL`, default `deepseek-v4-pro`) and to `north-lan-2` (MiniMax-M2.7 in the shipped environment) otherwise; a model saved in Settings wins over both.

Web tools search through the DeepSeek Search API (`deepseek-search-api`, one request per search) and fetch public pages through the local HTTP provider; without internet access every `web_search` and `web_fetch` call returns an unavailable error. DeepSeek account sign-in, the model-turn search `web-search-deepseek`, and the optional fields DeepSeek requests may carry (the Session-log upload and the plugin inventory) stay disabled, so DeepSeek receives only the model and search requests themselves.

### Browser tools

The host layer mounts `dsh-browser-use` and the Playwright MCP provider for Desktop and Web North Sessions. Each active Session starts its own MCP subprocess; the browser itself starts on the first browser tool call. The provider launches headless and reads `NORTH_BROWSER_PATH`. Desktop fills that variable after reading `resources/north.env` if it was not set: Windows checks system Edge, system Chrome, user Chrome, then user Edge; macOS checks system Chrome, system Edge, then the same browsers under `~/Applications`. Administrators can set the full executable path in `north.env` to override detection. Without a detected or configured path, the provider omits `executablePath`; a missing browser fails only the browser tool call. Browser skills use a local `127.0.0.1` server because the pinned Playwright MCP does not open `file://` pages.

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

Indirectly, through the rows this layer configures: the North and office personas and default model route affect the request, while the Playwright MCP catalog adds `mcp__playwright-mcp__*` tool descriptions and schemas after Session initialization and browser calls add arguments, results, and admitted screenshots to history, increasing token use without exposing inline image bytes.

#### KV Cache effect

Both persona texts are fixed for a deployment, so they stay in the cached prefix. An unchanged browser tool catalog preserves its tool-definition prefix; browser results append to history, while a catalog change can reduce prefix reuse.

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
