<script setup>
import { computed, nextTick, ref } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { EASE_OUT } from '@/lib/motion'
import TickIcon from '@/components/common/TickIcon.vue'

// A dropdown in the site's style, because a native select's open list can't be styled.
// Works like one from the keyboard: arrows, Home, End, Enter, Space and Escape.
const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  options: { type: Array, required: true }, // [{ value, label }]
  modelValue: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const activeIndex = ref(0)

const selectedIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue),
)
const optionId = (index) => `${props.id}-option-${index}`

async function openMenu() {
  activeIndex.value = Math.max(selectedIndex.value, 0)
  open.value = true
  await nextTick()
  const list = document.getElementById(`${props.id}-list`)
  list?.focus({ preventScroll: true })
  // Near the bottom of a small screen it would otherwise open out of sight
  list?.scrollIntoView({ block: 'nearest' })
}

function closeMenu({ refocus = true } = {}) {
  open.value = false
  if (refocus) document.getElementById(props.id)?.focus({ preventScroll: true })
}

function choose(index) {
  emit('update:modelValue', props.options[index].value)
  closeMenu()
}

function onButtonKeydown(event) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  openMenu()
}

function onListKeydown(event) {
  const last = props.options.length - 1
  const next = {
    ArrowDown: Math.min(activeIndex.value + 1, last),
    ArrowUp: Math.max(activeIndex.value - 1, 0),
    Home: 0,
    End: last,
  }[event.key]

  if (next !== undefined) {
    event.preventDefault()
    activeIndex.value = next
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    choose(activeIndex.value)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
  } else if (event.key === 'Tab') {
    closeMenu({ refocus: false })
  }
}

// Clicking or tabbing anywhere else closes it
function onFocusOut(event) {
  if (open.value && !event.currentTarget.contains(event.relatedTarget)) {
    closeMenu({ refocus: false })
  }
}
</script>

<template>
  <div class="select-menu" :class="{ 'is-open': open }" @focusout="onFocusOut">
    <span :id="`${id}-label`" class="cairn-label">{{ label }}</span>

    <!-- mousedown.prevent: focus is handed over in code, so a click can't close and reopen it -->
    <button
      :id="id"
      type="button"
      class="select-menu-button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="`${id}-list`"
      :aria-labelledby="`${id}-label ${id}`"
      @mousedown.prevent
      @click="open ? closeMenu() : openMenu()"
      @keydown="onButtonKeydown"
    >
      {{ options[selectedIndex]?.label }}
      <svg class="select-menu-chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3" />
      </svg>
    </button>

    <AnimatePresence>
      <motion.ul
        v-if="open"
        :id="`${id}-list`"
        class="select-menu-list"
        role="listbox"
        tabindex="-1"
        :aria-labelledby="`${id}-label`"
        :aria-activedescendant="optionId(activeIndex)"
        :initial="{ opacity: 0, y: -6 }"
        :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0, transition: { duration: 0.1 } }"
        :transition="{ duration: 0.2, ease: EASE_OUT }"
        @keydown="onListKeydown"
      >
        <li
          v-for="(option, index) in options"
          :id="optionId(index)"
          :key="option.value"
          class="select-menu-option"
          :class="{ 'is-active': index === activeIndex }"
          role="option"
          :aria-selected="index === selectedIndex"
          @mousedown.prevent
          @mousemove="activeIndex = index"
          @click="choose(index)"
        >
          {{ option.label }}
          <TickIcon v-if="index === selectedIndex" />
        </li>
      </motion.ul>
    </AnimatePresence>
  </div>
</template>

<style scoped>
.select-menu {
  position: relative;
  display: grid;
  gap: 6px;
}

/* Above the rows that follow, which form their own layers while they animate */
.select-menu.is-open {
  z-index: 5;
}

.select-menu-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 0 12px 0 14px;
  border: 2px solid var(--ink);
  background: transparent;
  color: var(--ink);
  font: 700 14px / 1.2 var(--font);
  text-align: left;
  cursor: pointer;
}

.select-menu-button:hover,
.select-menu.is-open .select-menu-button {
  background: var(--linen);
}

.select-menu-button:focus-visible,
.select-menu-list:focus-visible {
  outline: 3px solid var(--lake);
  outline-offset: 2px;
}

.select-menu-chevron {
  flex: none;
  width: 14px;
  height: 14px;
  transition: transform 0.25s var(--ease);
}

.select-menu.is-open .select-menu-chevron {
  transform: rotate(180deg);
}

/* Starts on the button's bottom rule, so the two read as one object */
.select-menu-list {
  position: absolute;
  top: calc(100% - 2px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 2px solid var(--ink);
  background: var(--ground);
  filter: drop-shadow(0 16px 24px rgb(23 32 28 / 0.18));
  scroll-margin-bottom: 16px;
}

.select-menu-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 12px 0 14px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.select-menu-option + .select-menu-option {
  border-top: 1px solid var(--granite-200);
}

.select-menu-option.is-active {
  background: var(--linen);
}

.select-menu-option svg {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--pine);
}

@media (prefers-reduced-motion: reduce) {
  .select-menu-chevron {
    transition: none;
  }
}
</style>
