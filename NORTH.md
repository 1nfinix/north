# North（诺思）发行版维护说明

North 是基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（MIT）的公司内部桌面版：
同事在自己的 Windows 电脑上安装，连接局域网里的 vLLM / OpenAI 兼容网关，用于日常办公。

- 分支：`north`，基于上游 dsh v0.2.1-rc.2；上游远程名为 `upstream`。
- 新增代码都在 `packages/north/`；对上游文件的改动见下方清单，合并上游时逐项检查。
- 保留 `LICENSE` 与 `THIRD_PARTY_NOTICES.md`；关于页写明「基于 DeepSeek Harness (MIT)」。

## 新增包

审计与修复交接：[2026-10-23 代码、视觉与功能审计](NORTH-AUDIT-2026-10-23.md)。

| 包 | 作用 |
|---|---|
| `packages/north/ui-brand`（`@deepseek-ai/dsh-north-ui-brand`） | 侧栏与新会话首屏的罗盘标志和「North 诺思」；保存原始 logo 和图标生成脚本 |
| `packages/north/skill-writing`（`@deepseek-ai/dsh-north-skill-writing`） | 六个中文办公写作技能：周报、会议纪要、公文通知、邮件、翻译、长文总结；「设置 → 技能」分区列出技能并打开用户技能文件夹 `~/.north/skills` |
| `packages/north/bundle`（`@deepseek-ai/dsh-north-bundle`） | 配置层：品牌、局域网模型、办公助手预设（默认）、去掉完全权限、禁用终端服务 `terminal-controller`（原生终端和侧边栏终端都不可用）、隐藏插件工具、关闭遥测、预装第三方侧边栏 `dsh-better-sidebar`（版本锁定在其 `package.json`；其文件接口不限于工作区，属于用户本人在界面上的操作，不给它打补丁） |

包名必须以 `@deepseek-ai/` 开头且不能设为 private，否则不会进入桌面版运行时（`scripts/release/families.ts`）。

## 对上游文件的改动清单

**组合接入**
- `apps/cli/package.json`：依赖 `@deepseek-ai/dsh-north-bundle`。
- `apps/desktop/src/project-manager.ts`：`DESKTOP_BUNDLES` 在 Web 模板后追加 North 配置包（初始化与恢复都用它）。
- `apps/desktop/src/north-env.ts`（新文件）与 `apps/desktop/src/main.ts`（`main()` 首行调用 `applyNorthEnvironment`）：数据目录 `~/.north`、关闭遥测、读取 `resources/north.env`。
- `apps/desktop/resources/north.env`（新文件）与 `electron-builder-config.mjs` 的 `extraResources`。
- `tsconfig.base.json`（手写别名）、`tsconfig.host.json`、`tsconfig.client.json`：登记新包。

**品牌文案**
- `apps/desktop/src/locale.ts`、`apps/desktop/installer/strings.nsh`、`apps/desktop/installer/extract-report.h`。
- `apps/desktop/src/main.ts`：关于面板 `applicationName`。
- `apps/desktop/scripts/electron-builder-config.mjs`：`productName: 'North'`、协议显示名、麦克风说明。协议仍是 `dsh://`。
- `apps/desktop/cli/dsh`、`apps/desktop/cli/dsh.cmd`、`scripts/smoke-packaged-runtime.ts`、`scripts/package-macos.ts`、`scripts/package-target.ts`、`scripts/development-app.ts`：可执行文件名 `North`。
- `packages/client/ui-conversation/src/client/locales.ts`：首屏标题「让工作不偏航 / Keep work on course.」、徽标「内部版」、输入框提示。
- `packages/client/locale/src/locales/{zh,en}.ts`：`brand.localBuild`。
- `scripts/client-build-environment.ts`（`DSH_CLIENT_TITLE: 'North'`）、`apps/web/vite.config.ts`、`apps/web/index.html`、`apps/web/public/manifest.webmanifest`。
- `packages/client/ui-chat/src/client/chat/RunningWhaleTail.tsx`：静态指示图形。

