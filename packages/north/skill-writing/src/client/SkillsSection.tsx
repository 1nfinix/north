/** Skills settings section: the user skill folder with an open action, its skills, and the built-in skills. */

import { useCallback, useEffect, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { NorthSkillInvocation, NorthSkillProblem, NorthSkillSummary, NorthSkillsSnapshot } from '../shared.ts'
import { NorthSkillsLoadError, type OpenFolderOutcome } from './controller.ts'
import type { NorthSkillsLocaleKey } from './locales.ts'
import css from './SkillsSection.module.css'

/** Registration-side business face for the section. */
export interface NorthSkillsSectionInjected {
  /** Read the bundled skills and the user folder. */
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

/** Only user-invocable skills render as `/<name>`, matching the session `skills/list` catalog. */
function SkillList({ skills, t }: { skills: readonly NorthSkillSummary[]; t: (key: NorthSkillsLocaleKey) => string }) {
  return (
    <ul className={css.list}>
      {skills.map((skill) => {
        const policy = invocationKey(skill.invocation)
        return (
          <li key={skill.name} className={css.row}>
            <span className={css.name}>{skill.invocation.userInvocable ? `/${skill.name}` : skill.name}</span>
            {policy !== undefined && <span className={css.policy}>{t(policy)}</span>}
            <span className={css.description}>{skill.description}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Render the skills section; it reloads on mount and on Refresh. */
export function NorthSkillsSection({ t, load, open }: NorthSkillsSectionProps) {
  const [state, setState] = useState<Loaded>({ kind: 'loading' })
  const [notice, setNotice] = useState<NorthSkillsLocaleKey>()

  const reload = useCallback(() => {
    let live = true
    setState(previous => previous.kind === 'ready' || previous.kind === 'stale' ? previous : { kind: 'loading' })
    load().then(
      (snapshot) => { if (live) setState({ kind: 'ready', snapshot }) },
      // The alert reports the failure; the Host route logs its cause.
      (error: unknown) => {
        if (!live) return
        const directory = error instanceof NorthSkillsLoadError ? error.directory : undefined
        setState(previous => previous.kind === 'ready' || previous.kind === 'stale'
          ? { kind: 'stale', snapshot: previous.snapshot }
          : { kind: 'failed', directory })
      },
    )
    return () => { live = false }
  }, [load])

  useEffect(reload, [reload])

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
    <div className={css.section}>
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
          <h3 className={css.subheading}>{t('folderTitle')}</h3>
          {state.snapshot.folder.length === 0
            ? <p className={css.muted}>{t('folderEmpty')}</p>
            : <SkillList skills={state.snapshot.folder} t={t} />}
          {state.snapshot.invalid.length > 0 && (
            <>
              <h3 className={css.subheading}>{t('invalidTitle')}</h3>
              <ul className={css.list}>
                {state.snapshot.invalid.map(item => (
                  <li key={item.entry} className={css.row}>
                    <span className={css.name}>{item.entry}</span>
                    <span className={css.description}>{t(PROBLEM_KEY[item.problem])}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3 className={css.subheading}>{t('bundledTitle')}</h3>
          <SkillList skills={state.snapshot.bundled} t={t} />
        </>
      )}
    </div>
  )
}
