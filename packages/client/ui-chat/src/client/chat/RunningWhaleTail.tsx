/** Animated compass mask and static SVG fallback for the running Chat status. */
import css from './ChatView.module.css'

const REST_PATH = 'M12.6 5.2A5.4 5.4 0 1 0 13.4 8M4.2 11.8L11.8 4.2'

/**
 * Render the decorative running icon; the APNG asset owns its animation timing.
 * @returns mask and static SVG selected by browser capabilities and accessibility preferences.
 */
export function RunningWhaleTail() {
  return (
    <span className={css.runningIcon} aria-hidden="true">
      <span className={css.runningWhaleAnimated} />
      <svg className={css.runningWhaleStill} width="100%" height="100%" viewBox="0 0 16 16" fill="none">
        <path d={REST_PATH} stroke="currentColor" strokeWidth={1} />
      </svg>
    </span>
  )
}
