/** Skills settings section: the user skill folder with its actions, the skills in effect, and the folder's diagnostics. */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  NORTH_WRITING_PROVIDER, SKILL_NAMES, type NorthBundledSkillName, type NorthEffectiveSkill, type NorthSkillInvocation,
  type NorthSkillProblem, type NorthSkillsSnapshot,
} from '../shared.ts'
import { NorthSkillsLoadError, type OpenFolderOutcome } from './controller.ts'
import { BUNDLED_TITLE, type NorthSkillsLocaleKey } from './locales.ts'
import css from './SkillsSection.module.css'

/** Registration-side business face for the section. */
export interface NorthSkillsSectionInjected {
  /** Read the skills in effect and the user folder diagnostics. */
  load: () => Promise<NorthSkillsSnapshot>
  /** Open the user folder in the platform file manager. */
  open: (directory: string) => Promise<OpenFolderOutcome>
}

/** Props the renderer binds for the section. */
export type NorthSkillsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'north.skills'>
  & InjectFace<NorthSkillsSectionInjected>

/**
 * `stale` keeps the last successful snapshot on screen after a failed refresh;
 * `failed` carries the user folder when the route's failure body names it.
 */
type Loaded =
  | { kind: 'loading' }
  | { kind: 'failed'; directory: string | undefined }
  | { kind: 'ready'; snapshot: NorthSkillsSnapshot }
  | { kind: 'stale'; snapshot: NorthSkillsSnapshot }

const PROBLEM_KEY: Record<NorthSkillProblem, NorthSkillsLocaleKey> = {
  'missing-skill-md': 'problemMissingSkillMd',
  'invalid-frontmatter': 'problemInvalidFrontmatter',
  'invalid-name': 'problemInvalidName',
  'invalid-invocation': 'problemInvalidInvocation',
  'unreadable': 'problemUnreadable',
}

/** Label for a policy other than the default (both invocations allowed). */
function invocationKey({ modelInvocable, userInvocable }: NorthSkillInvocation): NorthSkillsLocaleKey | undefined {
  if (userInvocable) return modelInvocable ? undefined : 'invocationUserOnly'
  return modelInvocable ? 'invocationModelOnly' : 'invocationOff'
}

const SOURCE_KEY: Readonly<Record<string, NorthSkillsLocaleKey>> = {
  'project-dsh': 'sourceProjectDsh',
  'project-agents': 'sourceProjectAgents',
  'custom': 'sourceCustom',
  'user-dsh': 'sourceUserDsh',
  'user-agents': 'sourceUserAgents',
  'runtime': 'sourceRuntime',
  'bundled': 'sourceBundled',
}

/** Localized label of a registry source; a source this section does not know shows its registry name. */
function sourceLabel(source: string, t: (key: NorthSkillsLocaleKey) => string): string {
  const key = SOURCE_KEY[source]
  return key === undefined ? source : t(key)
}

function isBundledName(name: string): name is NorthBundledSkillName {
  return (SKILL_NAMES as readonly string[]).includes(name)
}

/**
 * Only user-invocable skills render as `/<name>`, matching the `/` menu. A
 * North built-in skill leads with its localized title and shows the command
 * beside it; other skills have no title source, so their command is the heading.
 */
