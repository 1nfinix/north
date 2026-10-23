/** Locale bundles for the North skills settings section. */

import type { NorthBundledSkillName } from '../shared.ts'

/** Locale keys the section renders. */
export type NorthSkillsLocaleKey =
  | 'nav' | 'title' | 'intro' | 'folderLabel' | 'open' | 'openUnavailable' | 'openFailed' | 'refresh'
  | 'loading' | 'loadFailed' | 'refreshFailed' | 'folderTitle' | 'folderEmpty' | 'invalidTitle'
  | 'problemMissingSkillMd' | 'problemInvalidFrontmatter' | 'problemInvalidName' | 'problemInvalidInvocation' | 'problemUnreadable'
  | 'invocationModelOnly' | 'invocationUserOnly' | 'invocationOff' | 'bundledTitle'
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
  intro: 'Add a skill by putting its folder, containing SKILL.md, into the folder below. No restart is needed; skills shown with / appear in the / menu.',
  folderLabel: 'Skill folder',
  open: 'Open folder',
  openUnavailable: 'No file manager is available. Open the folder path above manually.',
  openFailed: 'The folder could not be opened.',
  refresh: 'Refresh',
  loading: 'Loading skills…',
  loadFailed: 'Skills could not be loaded. Check that the skill folder exists and can be opened, then refresh.',
  refreshFailed: 'Refresh failed. The list below is from the last successful read.',
  folderTitle: 'Added skills',
  folderEmpty: 'No skills added yet.',
  invalidTitle: 'Entries that are not usable skills',
  problemMissingSkillMd: 'No SKILL.md in this folder',
  problemInvalidFrontmatter: 'SKILL.md needs name and description in its header',
  problemInvalidName: 'The name must use lowercase letters, digits, and single hyphens, such as weekly-report',
  problemInvalidInvocation: 'Write disable-model-invocation and user-invocable with hyphens, as true or false',
  problemUnreadable: 'This entry could not be read, for example a shortcut to a missing location. Fix or remove it, then refresh',
  invocationModelOnly: 'Used by the assistant automatically; not in the / menu',
  invocationUserOnly: 'Only when invoked with /; the assistant does not use it automatically',
  invocationOff: 'Turned off: neither the / menu nor the assistant uses it',
  bundledTitle: 'Built-in skills',
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
  intro: '把包含 SKILL.md 的技能文件夹放进下面的文件夹即可添加，无需重启；带 / 的技能输入 / 即可看到。',
  folderLabel: '技能文件夹',
  open: '打开文件夹',
  openUnavailable: '没有可用的文件管理器，请手动打开上面的路径。',
  openFailed: '无法打开文件夹。',
  refresh: '刷新',
  loading: '正在读取技能…',
  loadFailed: '无法读取技能。请确认技能文件夹存在且可以打开，然后刷新。',
  refreshFailed: '刷新失败，下面是上次成功读取的结果。',
  folderTitle: '已添加的技能',
  folderEmpty: '还没有添加技能。',
  invalidTitle: '无法使用的条目',
  problemMissingSkillMd: '文件夹里没有 SKILL.md',
  problemInvalidFrontmatter: 'SKILL.md 开头缺少 name 或 description',
  problemInvalidName: 'name 只能用小写字母、数字和单个连字符，例如 weekly-report',
  problemInvalidInvocation: 'disable-model-invocation 和 user-invocable 的键名用连字符，值只能是 true 或 false',
  problemUnreadable: '无法读取这个条目，例如指向不存在位置的快捷方式。修复或移走后点「刷新」',
  invocationModelOnly: '由助手自动使用，不在 / 菜单中',
  invocationUserOnly: '仅在输入 / 时使用，助手不会自动使用',
  invocationOff: '已关闭：/ 菜单和助手都不会使用',
  bundledTitle: '内置技能',
  skillWeeklyReport: '周报',
  skillMeetingMinutes: '会议纪要',
  skillOfficialNotice: '公文通知',
  skillEmailDraft: '邮件起草',
  skillTranslation: '翻译',
  skillLongSummary: '长文总结',
}
