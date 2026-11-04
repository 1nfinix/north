---
description: "Eleven bundled North skills for office writing, report decks, charts, browser checks, web pages, and skill creation."
kind: "package-reference"
---

# @deepseek-ai/dsh-north-skill-writing

English | [中文](README.zh.md)

## Summary

Eleven bundled skills guide office writing, report decks, chart creation, browser checks, web page creation, and skill creation: `weekly-report`, `meeting-minutes`, `official-notice`, `email-draft`, `translation`, `long-summary`, `chart`, `browser-check`, `frontend-page`, `skill-creator`, and `ppt-report`. Writing and chart skills hand off to Office skills for Word, Excel, or PowerPoint files. Its Settings → Skills section lists the skills in effect, as the `/` menu reads them, diagnoses the user skill folder, and opens that folder so users add skills by copying folders into it.

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

### PowerPoint report skill

`ppt-report` reads a user-selected template skill or its bundled `assets/ppt-report/assets/default-template.pptx`. Its `scripts/inspect_template.py` lists layouts and theme details, `scripts/fill_template.py` fills the [content plan](assets/ppt-report/references/content-plan.md) into editable PowerPoint slides, and `scripts/extract_deck.py` exports an existing deck as a plan and shape inventory. The default template has a 16:9 canvas, Chinese layout names, and no example slides. The scripts require the bundled Office Python runtime with python-pptx; a template skill can point to a separate PPTX or POTX file as described in the [template skill reference](assets/ppt-report/references/template-skill.md).

### Skills settings section

Refresh explicitly rediscovers skill providers before showing the list, including a user folder created after startup. A new Session's skill menu also rediscovers on its catalog request. This scans the configured roots once per request, so copied skills appear without restarting even when host file events are delayed or missed.

Set `userSkillRoot` to the absolute folder the filesystem skill provider scans as its user DSH root; the North bundle passes `dshHomePath('skills')`. Once the Host provides `webServer` and `connection`, the plugin serves authenticated `GET /north-skills`. Its optional `workspace` query parameter names a registered Workspace directory; the route reads `ctx.skills.snapshot()` with that directory as `cwd` and the default agent preset, the same registry view the Session skill catalog reads for a new Session in that Workspace before it keeps the user-invocable rows for the `/` menu. Without the parameter the view has no project skills; a directory the Workspace registry does not hold, or any directory when the composition has no registry, answers 404 `unknown-workspace`. The working-directory default (the server start directory) never applies, because a GUI Session's cwd is its Workspace directory. Each row in `effective` is the skill that wins its name, with its `source`, `provider`, optional `path`, and `invocation`; `complete: false` means a provider did not finish discovery and the list can miss skills. The registry owns precedence across project `.dsh/skills`, project and user `.agents/skills`, custom roots, the user DSH root, runtime registrations, and bundled skills; the route does not repeat it.

The route also creates the user folder when it is missing and diagnoses its top-level entries with the provider's `parseSkillFrontmatter` and discovery rules: it skips `.system`, as the provider does in its user DSH root, and reads every other entry, dotfiles included. `invalid` lists entries the provider skips, each with its reason: no `SKILL.md` file (a directory of that name counts as none), missing `name` or `description`, an invalid skill name, invalid invocation keys, or an entry it cannot read, such as a symbolic link to a missing target (a missing-target link whose extension is neither empty nor `.md` is skipped, since the provider never reads such a file as a skill). `inactive` lists usable folder skills that do not resolve to their own file: another skill of the same name wins, named in `winner`, or no source resolves the name. One unreadable entry does not fail the listing; the route answers 500 only when the catalog or the user folder itself cannot be read, logs the cause, and names the user folder in the body.

The browser half adds a Skills section to Settings after Agent presets. It shows the folder with Open folder and Refresh, then the skills in effect and, when the folder has any, its issues; an overridden folder skill appears only among the issues, with the source that wins. Only user-invocable skills appear as `/<name>`, matching the `/` menu, and model-only, user-only, and turned-off skills carry a label. Every row names its source. Each load names the Workspace `uiWorkspace.newSessionWorkspace()` reports, the one a New Session opens, so the list matches that Session's `/` menu; without a Workspace UI or a Workspace it names none. North built-in skills lead with a localized title, such as 周报 for `weekly-report`, with the command beside it; other skills lead with the command. Only the latest load commits its result or error, so an older refresh that settles later cannot replace a newer one, and a load that settles after unmount changes nothing. A failed refresh keeps the last listing with a notice that the next successful refresh clears; a failed first load still shows the folder with Open folder and Refresh when the failure names it. The folder opens through the open-in-app Finder or Explorer entry; without a file manager the section asks the user to open the path manually. Without `userSkillRoot` the plugin registers no route, and the section reports that skills could not be loaded.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

One provider named `north-writing` lists the eleven candidates at bundled rank, so a user's own `.dsh/skills` or `~/.dsh/skills` folder with the same name overrides a shipped skill. Each candidate takes its description and invocation policy from `parseSkillFrontmatter`, the rules the settings route applies to user skills; a bundled file that breaks a rule or declares a name other than its folder fails plugin activation. Bodies load on demand; disposal removes every candidate.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [skill](../../skill/skill/README.md) — the registry, ranks, and provider contract.
- [skill-office](../../skill/skill-office/README.md) — the Office skills these hand off to.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through `dsh-tool-skill`, which lists the eleven bundled skills in the skill catalog and returns a selected body from `skill(name)`.

#### KV Cache effect

The catalog lines are stable across turns, so they stay inside the cached prompt prefix; a loaded body appends to history like any tool result.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Chinese-first guidance** — the skills are written for Chinese office conventions; English output follows the same structure but no separate English style guide.
- **No sending** — `email-draft` produces text only; North does not connect to mail servers.
- **Browser checks** — require locally installed Edge or Chrome and browser tools. Playwright browsers prohibit `file://`, so checks use a temporary local server on `127.0.0.1`.
- **Offline charts** — ECharts is fixed at dependency version `5.6.0`; the Host build copies its runtime into `assets/chart/echarts.min.js` without a CDN. `pnpm run clean` removes that generated file.
- **Add by copying only** — the Skills section neither uploads, edits nor deletes skills; users manage the folder in the file manager.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
