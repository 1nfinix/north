---
description: "North development capability layer for tools, programming preset, and model headers."
kind: "package-bundle"
---

# @deepseek-ai/dsh-north-dev-bundle

English | [中文](README.zh.md)

## Summary

North applies this development capability layer after its office bundle. It enables the terminal, plugin settings, programming preset, optional full-access permission, model request headers, and development skills. New sessions default to the office preset; every user can choose the programming preset.

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

The Desktop profile lists this bundle after the North bundle. It can register four LAN model routes: `north-lan`, `north-lan-2`, `north-lan-3`, and `north-lan-4`. Each appears only when its corresponding `NORTH_LLM{,2,3,4}_BASE_URL` is set. The fourth route reads `NORTH_LLM4_` variables and defaults its model id and display name to `north-default-4` and `内网模型 4`. NORTH_LLM_HEADERS, NORTH_LLM2_HEADERS, NORTH_LLM3_HEADERS, and NORTH_LLM4_HEADERS are JSON objects with string values. The Desktop environment loader replaces NORTH_ placeholders before Cordis evaluates the patch. Missing placeholders or invalid JSON stop startup. When a header variable is absent, its provider receives an empty headers object.

New sessions use the official DeepSeek model when DEEPSEEK_API_KEY is present; otherwise they choose the first configured LAN route in numeric order. If none is configured, they use the official model. The initial sandbox remains workspace-write with ask approval; users can select danger-full-access.

Every shipped agent preset gives its isolated compaction backend an exact policy for each LAN route. Policies for unregistered routes do not match any model and have no effect. Each policy reads the route's `NORTH_LLM*_MODEL` and `NORTH_LLM*_MAX_TOKENS`, using the same model id and output-limit defaults as the provider. This keeps the compaction headroom within a small model's context when its configured output limit fits; a larger configured limit still requires a sufficiently large context window.

The bundle also mounts its own `north-dev-session-headers` plugin. Its required `headers` list names the HTTP headers that receive the current Session id. The shipped profile configures `X-Session-Id` and `x-session-affinity`. A model call without a Session id receives a new random UUID for that call, shared by all configured header names. Existing profile headers and other contributors' headers remain available.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

Each targeted row replaces the entire configuration from the preceding bundle. The model provider row therefore restates all North provider fields. Preset declarations also require complete overrides because the root `compaction-basic` row is disabled and profile patches cannot reach a preset's nested plugin rows. The bundled skills use their own registry provider and share the existing user skill root. The Session header plugin listens to `llm-pi-ai/request-headers` through `ctx.on()` and delegates with `next()`; it is active only when this bundle is loaded.

-----

<a id="further-exploration"></a>
## Further Exploration

- [North operations](../../../NORTH.md)
- [Development skills](../skill-dev/README.md)

-----

<a id="dev-note"></a>
## Dev Note

The composition test checks restored rows, permission presets, model routing, exact compaction policies, header expressions, and the Session header plugin configuration.

<a id="model-experience"></a>
## Model Experience

Indirectly, through the system prompt, model provider, and preset rows this layer configures.

#### KV Cache effect

The prompt and preset definitions are stable for a deployment, while model results append to Session history.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Gateway acceptance of custom headers depends on the deployed gateway and needs installation testing.

-----
