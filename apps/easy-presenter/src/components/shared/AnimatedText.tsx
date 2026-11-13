'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { TextAnimation } from '../types'
import { useLowSpec } from '@/lib/perfMode'

const ENTER_EASING: Record<string, string> = {
  bounce: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
  pop:    'cubic-bezier(0.34, 1.56, 0.64, 1)',
  type:   'steps(1, end)',
}
const LOOP_EASING: Record<string, string> = {
  neon: 'linear',
}

interface Props {
  text: string
  anim: TextAnimation
  /** Base paragraph style from SlideCanvas */
  style: CSSProperties
}

/**
 * Renders slide text split into animation units (slide / line / word / char).
 * Each unit gets the entrance animation followed by the loop effect, offset by
 * `stagger` per unit. Remount (via key) to replay the entrance.
 */
export function AnimatedText({ text, anim: animIn, style }: Props) {
  // Low-spec PCs: keep the entrance, drop the continuous loop (glow / neon / pulse …)
  const lowSpec = useLowSpec()
  const anim = lowSpec ? { ...animIn, loop: 'none' as const } : animIn
  const enterMs = anim.enter === 'none' ? 0 : anim.duration

  const unitStyle = (i: number): CSSProperties => {
    const delay = i * anim.stagger
    const parts: string[] = []
    if (anim.enter !== 'none') {
      parts.push(`ec-in-${anim.enter} ${anim.duration}ms ${ENTER_EASING[anim.enter] ?? 'ease-out'} ${delay}ms both`)
    }
    if (anim.loop !== 'none') {
      parts.push(`ec-loop-${anim.loop} ${anim.loopSpeed}s ${LOOP_EASING[anim.loop] ?? 'ease-in-out'} ${delay + enterMs}ms infinite`)
    }
    return parts.length ? { animation: parts.join(', '), willChange: 'transform, opacity' } : {}
  }

  const base: CSSProperties = { ...style, ['--ec-glow' as string]: anim.glowColor }

  if (anim.unit === 'slide') {
    return <p style={{ ...base, ...unitStyle(0) }}>{text}</p>
  }

  let idx = 0
  const lines = text.split('\n')

  return (
    <p style={{ ...base, whiteSpace: 'normal' }}>
      {lines.map((line, li) => {
        if (anim.unit === 'line') {
          return (
            <span key={li} style={{ display: 'block', ...unitStyle(idx++) }}>
              {line || ' '}
            </span>
          )
        }

        const tokens = line.split(/(\s+)/).filter(t => t !== '')
        const content: ReactNode[] = tokens.map((tok, ti) => {
          if (/^\s+$/.test(tok)) return ' '
          if (anim.unit === 'word') {
            return <span key={ti} style={{ display: 'inline-block', ...unitStyle(idx++) }}>{tok}</span>
          }
          // char — keep each word unbreakable so wrapping still happens at spaces
          return (
            <span key={ti} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {Array.from(tok).map((ch, ci) => (
                <span key={ci} style={{ display: 'inline-block', ...unitStyle(idx++) }}>{ch}</span>
              ))}
            </span>
          )
        })

        return <span key={li} style={{ display: 'block' }}>{content.length ? content : ' '}</span>
      })}
    </p>
  )
}

export function hasTextAnimation(anim: TextAnimation | undefined): anim is TextAnimation {
  return !!anim && (anim.enter !== 'none' || anim.loop !== 'none')
}
