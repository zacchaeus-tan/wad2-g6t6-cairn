import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { fetchRoutes } from '../api/routes'
import RoutesView from '../views/RoutesList.vue/index.js'

vi.mock('../api/routes', () => ({
  fetchRoutes: vi.fn(),
}))

async function mountRoutesView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/routes', component: RoutesView },
      { path: '/routes/:id', name: 'route-detail', component: RoutesView },
    ],
  })
  await router.push('/routes')
  await router.isReady()

  return mount(RoutesView, {
    global: {
      plugins: [router],
    },
  })
}

describe('RoutesView', () => {
  it('loads and displays route details', async () => {
    fetchRoutes.mockResolvedValue([
      {
        id: 'route-1',
        name: 'Mount Example',
        country: 'Singapore',
        distance_km: 12.5,
        elevation_gain_m: 450,
        duration_days: 1,
        official_difficulty: 2,
        safety_status: 'open',
        avg_rating: 4.5,
        review_count: 10,
      },
    ])

    const wrapper = await mountRoutesView()
    await flushPromises()

    expect(wrapper.text()).toContain('Mount Example')
    expect(wrapper.text()).toContain('Singapore')
    expect(wrapper.text()).toContain('12.5 km')
    expect(wrapper.text()).toContain('Moderate')
    expect(wrapper.text()).toContain('10 reviews')
    expect(wrapper.get('a[aria-label="View details for Mount Example"]').attributes('href')).toBe(
      '/routes/route-1',
    )
  })

  it('shows an error when the route request fails', async () => {
    fetchRoutes.mockRejectedValue(new Error('Request failed'))

    const wrapper = await mountRoutesView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Request failed')
  })
})
