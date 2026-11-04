# North（诺思）发行版维护说明

North 是基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（MIT）的公司内部桌面版：
同事在自己的 Windows 电脑上安装，连接局域网里的 vLLM / OpenAI 兼容网关，能访问互联网时也可以使用 DeepSeek 官方模型，用于日常办公。

- 分支：`north`，基于上游 dsh v0.2.2-alpha.2（2026-11-01 合并 `upstream/master`）；上游远程名为 `upstream`。
- North 技能与品牌代码位于 `packages/north/`；对上游文件的改动见下方清单，合并上游时逐项检查。
- 保留 `LICENSE` 与 `THIRD_PARTY_NOTICES.md`；关于页写明「基于 DeepSeek Harness (MIT)」。

## 维护规则

- **不含单位信息**：项目计划开源，定位为通用的 AI 办公工具。仓库内的代码、技能、文档、测试、快照和提交信息都不得出现任何单位名称、地区与机构层级、内网地址与网段、内部系统名称或人员信息；需要举例时用「××」或通用说法。真实配置只放在本机未跟踪的 `north.env` 和 CI secret 中。本机敏感词钩子（`.git/info/north-sensitive-patterns`）和 `verify-north-addresses` 门禁负责拦截。
- **记录每次迭代**：每次迭代合并进 `north` 时，在 [NORTH-CHANGELOG.md](NORTH-CHANGELOG.md) 顶部追加一节，写明日期和新增、变更、修复、安全四类内容。

## 新增包

审计与修复交接：[2026-10-23 代码、视觉与功能审计](NORTH-AUDIT-2026-10-23.md)。

| 包 | 作用 |
|---|---|
| `packages/north/ui-brand`（`@deepseek-ai/dsh-north-ui-brand`） | 侧栏与新会话首屏的罗盘标志和「North 诺思」；保存原始 logo 和图标生成脚本 |
| `packages/north/skill-writing`（`@deepseek-ai/dsh-north-skill-writing`） | 十一个内置技能：周报（`weekly-report`）、会议纪要（`meeting-minutes`）、公文写作（`official-notice`）、邮件（`email-draft`）、翻译（`translation`）、长文总结（`long-summary`）、图表（`chart`）、网页检查（`browser-check`）、网页制作（`frontend-page`）、技能创建（`skill-creator`）、汇报 PPT（`ppt-report`）；「设置 → 技能」分区按 `/` 菜单读取的同一份注册表视图列出当前生效的技能（含来源），单独列出用户技能文件夹 `~/.north/skills` 中无法使用或被覆盖的条目，并能打开该文件夹 |
| `packages/north/bundle`（`@deepseek-ai/dsh-north-bundle`） | 配置层：品牌、局域网模型与 DeepSeek 官方模型（macOS 或有 key 时默认 DeepSeek，否则默认内网模型二 MiniMax-M2.7）、DeepSeek 网页搜索与 HTTP 抓取、预装 Playwright 浏览器工具（路径由桌面启动时探测或 `NORTH_BROWSER_PATH` 指定）、办公助手预设（默认）、去掉完全权限、默认工作区建在 `<文稿>/North/default-workspace`、禁用终端服务 `terminal-controller`（原生终端和侧边栏终端都不可用）、禁用插件管理和「设置 → 内置插件」页（`ui-plugin-manager`、`ui-settings-plugins`、`ui-settings-plugin-inventory`）、关闭遥测、预装第三方侧边栏 `dsh-better-sidebar`（版本锁定在其 `package.json`；其文件接口不限于工作区，属于用户本人在界面上的操作，不给它打补丁） |

包名必须以 `@deepseek-ai/` 开头且不能设为 private，否则不会进入桌面版运行时（`scripts/release/families.ts`）。

## 对上游文件的改动清单

**依赖安全升级**

