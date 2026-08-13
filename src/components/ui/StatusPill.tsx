import type { ReactNode } from 'react'
import styles from './StatusPill.module.css'

export type PillTone = 'info' | 'warning' | 'success' | 'danger' | 'neutral'

const TONE_CLASS: Record<PillTone, string> = {
  info: styles.info,
  warning: styles.warning,
  success: styles.success,
  danger: styles.danger,
  neutral: styles.neutral,
}

interface Props {
  tone?: PillTone
  children: ReactNode
  className?: string
}

/** Status pill with a tone dot. Tones are semantic — never the theme accent. */
export default function StatusPill({ tone = 'neutral', children, className = '' }: Props) {
  return (
    <span className={`${styles.pill} ${TONE_CLASS[tone]} ${className}`}>{children}</span>
  )
}