**品牌图片**（由 `packages/north/ui-brand/scripts/render-assets.py` 生成，合并冲突时保留我方版本后重新生成）
- `apps/web/public/favicon.svg`、`favicon-dark.svg`
- `apps/desktop/resources/icon{,-macos,-windows}.{svg,png}`、`tray-windows.ico`
- `apps/desktop/renderer/assets/welcome-brand.svg`
- `apps/desktop/installer/assets/brand{,-2x,-dark,-dark-2x}.png`、`uninstaller-sidebar.png`
- `packages/client/ui-chat/src/client/chat/running-whale@2x.png`

- `packages/client/ui-chat/src/client/locale.ts`：思考状态「深度求索中」改为「处理中」（「深度求索」是 DeepSeek 的中文公司名）。
- `packages/client/ui-chat/src/client/locale.ts`：中断提示 `message.failure.interrupted` 的「DSH 进程」改为「应用」，并提示先检查工作区文件再决定是否重新发起；同步 `README{,.zh}.md`、`tests/chat-view.client.spec.tsx`、`apps/web/tests/interrupted-turn.e2e.ts` 与 `snapshots/web/interrupted-turn/ui.expected.md`。
- `apps/web/tests/` 与 `snapshots/web/` 中写死的首屏标题、徽标和输入框提示改为诺思文案（14 个测试文件、6 个快照）。
- `apps/web/tests/pwa-manifest.e2e.ts`（应用名与罗盘 favicon 颜色）、`apps/web/tests/built-boot.expected.e2e.ts`（侧栏 `brand.localBuild` 文案）、`scripts/client-build-environment.client.spec.ts`（官方构建标题）随产品名更新。
- `packages/client/ui-settings-models/src/client/locales.ts`：首次启动「预览版说明」正文改为诺思内部试用说明（标题不变）；`src/onboarding-copy.ts` 的 `WELCOME_NOTICE_VERSION` 改为 `2026-10-23.1`，已确认旧说明的用户会再看到一次。对应测试：`tests/welcome-notice.client.spec.tsx`、`apps/web/tests/scaffold.ts`、`apps/web/tests/expected/onboarding-deepseek-config/welcome.expected.md`。

**技能校验**
- `packages/skill/skill-filesystem/src/index.ts`：把技能文件的 frontmatter 规则抽成导出函数 `parseSkillFrontmatter`（加载器的告警文本不变），供「设置 → 技能」复用；README 中英文「Skill format」一节随之说明。

**仓库门禁**（让新包通过上游检查）
- `scripts/check-workspace-constraints.ts`：`packageFileExtras` 登记写作技能包的 `assets`。
- `scripts/verify-config-source-ownership.ts`：只允许 North 配置包的 `baseURL` 读取 `NORTH_LLM_BASE_URL`（`llm-pi-ai` 没有从环境读取地址的配置项）。
- `scripts/verify-package-readme-model-experience.ts`：登记三个新包的模型体验说明。
- `apps/desktop/src/project-manager.ts` 与 `scripts/verify-product-use.ts`：North 配置包写在字面量 `DESKTOP_DISTRIBUTION_BUNDLES` 里，门禁把「Web 模板 + 该列表」当作桌面版默认组合，三个 North 包因此计入产品运行时使用。
- `scripts/package-dependency-policy.ts`：`SAFE_HOST_DEPENDENCY_EXPORTS` 登记 `@deepseek-ai/dsh-skill-filesystem` 的 `parseSkillFrontmatter`（纯解析函数，2026-10-23 维护者人工审核批准）。
- `scripts/verify-repository-references.ts`：纯十进制数字不再当作提交短哈希（`python/sdk/uv.lock` 里的文件大小 `6344383` 曾与上游提交前缀相撞，上游同样受影响）。
- 重新生成的文档：`docs/module-graph{,.zh}.md`、`THIRD_PARTY_NOTICES.md`（预装侧栏 `dsh-better-sidebar`）、`docs/config-catalog{,.zh}.md`、`packages/extensions/cordis-client-runner/src/client/slot-catalog.ts`、`packages/preset/agent-preset/skills/cordis-composition-reference/references/packages.md`。

