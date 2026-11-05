// Shared Motion settings, spread onto a motion component with v-bind.

// Same curve as --ease in cairn.css
export const EASE_OUT = [0.16, 1, 0.3, 1]

// Rows in a list: rise in, and fade out when they are dealt with.
export const rowMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: { duration: 0.15 } },
  transition: { duration: 0.35, ease: EASE_OUT },
}

// Something that opens in place; needs overflow hidden to clip its contents.
export const expandMotion = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.35, ease: EASE_OUT },
}

export const fadeMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3, ease: EASE_OUT },
}
