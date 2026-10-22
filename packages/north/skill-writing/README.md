---
description: "Six bundled Chinese office-writing skills for the North distribution: weekly reports, meeting minutes, official notices, email drafts, translation, and long-document summaries."
kind: "package-reference"
---

# @deepseek-ai/dsh-north-skill-writing

English | [中文](README.zh.md)

## Summary

This package registers six bundled skills that guide the model through everyday office writing in Chinese: `weekly-report`, `meeting-minutes`, `official-notice`, `email-draft`, `translation`, and `long-summary`. Each skill hands off to the Office skills when the user asks for a Word, Excel, or PowerPoint file. The North bundle mounts it host-wide as row `north-skill-writing`.

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

Mount the plugin in any composition that provides `ctx.skills`. Users invoke a skill with `/<name>`; the model loads one when its description matches the request. `assetRoot` points at another directory of `<name>/SKILL.md` folders, for packaged applications that unpack assets elsewhere.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

One provider named `north-writing` lists the six candidates at bundled rank, so a user's own `.dsh/skills` or `~/.dsh/skills` folder with the same name overrides a shipped skill. Bodies load on demand; disposal removes every candidate.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [skill](../../skill/skill/README.md) — the registry, ranks, and provider contract.
- [skill-office](../../skill/skill-office/README.md) — the Office skills these hand off to.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through `dsh-tool-skill`, which lists the six writing skills in the skill catalog and returns a selected body from `skill(name)`.

#### KV Cache effect

The catalog lines are stable across turns, so they stay inside the cached prompt prefix; a loaded body appends to history like any tool result.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Chinese-first guidance** — the skills are written for Chinese office conventions; English output follows the same structure but no separate English style guide.
- **No sending** — `email-draft` produces text only; North does not connect to mail servers.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
