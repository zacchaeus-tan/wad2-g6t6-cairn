import { inject } from 'vue'
import { useReducedMotion } from 'motion-v'
import { EASE_OUT } from '@/lib/motion'

const STAGGER = 0.06 // seconds between rows
const RISE = 12 // px

export const SEEN_ROWS = Symbol('seen rows')

// Rows enter one at a time, but only the first time they appear. The page provides the set of
// rows already seen, because its tabs unmount their lists when you switch away.
export function useRowArrivals() {
  const seen = inject(SEEN_ROWS, new Set())
  const reduceMotion = useReducedMotion()

  return (key, index) => {
    const isNew = !seen.has(key)
    seen.add(key)
    return {
      initial: isNew && !reduceMotion.value ? { opacity: 0, y: RISE } : false,
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, transition: { duration: 0.15 } },
      transition: { duration: 0.35, ease: EASE_OUT, delay: isNew ? index * STAGGER : 0 },
    }
  }
}
