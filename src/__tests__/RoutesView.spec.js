import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { fetchRoutes } from '../api/routes'
import RoutesView from '../views/RoutesList.vue'

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

  it('filters routes by name without matching case', async () => {
    fetchRoutes.mockResolvedValue([
      { id: 'route-1', name: 'Mount Example', distance_km: 12.5 },
      { id: 'route-2', name: 'Coastal Trail', distance_km: 8 },
    ])

    const wrapper = await mountRoutesView()
    await flushPromises()
    await wrapper.get('#route-search').setValue('mOuNt')

    expect(wrapper.text()).toContain('Mount Example')
    expect(wrapper.text()).not.toContain('Coastal Trail')
  })

  it('shows a message when no route names match', async () => {
    fetchRoutes.mockResolvedValue([{ id: 'route-1', name: 'Mount Example' }])

    const wrapper = await mountRoutesView()
    await flushPromises()
    await wrapper.get('#route-search').setValue('desert')

    expect(wrapper.text()).toContain('No routes match the selected search and country filters.')
  })

  it('sorts routes by distance and keeps missing distances at the end', async () => {
    fetchRoutes.mockResolvedValue([
      { id: 'route-long', name: 'Long Route', distance_km: 20 },
      { id: 'route-no-distance', name: 'Unmeasured Route', distance_km: null },
      { id: 'route-short', name: 'Short Route', distance_km: 5 },
    ])

    const wrapper = await mountRoutesView()
    await flushPromises()
    await wrapper.get('#distance-sort').setValue('ascending')

    const getRouteOrder = () =>
      wrapper.findAll('.route-card h2').map((heading) => heading.text())

    expect(getRouteOrder()).toEqual(['Short Route', 'Long Route', 'Unmeasured Route'])

    await wrapper.get('#distance-sort').setValue('descending')

    expect(getRouteOrder()).toEqual(['Long Route', 'Short Route', 'Unmeasured Route'])
  })

  it('filters routes by country and combines the filter with name search', async () => {
    fetchRoutes.mockResolvedValue([
      { id: 'route-1', name: 'Mountain Trail', country: 'Singapore' },
      { id: 'route-2', name: 'Mountain Ridge', country: 'Malaysia' },
      { id: 'route-3', name: 'Coastal Walk', country: 'Singapore' },
    ])

    const wrapper = await mountRoutesView()
    await flushPromises()
    await wrapper.get('#country-filter').setValue('Singapore')

    expect(wrapper.text()).toContain('Mountain Trail')
    expect(wrapper.text()).toContain('Coastal Walk')
    expect(wrapper.text()).not.toContain('Mountain Ridge')

    await wrapper.get('#route-search').setValue('mountain')

    expect(wrapper.text()).toContain('Mountain Trail')
    expect(wrapper.text()).not.toContain('Coastal Walk')
    expect(wrapper.text()).not.toContain('Mountain Ridge')
  })
})
