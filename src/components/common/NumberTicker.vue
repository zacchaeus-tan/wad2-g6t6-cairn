<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { animate, useInView } from 'motion-v'
import { EASE_OUT } from '@/lib/motion'

// A number that counts up from zero once it scrolls into view.
// Screen readers get the final value straight away.
const props = defineProps({
  value: { type: Number, required: true },
  decimals: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
})

const root = ref(null)
const inView = useInView(root, { once: true, amount: 0.6 })
// Starts at zero so the count doesn't flash the final value first
const shown = ref(0)
let controls = null

function format(number) {
  return `${props.prefix}${number.toLocaleString('en', {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  })}${props.suffix}`
}

const finalText = computed(() => format(props.value))

function run() {
  controls?.stop()
  controls = animate(0, props.value, {
    duration: 1.2,
    ease: EASE_OUT,
    onUpdate: (latest) => (shown.value = latest),
  })
}

watch(inView, (visible) => visible && run())
watch(
  () => props.value,
  () => (inView.value ? run() : (shown.value = props.value)),
)

onBeforeUnmount(() => controls?.stop())
</script>

<template>
  <span ref="root" class="number-ticker">
    <span aria-hidden="true">{{ format(shown) }}</span>
    <span class="cairn-visually-hidden">{{ finalText }}</span>
  </span>
</template>

<style scoped>
.number-ticker {
  font-variant-numeric: tabular-nums lining-nums;
}
</style>
