---
description: "Six bundled Chinese office-writing skills for the North distribution: weekly reports, meeting minutes, official notices, email drafts, translation, and long-document summaries."
kind: "package-reference"
---

# @deepseek-ai/dsh-north-skill-writing

English | [中文](README.zh.md)

## Summary

This package registers six bundled skills that guide the model through everyday office writing in Chinese: `weekly-report`, `meeting-minutes`, `official-notice`, `email-draft`, `translation`, and `long-summary`. Each skill hands off to the Office skills when the user asks for a Word, Excel, or PowerPoint file. Its Settings → Skills section lists these skills and the user skill folder, and opens that folder so users add skills by copying folders into it. The North bundle mounts it host-wide as row `north-skill-writing`.

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

### Skills settings section

Set `userSkillRoot` to the absolute folder the filesystem skill provider scans for user skills; the North bundle passes `dshHomePath('skills')`. Once the Host provides `webServer` and `connection`, the plugin serves authenticated `GET /north-skills`, which creates the folder when it is missing and returns the bundled skills, the usable user skills, and the user entries the filesystem skill provider skips, each with its reason: no `SKILL.md`, missing `name` or `description`, a name that is not kebab-case, invalid invocation keys, or an entry it cannot read, such as a symbolic link to a missing target (a missing-target link whose extension is neither empty nor `.md` is skipped, since the provider never reads such a file as a skill). One unreadable entry does not fail the listing; the route answers 500 only when a bundled skill or the user folder itself cannot be read, logs the cause, and names the user folder in the body. The route applies the provider's own `parseSkillFrontmatter`, so the listed skills are exactly the ones agents load, and each skill carries its `invocation` policy. The browser half adds a Skills section to Settings after Agent presets. It shows that folder and lists all three groups; only user-invocable skills appear as `/<name>`, matching the session `skills/list` catalog, and model-only, user-only, and turned-off skills carry a label. It reloads on Refresh, keeps the last listing with a notice when a refresh fails, still shows the folder with Open folder and Refresh after a failed first load when the failure names it, and opens the folder through the open-in-app Finder or Explorer entry. Without a file manager it asks the user to open the path manually. Without `userSkillRoot` the plugin registers no route, and the section reports that skills could not be loaded.

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
- **Add by copying only** — the Skills section neither uploads, edits nor deletes skills; users manage the folder in the file manager.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