改动文件：
- `package.json`
- `apps/desktop/package.json`
- `apps/web/package.json`
- `benchmarks/package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `THIRD_PARTY_NOTICES.md`（依赖许可清单重新生成）。
- `packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts`、`packages/typert/generator/tests/type-model.spec.ts`（版本断言与 Zod 声明的 `URL` 编译环境）。
- `packages/api/` 下的 `account-controller`, `gateway`, `job-controller`, `remote-access`, `remotes`, `session-controller`, `settings-controller`, `terminal-controller`, `workspace-controller`, `workspace-files` 的 `package.json`。
- `packages/boot/` 下的 `plugin-manager`, `plugin-market` 的 `package.json`。
- `packages/client/` 下的 `connection`, `file-upload`, `product-analytics`, `ui-conversation`, `ui-plugin-manager`, `ui-sidebar-documentpreview`, `ui-sidebar-right`, `ui-trajectory`, `web` 的 `package.json`。
- `packages/context/` 下的 `harness-dev-context`, `session-reference`, `time-context`, `tmux-context` 的 `package.json`。
- `packages/core/` 下的 `agent-loop`, `agent` 的 `package.json`。
- `packages/credentials/` 下的 `deepseek-account-platform` 的 `package.json`。
- `packages/document/` 下的 `office-to-pdf` 的 `package.json`。
- `packages/experimental/` 下的 `action-cards`, `agent-team`, `api-speech-to-text`, `browser-use-stagehand-native`, `claude-code-mods`, `client-ui-cot-translation`, `client-ui-creation-recommendations`, `client-ui-forge`, `client-ui-plugin-recommendations`, `computer-use-cua-driver-native`, `creation-recommendations`, `cua-macos`, `cua`, `forge-github`, `forge-session`, `liveshare`, `plugin-recommendations`, `speech-to-text-sensevoice`, `subagent-oar` 的 `package.json`。
- `packages/extensions/` 下的 `cordis-host-runner` 的 `package.json`。
- `packages/feedback/` 下的 `command-feedback`, `message-feedback` 的 `package.json`。
- `packages/goal/` 下的 `goal` 的 `package.json`。
- `packages/host/` 下的 `plugin-inventory` 的 `package.json`。
- `packages/interaction/` 下的 `commands`, `permission-presets`, `user-approval`, `user-questions` 的 `package.json`。
- `packages/llm/` 下的 `llm-retry`, `llm`, `token-meter` 的 `package.json`。
- `packages/mcp/` 下的 `mcp-client` 的 `package.json`。
- `packages/plan/` 下的 `plan-mode` 的 `package.json`。
- `packages/preset/` 下的 `agent-preset-registry` 的 `package.json`。
- `packages/sandbox/` 下的 `sandbox-policy` 的 `package.json`。
- `packages/schedule/` 下的 `schedule` 的 `package.json`。
- `packages/session/` 下的 `session-projection-cache`, `session-projection`, `session-stats`, `session-title`, `session-turn-outline`, `working-directory` 的 `package.json`。
- `packages/session-query/` 下的 `session-log-export` 的 `package.json`。
- `packages/ssh/` 下的 `fs-ssh`, `sandbox-ssh`, `ssh`, `subprocess-ssh` 的 `package.json`。
- `packages/storage/` 下的 `storage-domain` 的 `package.json`。
- `packages/subagent/` 下的 `subagent-claude-code`, `subagent`, `tool-subagent` 的 `package.json`。
- `packages/todo/` 下的 `tool-todo` 的 `package.json`。
- `packages/typert/` 下的 `generator`, `loader`, `protocol`, `registry` 的 `package.json`。
- `packages/util/` 下的 `chunked-list`, `http-proxy` 的 `package.json`。
- `packages/web/` 下的 `web-fetch-http` 的 `package.json`。
- `packages/workspace/` 下的 `workspace` 的 `package.json`。

- 直接依赖：`zod` 4.4.3 / ^4.4.3 → 4.6.7 / ^4.6.7；`undici` 8.10.2 / 8.11.2 → 8.12.3；`@modelcontextprotocol/client` 2.2.0 → 2.4.0；`@modelcontextprotocol/sdk` ^1.31.0 → ^1.32.2；`dompurify` ^3.4.16 → ^3.4.17；`fflate` ^0.8.2 → ^0.8.3。
- 传递依赖覆盖：`express>body-parser` 2.3.0 → 2.4.0（高危漏洞）；`hono@4.13.7` → 4.13.14（中危漏洞，MCP 相关依赖）；`ajv>fast-uri` 3.1.8 → 3.1.9（中危漏洞）；`express-rate-limit>ip-address` 10.7.1 → 10.7.4（中危漏洞）；`qs@6.16.0` → 6.16.1（中危漏洞，多个上层依赖）。
- 传递副本对齐：`@modelcontextprotocol/sdk@1.31.0` → 1.32.2（测试服务器固定版本）；`zod@4.4.3` → 4.6.7、`node-gyp>undici` 6.28.1 → 6.29.1、`@electron/get>undici` / `@yao-pkg/pkg-fetch>undici` / `jsdom>undici` 7.29.1 → 7.30.1（各自主版本的高危漏洞修复）、`undici@8.10.2` → 8.12.3、`dompurify@3.4.16` → 3.4.17、`fflate@0.8.2` → 0.8.3（上层仍引用旧版）。
- `electron` 保持 44.7.0：`node-addon-require-builtin@0.1.9` 只识别该版本的 Node/V8 指纹，待原生插件支持 44.9.1+ 后再升级。`katex@0.16.47` 由 `micromark-extension-math@3.1.0` 的 `^0.16.0` 和 `mermaid@11.17.2` 的 `^0.16.47` 引入，未跨越上层版本范围强制覆盖。`http-cache-semantics@4.2.0` 的公告已撤回，未处理。

**pwsh 持久会话竞态**
- `packages/shell/tool-pwsh-persistent/src/index.ts`、`tests/{tools,loader-composition}.spec.ts`、`README{,.zh}.md`、`README.i18n.yaml`：stdin 等待后先复读 scrollback 捕获迟到的结束标记，未完成才用延续发送区分新输出与持续无输出的交互等待；假终端测试覆盖前后命令的输出归属，真实 pwsh 用例按命令检查最终结算原因，并拒绝超时和静默结算。`docs/config-catalog{,.zh}.md` 中该包的源码行号随之重新生成。

**组合接入**
- `apps/cli/package.json`：依赖 `@deepseek-ai/dsh-north-bundle`。
- `apps/desktop/src/project-manager.ts`：`DESKTOP_BUNDLES` 在 Web 模板后追加 North 配置包（初始化与恢复都用它）。
- `apps/desktop/src/north-env.ts`（新文件）与 `apps/desktop/src/main.ts`（`main()` 首行调用 `applyNorthEnvironment`）：数据目录 `~/.north`、关闭遥测、读取 `resources/north.env`、按本机 IP 选择代理、探测已安装浏览器。
- `apps/desktop/resources/north.env.example`（新文件）与未跟踪的 `north.env`；`electron-builder-config.mjs` 的 `extraResources` 从 `north-env-source.mjs` 解析打包来源。
- `tsconfig.base.json`（手写别名）、`tsconfig.host.json`、`tsconfig.client.json`：登记新包。
- `packages/north/bundle/cordis.patch.yml` 覆盖的插件 id 都须是上游实际存在的插件；dsh 0.2.2-alpha.2 删除了 `ui-deepseek-model-label-1017`，其禁用行已随之移除。

- `.gitignore`、`apps/desktop/tests/{north-env,north-env-source}.spec.ts`、`scripts/{verify-north-addresses,north-sensitive-hook}{,.spec}.ts`、`package.json`、`scripts/run-gates{,.spec}.ts`、`lefthook.yml`：示例配置、地址门禁与本机敏感词钩子；pre-commit 检查暂存新增行，pre-push 检查待推送提交的新增行与提交信息。
- `.github/workflows/north-windows-desktop.yml` 与 `scripts/north-ci-workflow.spec.ts`：从 secret 提供打包配置并限制安装包保留时间。
- `apps/desktop/tests/{installer-packaging,macos-signature,macos-disk-image-signature,shell-file-selection,packaged-runtime-verification,windows-asar-unpack,windows-update-publisher,installed-update-builder}.spec.ts`：测试打包显式允许示例配置。
- `apps/desktop/README{,.zh}.md` 与 `README.i18n.yaml`：本机配置及打包说明。

**品牌文案**
- `apps/desktop/src/locale.ts`（八种语言；关于页的「基于 DeepSeek Harness (MIT)」各语言都保留）、`apps/desktop/installer/locales/*.json`（八种语言的安装器文案）、`apps/desktop/installer/extract-report.h`。
- 上游新增的日、西、法、德、俄、葡六种界面语言同样换成诺思文案：`packages/client/locale/src/locales/*.ts` 的 `brand.localBuild`、`ui-conversation` 的首屏标题/徽标/输入框提示、`ui-settings-models` 的试用说明正文；`packages/north/*` 的字典和 `locale/*.json` 也补齐八种语言（`check:i18n` 要求）。
- `apps/desktop/tests/installer-packaging.spec.ts`：版权行与卸载显示名随产品名改为 North；`packages/client/ui-chat/tests/running-status.client.spec.tsx`（「处理中」）、`packages/client/ui-sidebar/tests/sidebar-root.client.spec.tsx`（`brand.localBuild`）、`scripts/client-build-environment.client.spec.ts`（官方构建标题）同理。
- `apps/desktop/src/main.ts`：关于面板 `applicationName`。
- `apps/desktop/scripts/electron-builder-config.mjs`：`productName: 'North'`、协议显示名、麦克风说明。协议仍是 `dsh://`。
- `apps/desktop/cli/dsh`、`apps/desktop/cli/dsh.cmd`、`apps/desktop/scripts/smoke-packaged-runtime.ts`、`apps/desktop/scripts/package-macos.ts`、`apps/desktop/scripts/package-target.ts`、`apps/desktop/scripts/development-app.ts`：可执行文件名 `North`。
- `packages/client/ui-conversation/src/client/locales.ts`：首屏标题「让工作不偏航 / Keep work on course.」、徽标「内部版」、输入框提示。
- `packages/client/locale/src/locales/{zh,en}.ts`：`brand.localBuild`。
- `scripts/client-build-environment.ts`（`DSH_CLIENT_TITLE: 'North'`）、`apps/web/vite.config.ts`、`apps/web/index.html`、`apps/web/public/manifest.webmanifest`。
- `packages/client/ui-chat/src/client/chat/RunningWhaleTail.tsx`：静态指示图形。

**品牌图片**（由 `packages/north/ui-brand/scripts/render-assets.py` 生成，合并冲突时保留我方版本后重新生成）
- `apps/web/public/favicon.svg`、`favicon-dark.svg`
- `apps/web/public/icon-192.png`、`icon-512.png`、`icon-maskable-512.png`、`apple-touch-icon.png`：网页安装图标，由上游的 `apps/web/scripts/render-app-icons.ts` 从 `apps/desktop/resources/icon.svg` 生成（`pnpm --filter @deepseek-ai/dsh-web-frontend run render:app-icons`）。该脚本按两个分组标记裁切和缩放图块，North 把标记改为罗盘图块的 `<g filter="url(#tile-shadow)">` 与 `<g id="tile-artwork">`（`render-assets.py` 为 `icon.svg` 输出该 id），`tests/app-icons.spec.ts` 随之更新。重新生成 `icon.svg` 后需重跑此脚本。
- `apps/desktop/resources/icon{,-macos,-windows}.{svg,png}`、`tray-windows.ico`
- `apps/desktop/renderer/assets/welcome-brand.svg`
- `apps/desktop/installer/assets/brand{,-2x,-dark,-dark-2x}.png`、`uninstaller-sidebar.png`
- `packages/client/ui-chat/src/client/assets/running-whale@2x.png`

- `packages/client/ui-chat/src/client/locale.ts`：思考状态「深度求索中」改为「处理中」（「深度求索」是 DeepSeek 的中文公司名）。
- `packages/client/ui-chat/src/client/locale.ts`：中断提示 `message.failure.interrupted` 的「DSH 进程」改为「应用」，并提示先检查工作区文件再决定是否重新发起；同步 `README{,.zh}.md`、`tests/chat-view.client.spec.tsx`、`apps/web/tests/interrupted-turn.e2e.ts` 与 `snapshots/web/interrupted-turn/ui.expected.md`。
- `apps/web/tests/` 与 `snapshots/web/` 中写死的首屏标题、徽标和输入框提示改为诺思文案（14 个测试文件、6 个快照）。
- `apps/web/tests/pwa-manifest.e2e.ts`（应用名与罗盘 favicon 颜色）、`apps/web/tests/built-boot.expected.e2e.ts`（侧栏 `brand.localBuild` 文案）、`scripts/client-build-environment.client.spec.ts`（官方构建标题）随产品名更新。
- `packages/client/ui-settings-models/src/client/locales.ts`：首次启动「预览版说明」正文改为诺思内部试用说明（标题不变）；`src/onboarding-copy.ts` 的 `WELCOME_NOTICE_VERSION` 改为 `2026-10-23.1`，已确认旧说明的用户会再看到一次。对应测试：`tests/welcome-notice.client.spec.tsx`、`apps/web/tests/scaffold.ts`、`apps/web/tests/expected/onboarding-deepseek-config/welcome.expected.md`。

**离线图表构建与分发**
- `.gitignore`：忽略从 ECharts 依赖复制的 `assets/chart/echarts.min.js`，不提交生成文件。
- `pnpm-lock.yaml`：锁定 `echarts@5.6.0` 及其传递依赖。
- `scripts/clean.ts`：`pnpm run clean` 删除生成的 ECharts 文件。
- `scripts/clean.spec.ts`：核验清理仅移除生成文件，保留 `SKILL.md`。
- `scripts/gen-third-party-notices.ts`：在生成的许可清单中保留 Anthropic frontend-design 改编说明。
- `scripts/build.ts`：`build:check` 检查已构建的 North 技能包；完整 `build` 等待 Client bundle 后执行。
- `scripts/build.spec.ts`：核验产物检查在构建图中的执行顺序。
- `scripts/verify-north-skill-package.ts`（新文件）：检查 ECharts 生成文件非空，并核对 npm 包包含技能正文、`official-notice/references/` 的两个文件和许可文件。
- `scripts/check-workspace-constraints.ts` 与 `scripts/verify-north-skill-package.ts`：登记并核对汇报 PPT 的脚本、两份参考和默认模板随包分发。
- `package.json`：登记 North 技能包的构建后检查命令。

**技能校验**
- `packages/skill/skill/src/index.ts`、`packages/api/session-controller/src/skill-catalog.ts`、`packages/skill/tool-skill/src/index.ts`：设置页刷新、新会话技能菜单与首次模型目录显式重新发现；保留后续步骤的缓存。同步 `docs/subsystems/skills{,.zh}.md` 与 `skills.i18n.yaml`（`SkillViewOptions.refresh`、技能名称规则）。
- `packages/api/remotes/src/remote-events.ts`（及 `package.json`、`tests/remote-events.host.spec.ts`）：把技能注册表的 `skills/change` 事件转发给 Client，磁盘上增删改技能文件后 `/` 菜单随之更新。
- `packages/client/ui-workspace/src/client/navigation.ts`：新增 `newSessionWorkspace()`（新会话将打开的工作区），`startSession()` 改用它；「设置 → 技能」据此列出该工作区的技能。同步 `README{,.zh}.md`、`README.i18n.yaml` 与 `tests/workspaces-service.client.spec.ts`。
- `packages/skill/skill/src/index.ts`、`packages/skill/skill-filesystem/src/index.ts`：技能名称允许最多 64 个 Unicode 文字或数字，并以单个连字符分隔；文件系统解析与注册表统一校验。
- `packages/skill/tool-skill/src/index.ts`、`packages/client/ui-skill/src/client/user-text-rules.ts`、`packages/client/ui-conversation/src/client/input/decorations.ts`：识别 `/周报` 等中文技能命令。
- `packages/skill/skill-filesystem/src/index.ts`：把技能文件的 frontmatter 规则抽成导出函数 `parseSkillFrontmatter`（加载器的告警文本不变），供「设置 → 技能」复用；README 中英文「Skill format」一节随之说明。

**默认工作区目录**
- `packages/api/workspace-controller/src/{default-directory,index,default-workspace}.ts`：上游把 `<Documents>/deepseek-harness` 写死；改为配置项 `documentsSubdirectory`（默认值仍是 `deepseek-harness`，加载时校验为单个路径片段），North 配置包设为 `North`。同步 `README{,.zh}.md` 与 `tests/{default-directory,workspace-controller}.host.spec.ts`。

**`/` 菜单搜索**
- `packages/client/ui-skill/src/client/index.ts`：技能候选在名字匹配之后，追加描述中包含查询文字（不区分大小写的连续子串）的技能，因此输入 `/周报` 能找到 `weekly-report`。同步 `README{,.zh}.md` 与 `tests/browser-plugin.client.spec.ts`。

**仓库门禁**（让新包通过上游检查）
- `scripts/check-workspace-constraints.ts`：`packageFileExtras` 登记写作技能包的 `assets`。
- `scripts/verify-config-source-ownership.ts`：只允许 North 配置包的 `baseURL` 读取 `NORTH_LLM_BASE_URL` 和 `NORTH_LLM2_BASE_URL`（`llm-pi-ai` 没有从环境读取地址的配置项）。
- `scripts/verify-package-readme-model-experience.ts`：登记三个新包的模型体验说明。
- `apps/desktop/src/project-manager.ts` 与 `scripts/verify-product-use.ts`：North 配置包写在字面量 `DESKTOP_DISTRIBUTION_BUNDLES` 里，门禁把「Web 模板 + 该列表」当作桌面版默认组合，三个 North 包因此计入产品运行时使用。
- `scripts/package-dependency-policy.ts`：`SAFE_HOST_DEPENDENCY_EXPORTS` 登记 `parseSkillFrontmatter`（2026-10-23 维护者人工审核批准），`RUNTIME_ASSET_DEPENDENCIES` 登记作为离线资源分发的 ECharts。
- `scripts/verify-package-dependencies.ts`：把已登记的运行时资源依赖保留在 `dependencies`，其余 Client 构建输入仍按原规则分类。
- `scripts/verify-package-dependencies.spec.ts`：验证 ECharts 运行时依赖、普通浏览器依赖及缺失声明的反例。
- `scripts/verify-default-product-isolation.ts` 与其 spec：仅允许 North 配置包挂载 Playwright MCP 提供者及其运行时依赖；其他实验包与其他 bundle 仍被门禁拒绝。
- `scripts/release/installed-product-isolation.ts` 与其 spec：发布前的已安装依赖检查同样只放行「North 配置包 → Playwright MCP 提供者 → 其运行时」这两条边。
- `scripts/check-workspace-constraints.ts` 与其 spec：仅允许 North 配置包以运行时依赖声明 Playwright MCP 提供者。
- `scripts/product-package-policy.ts`：移除浏览器服务包的“仅可选”分类；North 已将其挂入默认运行时。
- `scripts/verify-repository-references.ts`：纯十进制数字不再当作提交短哈希；此修复已由上游实现，North 不再维护单独补丁。
- 重新生成的文档：`docs/module-graph{,.zh}.md`、`THIRD_PARTY_NOTICES.md`（预装侧栏 `dsh-better-sidebar`、ECharts 与 Anthropic 改编说明）、`docs/config-catalog{,.zh}.md`、`packages/extensions/cordis-client-runner/src/client/{slot-catalog,api-catalog}.ts`、`packages/extensions/tool-cordis/src/api-catalog.ts`、`packages/preset/agent-preset/skills/cordis-composition-reference/references/packages.md`。

**持续集成**
- `.github/workflows/north-ci.yml`（新文件）：推送到 `north`、向 `north` 开 PR 或手动触发时，在 GitHub 托管机器上运行 `check:ci:static`、`check:ci:coverage`、`check:ci:windows-blocking` 和 `check:ci:north-web`。`north-web` 任务只安装 Chromium。
- `scripts/run-gates.ts` 的 `ci-north-web` 聚合与 `package.json` 的 `check:ci:north-web`、`test:web:north`：先 `build:artifacts`，再以 `DSH_SNAPSHOT=replay` 运行 `north-distribution.e2e.ts` 和 `north-theme.e2e.ts`；`scripts/north-ci-workflow.spec.ts` 校验从工作流到这两个测试文件的完整链路。PR 上的归档门禁与 PR 基准提交比较。static 任务设 `NODE_OPTIONS=--max-old-space-size=6144`：可选依赖导入、文档图等门禁要为整个仓库建 TypeScript 程序，峰值超过托管机器默认的 2 GB 堆上限。上游工作流依赖上游组织的运行机器、secret、Issue 配置或 PyPI 发布，对 North 不适用，已在仓库设置中停用（`gh workflow disable`，不改文件，可用 `gh workflow enable` 恢复）：CI、CI Python、CI Windows、E2E、Build PR preview、Issue lifecycle、Issue policy、weighted-approval、Release (dsh)、Release (vendor)。合并上游后如出现新的上游工作流，同样停用。
- `.github/workflows/north-windows-desktop.yml`（新文件）：手动触发，或在推送改动了该工作流或其缩放脚本时触发（GitHub 只通过推送触发登记默认分支以外的工作流），在 GitHub 托管的 `windows-latest` 上构建未签名的 win-x64 安装包，再运行 `test:installer`（中英文安装界面）、`test:updates:local`（本地更新流程），以及 `apps/desktop/scripts/north-windows-scaling.mjs`：静默安装后以 1、1.25、1.5、2 倍缩放启动已安装的应用，检查主窗口和技能设置页没有横向溢出、设置对话框不超出窗口，截图后静默卸载。上游的 `windows-package.yml` 依赖本仓库没有的自托管运行机器。证据只作为该次运行的 artifact 保留，不发布、不上传；`scripts/north-ci-workflow.spec.ts` 校验其触发方式、运行机器和步骤顺序。

**打包**
- `apps/desktop/scripts/desktop-package-environment.mjs`、`electron-builder-config.mjs`：未签名构建在所有平台跳过强制更新策略地址（上游只对 macOS 跳过）。
- `apps/desktop/packaging/README{,.zh}.md`：DMG 文件名随产品名改为 `north-<version>-mac-<arch>-unsigned.dmg`。

**Windows 命令执行**
- `packages/sandbox/sandbox-windows-acl/src/{runner,ffi,win32-abi}.ts`：没有控制台的沙箱运行器改为附加到一个不可见控制台（由短暂运行的 System32 `cmd.exe` 以 `CREATE_NO_WINDOW` 创建），Windows 10 1809 上执行命令不再闪出控制台窗口。同步 `README{,.zh}.md`、`README.i18n.yaml` 与 `tests/runner.spec.ts`。
- `packages/shell/pwsh-local/src/index.ts`：`ENV_OVERRIDES` 增加 `PYTHONIOENCODING=utf-8`，中文 Windows 上 Python 输出不再因 ANSI 代码页（GBK）而乱码。同步 `README{,.zh}.md`、`README.i18n.yaml` 与 `tests/executor.spec.ts`。

**减少动态效果**
- `packages/client/web/src/boot-page.module.css`、`packages/client/ui-input-trigger/src/client/MenuView.module.css`、`packages/client/ui-conversation/src/client/skeleton/InputBar.module.css`、`packages/client/ui-sidebar-terminal/src/client/terminal.module.css`：系统开启「减少动态效果」时，启动转圈、菜单骨架、输入框等待点和终端光标闪烁停在静态画面。

**主题配色**（配色表见下方「主题配色」）
- `packages/client/ui-theme/src/styles/design-platform.css`：新增 `--dsw-alias-button-send-{fill,hover,label}`，默认值等于信息按钮蓝底与白色箭头。
- `packages/client/ui-conversation/src/client/skeleton/InputBar.module.css`：发送按钮改读上述 send token。
- `packages/client/ui-theme/README{,.zh}.md`、`README.i18n.yaml`：「注册主题」一节说明 send token。
- 更新窗口（`apps/desktop/renderer/update-dialog.*`、`mandatory-update.css`）：上游 rc.3 起通过 `shell-theme.js` 读取设计平台 token 并自带深色模式，North 原有的 `--update-*` 配色已撤回，直接使用上游版本。
- `apps/web/tests/north-theme.e2e.ts`、`north-theme.overlay.yml`（新文件）与 `snapshots/web/north-theme/`（新目录）：浏览器配色验收；`apps/web/tsconfig.json` 排除、`tsconfig.host.json` 登记该 e2e。

**发行版回归**
- `apps/web/tests/north-distribution.e2e.ts`（新文件）：把 North bundle 作为已启用的 profile bundle 装载完整组合，验收品牌标题、预装侧栏标签、界面上没有终端入口和「内置插件」页，以及技能设置页：服务启动目录与新会话所在工作区分属不同项目，生效技能来自该工作区的项目 `.dsh/skills`（启动目录中的技能不出现）、`~/.agents/skills`、技能文件夹（含点文件）和内置技能，其 `/` 命令与新会话 `/` 菜单的技能项一致（含 `chart`、`browser-check`、`frontend-page`、`skill-creator`、`ppt-report`），并创建会话核对 Playwright MCP 工具目录；文件夹诊断列出异常条目和被覆盖条目；`apps/web/tsconfig.json` 排除、`tsconfig.host.json` 登记该 e2e。
- `apps/web/tests/expected/north-distribution/skills.expected.md`：记录十一个内置技能在设置页中的可见名称、命令和描述。

**测试可靠性**（上游文件，与 North 功能无关）
- `packages/experimental/ptc-runtime-python/py/bootstrap.py`：完成值检查 `_check_done_value` 与编码 `_encode_json_plain` 在游标内直接处理标量子元素，`_dump_scalar` 对精确的 `int`、`bool`、`None` 直接格式化（与 `json.dumps` 逐字节一致）。内存仍是 O(深度)；600 万元素列表的检查加编码从约 28.6 秒降到约 4 秒，覆盖率分区并发时不再触发运行时的 60 秒墙钟上限。
- `packages/boot/plugin-market/tests/repository-cache.spec.ts`：「Git 无法运行」一例原先用 1 毫秒超时，快的机器上 `git --version` 能在 1 毫秒内返回，超时落到之后的 `git init`，North CI 覆盖率任务因此反复失败；改为在 PATH 上放一个不应答的 `git` 替身；PATH 只含替身目录，Linux 的 `/bin/sh` 找不到 `sleep`，所以替身自己用 `/usr/bin:/bin` 调用 `sleep`。
- `apps/desktop/tests/fixtures/local-updater.mjs`：Windows 上强制更新界面是父窗口里的框架，没有 `capturePage()`；两处截图改为在 Windows 上截父窗口页面（上游 rc.3 的第二处截图在 Windows 上直接报错）。
- `scripts/rescope-vendor.ts`：上游的 `listRescopeFiles` 已将 `git ls-files -z` 的输出缓冲区设为 16 MiB，North 不再维护单独补丁。
- `scripts/persistence-epoch-header.spec.ts`：改读已提交的 `docs/persistence-schema.json`（`verify-persistence-changes` 保证它与重新提取的结果一致），不再为读取一个请求头节点重新编译全部 Host 源码。

**测试快照**：`apps/desktop/tests/expected/*` 等随产品名更新。

## 主题配色

品牌客户端通过主题服务的 `overrideTokens()` 注册浅深色覆盖，颜色表位于 `packages/north/ui-brand/src/client/theme.ts`；卸载时恢复原主题，不修改用户外观偏好。说明文字档 `--dsw-alias-label-caption`（含输入框提示）在两种配色下对所有诺思表面都保持 4.5∶1 以上，由 `tests/browser-plugin.client.spec.tsx` 的对比度测试约束。桌面更新窗口使用上游的设计平台配色，不套用诺思配色。菜单透明材质、状态色、代码高亮与文档预览保持共享主题定义。

## 合并上游

```bash
git fetch upstream
git switch north
git merge upstream/master
```

然后：
1. 解决冲突：文案文件保留上游新增的键，再套用上面的替换；图片冲突保留我方版本。
2. `pnpm install`，然后 `pnpm run gen-tsconfig-paths`。
3. `pnpm exec vitest run packages/north` 确认 North 配置层覆盖的条目在上游仍然存在。
4. `pnpm run build` 和 `pnpm test:expected:refresh`，检查快照差异。

## 管理员：模型设置

真实的内网地址只放在本机和 GitHub secret 中，不进仓库。仓库里的 `apps/desktop/resources/north.env.example` 只有示例值（RFC 5737 文档专用地址）：

- 本机打包：把真实配置放在 `apps/desktop/resources/north.env`（已在 `.gitignore` 中），或用环境变量 `NORTH_ENV_PATH` 指向它。两者都没有时打包失败；只有测试打包可设 `NORTH_ENV_ALLOW_EXAMPLE=1` 改用示例文件。
- CI 打包：`north-windows-desktop.yml` 从仓库 secret `NORTH_ENV`（真实 `north.env` 全文）写出临时文件。
- 不要把真实地址或网段前缀写进提交、文档、AI 会话或外脑记忆；需要时写「见本机 north.env」。

安装后编辑 `%LOCALAPPDATA%\Programs\North\resources\north.env`，保存后重启 North。各项含义如下（值为示例）：

```
# 内网模型一（模型选择器中可选）
NORTH_LLM_BASE_URL=http://192.0.2.10:8088/v1
NORTH_LLM_MODEL=deepseek
NORTH_LLM_DISPLAY_NAME=DeepSeek-V4-Flash
NORTH_LLM_CONTEXT_WINDOW=1000000
NORTH_LLM_MAX_TOKENS=40960
# NORTH_LLM_API_KEY=<网关要求时填写>
# 内网模型二（新会话默认：MiniMax-M2.7）
NORTH_LLM2_BASE_URL=http://192.0.2.20:18800/v1
NORTH_LLM2_MODEL=agent-model
NORTH_LLM2_DISPLAY_NAME=MiniMax-M2.7
NORTH_LLM2_CONTEXT_WINDOW=180000
NORTH_LLM2_MAX_TOKENS=32768
NORTH_LLM2_API_KEY=dummy_key
# 管理网电脑经代理访问，生产网直连；NORTH_PROXY_NETWORK 填管理网地址前缀
NORTH_PROXY=http://198.51.100.20:8080
NORTH_PROXY_NETWORK=198.51.100.
# 能访问互联网时：填写后新会话默认使用 DeepSeek
# DEEPSEEK_API_KEY=<DeepSeek API key>
# NORTH_DEEPSEEK_MODEL=deepseek-v4-pro
# 浏览器自动探测失败时可指定程序的完整路径
# NORTH_BROWSER_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

- Windows 用户环境变量里的同名变量优先于这个文件。
- 代理：North 启动时检查本机 IPv4 地址，有以 `NORTH_PROXY_NETWORK` 开头的地址就把 `HTTP_PROXY`/`HTTPS_PROXY` 设为 `NORTH_PROXY`，模型和网页请求都走代理；生产网电脑直连。电脑上已设置 `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` 时以其为准。
- 浏览器：桌面版在读取 `north.env` 后优先使用已有的 `NORTH_BROWSER_PATH`，否则按系统位置探测 Edge 或 Chrome；Windows 先查系统安装目录，再查用户安装目录，macOS 先查 `/Applications`，再查 `~/Applications`。已安装但仍报找不到浏览器时，在 `north.env` 中设置 `NORTH_BROWSER_PATH` 为程序的完整路径并重启；都找不到时只有浏览器工具调用报错。
- 内网与互联网两类模型同时提供：macOS 上或启动环境带有 `DEEPSEEK_API_KEY` 时新会话默认使用 DeepSeek（端点固定为 `https://api.deepseek.com/anthropic`），否则默认使用内网模型二 MiniMax-M2.7；没有 key 时模型选择器不列出 DeepSeek。网页搜索走 DeepSeek Search API，抓取走本地 HTTP；断网时这两个工具返回不可用。DeepSeek 账号登录、会话日志上传和插件清单字段保持关闭。macOS 上从 shell 启动或登录 shell 已导出该变量时无需写入此文件。
- 用户在「设置 → 模型」页保存过提供者后，本机改用自己保存的值，`north.env` 对这台电脑不再生效。
- 用户数据在 `%USERPROFILE%\.north`，与原版 DeepSeek Harness 的 `~/.dsh` 互不影响。
- 推理模型（Qwen3、DeepSeek V4 等）需要在 `packages/north/bundle/cordis.patch.yml` 的 `north-lan` 模型条目里补 `reasoningEfforts` 和 `compat.thinkingFormat`，见 `docs/user/guide/providers.md`。

## Windows 打包（需要 Windows 11 x64 机器）

打包脚本拒绝在 macOS 上交叉构建 Windows 安装包。

1. 安装 Node 24、Git、Python 3、Visual Studio C++ Build Tools 与 Windows SDK；`corepack enable`。
2. 克隆本仓库并切到 `north` 分支，运行 `pnpm install --frozen-lockfile`。
3. 复制 `apps/desktop/.env.windows.example` 为 `apps/desktop/.env.windows`，设置 `DSH_DESKTOP_APP_ID=com.<公司>.north`。
4. 检查配置：`pnpm --dir apps/desktop run check:package`。
5. 打包：`pnpm --dir apps/desktop run package:win:x64:unsigned`，产物在 `apps/desktop/.desktop-build/targets/win-x64/unsigned-artifacts/`。
6. 把安装包改名为 `North-<版本>-win-x64-setup.exe`，记录 SHA-256（`certutil -hashfile <文件> SHA256`）。

未签名安装包首次运行会出现 SmartScreen「未知发布者」提示，选择「更多信息 → 仍要运行」。

### 安装后验收

- 开始菜单、任务栏、托盘、安装器都显示罗盘图标；关于页显示「基于 DeepSeek Harness (MIT)」。
- 不出现 DeepSeek 登录窗口；默认预设为「办公助手」；权限中没有「完全权限」；没有终端和插件页。
- 改 `north.env` 后重启能切换网关；写作技能可用；能生成 docx / xlsx / pptx 并导出 PDF。
- 抓包 30 分钟（启动、对话、办公任务、空闲），DNS 中不出现 `deepseek`、`deepseeksvc`、`myqcloud`；连接只指向本机回环地址、vLLM 主机，以及管理网电脑上的代理。
- 无法抓包时，先在管理员 PowerShell 执行 `ipconfig /flushdns`，再按上述场景使用 30 分钟，每 5–10 分钟执行一次 `Get-DnsClientCache | Where-Object { $_.Entry -match 'deepseek|myqcloud' }`（应无输出）和 `Get-NetTCPConnection -State Established | Where-Object { (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName -like '*North*' } | Select-Object RemoteAddress, RemotePort -Unique`（只应出现上述地址）。缓存条目会过期，需多次检查；此方法不覆盖 UDP。出口防火墙日志可替代。
