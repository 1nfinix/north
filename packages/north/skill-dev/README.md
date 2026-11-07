---
description: "Eight bundled development skills for North."
kind: "package-reference"
---

# @deepseek-ai/dsh-north-skill-dev

English | [中文](README.zh.md)

## Summary

This plugin registers eight bundled development skills as one provider. The North development capability layer mounts it after the office bundle.

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

The skills are code-review, git-commit, debugging, unit-test, code-explain, sql-review, api-doc, and script-helper. Each contains trigger guidance, steps, a checklist, and an output format. They appear in the skill catalog and slash menu.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

The plugin loads each skill file through the shared filesystem skill parser, registers a bundled provider named north-dev, and removes its candidates when disposed. assetRoot can point to an absolute alternate directory.

-----

<a id="further-exploration"></a>
## Further Exploration

- [North development capability layer](../dev-bundle/README.md)

-----

<a id="dev-note"></a>
## Dev Note

The package test loads every bundled skill and checks provider disposal.

<a id="model-experience"></a>
## Model Experience

Indirectly, through the skill catalog and the tool-skill loader that reads a selected skill body.

#### KV Cache effect

An unchanged skill catalog preserves its prefix; invoked skill content adds tokens to the active Session.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- These skills provide guidance; they do not add tools or grant permissions.

-----
