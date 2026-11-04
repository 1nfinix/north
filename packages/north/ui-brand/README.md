---
description: "North brand occupants for the sidebar and conversation hero, plus the scripts that derive every North icon from the traced compass mark; for maintainers of the North distribution."
kind: "package-reference"
---

# @deepseek-ai/dsh-north-ui-brand

English | [中文](README.zh.md)

## Summary

This package gives the North distribution its compass mark and the name "North 诺思" in the sidebar, and its mark on the new-session hero. It replaces `@deepseek-ai/dsh-client-ui-brand-official`, which the North bundle disables. The package also keeps the source logo and the scripts that derive the favicons, desktop icons, installer artwork and running indicator from it. It owns a removable light/dark theme override and does not affect model requests.

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

The North bundle mounts this plugin as row `north-brand`. It registers in every client build profile, so no build variable is needed.

The theme service receives paired colour overrides through `theme.overrideTokens()`. White content, cool-grey navigation, ink primary controls and blue links follow the selected light/dark/system preference. Unloading North removes the overrides without changing that preference. Shared menu transparency, status colours, code highlighting and document-preview colours remain unchanged.

### Regenerating the artwork

`assets/source-logo.png` is the supplied logo. From the repository root, `python3 -I packages/north/ui-brand/scripts/trace-mark.py packages/north/ui-brand/assets/source-logo.png packages/north/ui-brand/assets/north-mark.svg` traces it into the master SVG, and `python3 -I packages/north/ui-brand/scripts/render-assets.py` rewrites every derived asset. Then run `pnpm --filter @deepseek-ai/dsh-desktop run render:tray-icon` and copy the path into `src/client/Brand.tsx` if the master changed.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The three occupants install as one declaration-aware registration set: nested `ctx.slots.inject()` calls wait on the sidebar and conversation declarations, so the set works in any activation order and withdraws together during HMR. The ring and needle use `currentColor` so they follow the theme; the centre stays gold.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [ui-brand-official](../../client/ui-brand-official/README.md) — the occupant set this package replaces.
- [ui-sidebar](../../client/ui-sidebar/README.md) — declares `sidebar.brand.mark` and `sidebar.brand.name`.
- [ui-conversation](../../client/ui-conversation/README.md) — declares `conversation.hero.brand.mark`.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package contributes browser presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Hard-coded strings stay upstream** — the hero headline, the window title and desktop strings are edited in place; `NORTH.md` lists them.
- **Thin arcs at tray sizes** — the inner arcs fade out below 24 px; the ring and needle stay legible.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
