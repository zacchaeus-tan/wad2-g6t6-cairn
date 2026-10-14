import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import Homepage from '../views/Homepage.vue'

describe('App', () => {
  it('renders the homepage at the root route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: Homepage }],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('nav[aria-label="Main navigation"]').text()).toContain('Browse routes')
    expect(wrapper.get('nav[aria-label="Main navigation"]').text()).toContain('Take the quiz')
    expect(wrapper.text()).toContain('Know whether a trek matches you before you go')
  })
})
