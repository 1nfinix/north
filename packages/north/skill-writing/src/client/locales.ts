/** Locale bundles for the North skills settings section. */

import type { NorthBundledSkillName } from '../shared.ts'

/** Locale keys the section renders. */
export type NorthSkillsLocaleKey =
  | 'nav' | 'title' | 'intro' | 'folderLabel' | 'open' | 'openUnavailable' | 'openFailed' | 'refresh'
  | 'loading' | 'loadFailed' | 'refreshFailed' | 'effectiveTitle' | 'effectiveEmpty' | 'incomplete' | 'diagnosticsTitle'
  | 'problemMissingSkillMd' | 'problemInvalidFrontmatter' | 'problemInvalidName' | 'problemInvalidInvocation' | 'problemUnreadable'
  | 'inactiveOverridden' | 'inactiveNotLoaded'
  | 'invocationModelOnly' | 'invocationUserOnly' | 'invocationOff'
  | 'sourceProjectDsh' | 'sourceProjectAgents' | 'sourceCustom' | 'sourceUserDsh' | 'sourceUserAgents' | 'sourceRuntime' | 'sourceBundled'
  | 'skillWeeklyReport' | 'skillMeetingMinutes' | 'skillOfficialNotice' | 'skillEmailDraft' | 'skillTranslation' | 'skillLongSummary'

/** Display title of each bundled skill; its command name stays the invocation. */
export const BUNDLED_TITLE: Record<NorthBundledSkillName, NorthSkillsLocaleKey> = {
  'weekly-report': 'skillWeeklyReport',
  'meeting-minutes': 'skillMeetingMinutes',
  'official-notice': 'skillOfficialNotice',
  'email-draft': 'skillEmailDraft',
  'translation': 'skillTranslation',
  'long-summary': 'skillLongSummary',
}

/** English copy. */
export const en: Record<NorthSkillsLocaleKey, string> = {
  nav: 'Skills',
  title: 'Skills',
  intro: 'These are the skills a new chat in the default workspace can use, the same list the / menu reads. Add a skill by putting its folder, containing SKILL.md, into the skill folder below; no restart is needed.',
  folderLabel: 'Skill folder',
  open: 'Open folder',
  openUnavailable: 'No file manager is available. Open the folder path above manually.',
  openFailed: 'The folder could not be opened.',
  refresh: 'Refresh',
  loading: 'Loading skills…',
  loadFailed: 'Skills could not be loaded. Check that the skill folder exists and can be opened, then refresh.',
  refreshFailed: 'Refresh failed. The list below is from the last successful read.',
  effectiveTitle: 'Skills in effect',
  effectiveEmpty: 'No skills are in effect.',
  incomplete: 'Some skill locations could not be read, so this list may be incomplete. Check the issues below, then refresh.',
  diagnosticsTitle: 'Issues in the skill folder',
  problemMissingSkillMd: 'No SKILL.md in this folder',
  problemInvalidFrontmatter: 'SKILL.md needs name and description in its header',
  problemInvalidName: 'The name must use lowercase letters, digits, and single hyphens, such as weekly-report',
  problemInvalidInvocation: 'Write disable-model-invocation and user-invocable with hyphens, as true or false',
  problemUnreadable: 'This entry could not be read, for example a shortcut to a missing location. Fix or remove it, then refresh',
  inactiveOverridden: 'Not used: a skill with the same name takes effect from',
  inactiveNotLoaded: 'Not loaded. Check the warning above, then refresh',
  invocationModelOnly: 'Used by the assistant automatically; not in the / menu',
  invocationUserOnly: 'Only when invoked with /; the assistant does not use it automatically',
  invocationOff: 'Turned off: neither the / menu nor the assistant uses it',
  sourceProjectDsh: 'Project .dsh/skills',
  sourceProjectAgents: 'Project .agents/skills',
  sourceCustom: 'Custom skill folder',
  sourceUserDsh: 'Skill folder',
  sourceUserAgents: '~/.agents/skills',
  sourceRuntime: 'Added at runtime',
  sourceBundled: 'Built-in',
  skillWeeklyReport: 'Weekly report',
  skillMeetingMinutes: 'Meeting minutes',
  skillOfficialNotice: 'Official notice',
  skillEmailDraft: 'Email draft',
  skillTranslation: 'Translation',
  skillLongSummary: 'Long-document summary',
}

/** Simplified Chinese copy. */
export const zh: Record<NorthSkillsLocaleKey, string> = {
  nav: '技能',
  title: '技能',
  intro: '这里列出默认工作区中新会话可用的技能，与 / 菜单读取同一份清单。把包含 SKILL.md 的技能文件夹放进下面的技能文件夹即可添加，无需重启。',
  folderLabel: '技能文件夹',
  open: '打开文件夹',
  openUnavailable: '没有可用的文件管理器，请手动打开上面的路径。',
  openFailed: '无法打开文件夹。',
  refresh: '刷新',
  loading: '正在读取技能…',
  loadFailed: '无法读取技能。请确认技能文件夹存在且可以打开，然后刷新。',
  refreshFailed: '刷新失败，下面是上次成功读取的结果。',
  effectiveTitle: '当前生效的技能',
  effectiveEmpty: '当前没有生效的技能。',
  incomplete: '部分技能位置读取失败，列表可能不完整。检查下方的问题条目后刷新',
  diagnosticsTitle: '技能文件夹中的问题',
  problemMissingSkillMd: '文件夹里没有 SKILL.md',
  problemInvalidFrontmatter: 'SKILL.md 开头缺少 name 或 description',
  problemInvalidName: 'name 只能用小写字母、数字和单个连字符，例如 weekly-report',
  problemInvalidInvocation: 'disable-model-invocation 和 user-invocable 的键名用连字符，值只能是 true 或 false',
  problemUnreadable: '无法读取这个条目，例如指向不存在位置的快捷方式。修复或移走后点「刷新」',
  inactiveOverridden: '未使用：同名技能已从以下位置生效',
  inactiveNotLoaded: '未加载。查看上方提示后刷新',
  invocationModelOnly: '由助手自动使用，不在 / 菜单中',
  invocationUserOnly: '仅在输入 / 时使用，助手不会自动使用',
  invocationOff: '已关闭：/ 菜单和助手都不会使用',
  sourceProjectDsh: '项目 .dsh/skills',
  sourceProjectAgents: '项目 .agents/skills',
  sourceCustom: '自定义技能目录',
  sourceUserDsh: '技能文件夹',
  sourceUserAgents: '~/.agents/skills',
  sourceRuntime: '运行时添加',
  sourceBundled: '内置',
  skillWeeklyReport: '周报',
  skillMeetingMinutes: '会议纪要',
  skillOfficialNotice: '公文通知',
  skillEmailDraft: '邮件起草',
  skillTranslation: '翻译',
  skillLongSummary: '长文总结',
}