**持续集成**
- `.github/workflows/north-ci.yml`（新文件）：推送到 `north` 或手动触发时，在 GitHub 托管机器上运行 `check:ci:static`、`check:ci:coverage` 和 `check:ci:windows-blocking`。上游的 `ci.yml`、`ci-master.yml` 依赖上游组织的大型或自托管运行机器，本仓库没有，因此 `north` 不走 PR 流程；向 `north` 开 PR 时上游 `ci.yml` 的任务会一直排队。

**打包**
- `apps/desktop/scripts/desktop-package-environment.mjs`、`electron-builder-config.mjs`：未签名构建在所有平台跳过强制更新策略地址（上游只对 macOS 跳过）。

**主题配色**（配色表见下方「主题配色」）
- `packages/client/ui-theme/src/styles/design-platform.css`：新增 `--dsw-alias-button-send-{fill,hover,label}`，默认值等于信息按钮蓝底与白色箭头。
- `packages/client/ui-conversation/src/client/skeleton/InputBar.module.css`：发送按钮改读上述 send token。
- `packages/client/ui-theme/README{,.zh}.md`、`README.i18n.yaml`：「注册主题」一节说明 send token。
- `apps/desktop/renderer/update-dialog.css`、`update-dialog.html`、`mandatory-update.css`：颜色改为 `--update-*` 变量并支持深色；关闭图标改用 CSS mask 跟随文字颜色。
- `apps/web/tests/north-theme.e2e.ts`、`north-theme.overlay.yml`（新文件）与 `snapshots/web/north-theme/`（新目录）：浏览器配色验收；`apps/web/tsconfig.json` 排除、`tsconfig.host.json` 登记该 e2e。

**发行版回归**
- `apps/web/tests/north-distribution.e2e.ts`（新文件）与 `apps/web/tests/expected/north-distribution/`（新目录）：把 North bundle 作为已启用的 profile bundle 装载完整组合，验收品牌标题、预装侧栏标签和技能设置页（含异常条目与调用权限展示）；`apps/web/tsconfig.json` 排除、`tsconfig.host.json` 登记该 e2e。

**测试快照**：`apps/desktop/tests/expected/*` 等随产品名更新。

## 主题配色

品牌客户端通过主题服务的 `overrideTokens()` 注册浅深色覆盖，颜色表位于 `packages/north/ui-brand/src/client/theme.ts`；卸载时恢复原主题，不修改用户外观偏好。说明文字档 `--dsw-alias-label-caption`（含输入框提示）在两种配色下对所有诺思表面都保持 4.5∶1 以上，由 `tests/browser-plugin.client.spec.tsx` 的对比度测试约束。桌面更新窗口不加载 Web 主题，`apps/desktop/renderer/update-dialog.css` 保持对应的主次文字、表面、按钮及焦点颜色，其他更新窗口复用该样式。菜单透明材质、状态色、代码高亮与文档预览保持共享主题定义。

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

安装后编辑 `%LOCALAPPDATA%\Programs\North\resources\north.env`，保存后重启 North：

```
NORTH_LLM_BASE_URL=http://<vLLM 主机>:8000/v1
NORTH_LLM_MODEL=<--served-model-name>
NORTH_LLM_DISPLAY_NAME=模型
NORTH_LLM_CONTEXT_WINDOW=32768
NORTH_LLM_MAX_TOKENS=8192
# NORTH_LLM_API_KEY=<网关要求时填写>
```

- Windows 用户环境变量里的同名变量优先于这个文件。
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
- 抓包 30 分钟（启动、对话、办公任务、空闲），DNS 中不出现 `deepseek`、`deepseeksvc`、`myqcloud`；连接只指向本机回环地址和 vLLM 主机。