function SkillList({ skills, t }: {
  skills: readonly NorthEffectiveSkill[]
  t: (key: NorthSkillsLocaleKey) => string
}) {
  return (
    <ul className={css.list}>
      {skills.map((skill) => {
        const policy = invocationKey(skill.invocation)
        const command = skill.invocation.userInvocable ? `/${skill.name}` : skill.name
        const title = skill.provider === NORTH_WRITING_PROVIDER && isBundledName(skill.name) ? t(BUNDLED_TITLE[skill.name]) : undefined
        return (
          <li key={skill.name} className={css.row}>
            <span className={css.head}>
              {title !== undefined && <span className={css.name}>{title}</span>}
              <span className={title === undefined ? css.name : css.command}>{command}</span>
              <span className={css.source} title={skill.path}>{sourceLabel(skill.source, t)}</span>
            </span>
            {policy !== undefined && <span className={css.policy}>{t(policy)}</span>}
            <span className={css.description} title={skill.description}>{skill.description}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Unusable and overridden user-folder entries; renders nothing when the folder has neither. */
function FolderDiagnostics({ snapshot, t }: {
  snapshot: NorthSkillsSnapshot
  t: (key: NorthSkillsLocaleKey) => string
}) {
  if (snapshot.invalid.length === 0 && snapshot.inactive.length === 0) return null
  return (
    <section className={css.group} aria-label={t('diagnosticsTitle')}>
      <h3 className={css.subheading}>{t('diagnosticsTitle')}</h3>
      <ul className={css.list}>
        {snapshot.invalid.map(item => (
          <li key={item.entry} className={css.row}>
            <span className={css.name}>{item.entry}</span>
            <span className={css.description}>{t(PROBLEM_KEY[item.problem])}</span>
          </li>
        ))}
        {snapshot.inactive.map(item => (
          <li key={item.entry} className={css.row}>
            <span className={css.name}>{item.entry}</span>
            <span className={css.description} title={item.winner?.path}>
              {item.winner === undefined
                ? t('inactiveNotLoaded')
                : `${t('inactiveOverridden')} ${sourceLabel(item.winner.source, t)}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Render the skills section; it reloads on mount and on Refresh. Only the
 * latest load may commit a result or an error: each load takes the next
 * request number, and unmount or a new `load` identity advances the number
 * past every pending load.
 */
export function NorthSkillsSection({ t, load, open }: NorthSkillsSectionProps) {
  const [state, setState] = useState<Loaded>({ kind: 'loading' })
  const [notice, setNotice] = useState<NorthSkillsLocaleKey>()
  const latest = useRef(0)

  const reload = useCallback(() => {
    const request = ++latest.current
    setState(previous => previous.kind === 'ready' || previous.kind === 'stale' ? previous : { kind: 'loading' })
    load().then(
      (snapshot) => { if (request === latest.current) setState({ kind: 'ready', snapshot }) },
      // The alert reports the failure; the Host route logs its cause.
      (error: unknown) => {
        if (request !== latest.current) return
        const directory = error instanceof NorthSkillsLoadError ? error.directory : undefined
        setState(previous => previous.kind === 'ready' || previous.kind === 'stale'
          ? { kind: 'stale', snapshot: previous.snapshot }
          : { kind: 'failed', directory })
      },
    )
  }, [load])

  useEffect(() => {
    reload()
    return () => { latest.current += 1 }
  }, [reload])

  const openFolder = (directory: string): void => {
    setNotice(undefined)
    open(directory).then(
      (outcome) => {
        if (outcome === 'unavailable') setNotice('openUnavailable')
        else if (outcome === 'failed') setNotice('openFailed')
      },
      (_error: unknown) => { setNotice('openFailed') },
    )
  }

  const folderCard = (directory: string) => (
    <div className={css.folder}>
      <span className={css.folderLabel}>{t('folderLabel')}</span>
      <code className={css.path}>{directory}</code>
      <div className={css.actions}>
        <Button variant="primary" size="sm" onClick={() => { openFolder(directory) }}>{t('open')}</Button>
        <Button variant="outline" size="sm" onClick={reload}>{t('refresh')}</Button>
      </div>
      {notice !== undefined && <p className={css.muted} role="status">{t(notice)}</p>}
    </div>
  )

  return (
    <section className={css.section} aria-label={t('title')}>
      <h2 className={css.heading}>{t('title')}</h2>
      <p className={css.intro}>{t('intro')}</p>
      {state.kind === 'loading' && <p className={css.muted}>{t('loading')}</p>}
      {state.kind === 'failed' && (
        <>
          <p className={css.muted} role="alert">{t('loadFailed')}</p>
          {state.directory === undefined
            ? (
              <div className={css.actions}>
                <Button variant="outline" size="sm" onClick={reload}>{t('refresh')}</Button>
              </div>
            )
            : folderCard(state.directory)}
        </>
      )}
      {(state.kind === 'ready' || state.kind === 'stale') && (
        <>
          {state.kind === 'stale' && <p className={css.muted} role="alert">{t('refreshFailed')}</p>}
          {folderCard(state.snapshot.directory)}
          {!state.snapshot.complete && <p className={css.muted} role="status">{t('incomplete')}</p>}
          <section className={css.group} aria-label={t('effectiveTitle')}>
            <h3 className={css.subheading}>{t('effectiveTitle')}</h3>
            {state.snapshot.effective.length === 0
              ? <p className={css.muted}>{t('effectiveEmpty')}</p>
              : <SkillList skills={state.snapshot.effective} t={t} />}
          </section>
          <FolderDiagnostics snapshot={state.snapshot} t={t} />
        </>
      )}
    </section>
  )
}
