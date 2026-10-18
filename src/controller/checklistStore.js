import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const categories = ['clothing', 'safety', 'navigation', 'water_food', 'shelter', 'documents', 'other']

export const useChecklistStore = defineStore('checklist', () => {
    const checklist = ref(null) // current checklist row, or null
    const items = ref([])
    const error = ref(null)
    const loading = ref(false)
    const savedChecklists = ref([]) // every saved checklist, for the profile page
    const savedLoading = ref(false)

    const checklistId = computed(() =>   
        checklist.value ? checklist.value.id : null
    )

    function clearError() {
        error.value = null
    }

    function reset() {
        checklist.value = null
        items.value = []
        savedChecklists.value = []

        clearError()
    }

    function validate(form) {
        if (form.label == null || form.label.trim() === '') {
            error.value = 'Item name is required.'
            return false
        }
        if (form.quantity == null || form.quantity.trim() === ''){
            error.value = 'Quantity is required.'
            return false
        }
        return true
    }

    function clean(form) {
        return {
            label: form.label.trim(),
            category: form.category || 'other',
            quantity: form.quantity?.toString().trim() || null,
            reason: form.reason?.trim() || null,
        }
    }

    // ---------- LLM (via the generate-checklist Edge Function) ----------
    async function fetchItemsFromLLM(route) {
        const { data, error: err } = await supabase.functions.invoke('generate-checklist', {
            body: { route_id: route.id },
        })
        if (err || !Array.isArray(data?.items)) {
            console.error('generate-checklist failed:', err, data)
            throw new Error('Could not generate a checklist right now. Please try again.')
        }

        return data.items
            //remove invalid checklist items
            .filter((i) => typeof i?.label === 'string' && i.label.trim())
            // clean each item
            .map((i) => ({
                label: i.label.trim().slice(0, 100),
                category: categories.includes(i.category) ? i.category : 'other',
                quantity: i.quantity ? String(i.quantity).slice(0, 30) : '1',
                reason: i.reason ? String(i.reason).slice(0, 200) : null,
                is_checked: false,
                is_custom: false,

            }))
    }

    async function generate(route) {
        if (checklist.value?.is_saved) {
            error.value = 'Unsave this checklist before generating a new one.'
            return false
        }
        loading.value = true
        clearError()

        let success = false

        try {
            const response = await supabase.auth.getUser()
            const userData = response.data     
            const user = userData?.user
            if (!user) {
                throw new Error('Please sign in to generate a checklist.')
            }

            // 1. call the LLM first so a failure never deletes the existing checklist
            const generated = await fetchItemsFromLLM(route)
            if (!generated.length) {
                throw new Error('No items were generated. Please try again.')
            }

            // 2. replace the old checklist
            const { error: delErr } = await supabase
                .from('checklists')
                .delete()
                .eq('user_id', user.id)
                .eq('route_id', route.id)
            if (delErr){ 
                throw delErr
            }

            // create new checklist record
            const { data: created, error: insErr } = await supabase
                .from('checklists')
                .insert({ 
                    user_id: user.id, 
                    route_id: route.id, 
                    is_saved: false })
                .select()
                .single()
            if (insErr) {
                throw insErr
            }

            // add in generated items to new checklist
            const { data: createdItems, error: itemsErr } = await supabase
                .from('checklist_items')
                .insert(generated.map((i) => ({
                    label: i.label,
                    category: i.category,
                    quantity: i.quantity,
                    reason: i.reason,
                    is_checked: i.is_checked,
                    is_custom: i.is_custom,
                    checklist_id: created.id
                    }))
                )
                .select()
            if (itemsErr) {
                throw itemsErr
            }

            checklist.value = created
            items.value = createdItems
            success =  true
        } catch (e) {
            error.value = e.message
            return false
        }finally {
            loading.value = false
        }
        return success        
    }

    // loading
    async function loadForRoute(routeId) {
        loading.value = true
        clearError()
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user
        if (!user) {
            reset()
            loading.value = false
            return false
        }

        const { data, error: err } = await supabase
            .from('checklists')
            .select('*')
            .eq('user_id', user.id)
            .eq('route_id', routeId)
            .eq('is_saved', true)
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        if (err) {
            error.value = err.message
            loading.value = false
            return false
        }
        if (!data) {
            reset()
            loading.value = false
            return true
        }

        checklist.value = data
        const { data: rows, error: itemsErr } = await supabase
            .from('checklist_items')
            .select('*')
            .eq('checklist_id', data.id)
            .order('category')
        loading.value = false
        if (itemsErr) {
            error.value = itemsErr.message
            return false
        }
        items.value = rows
        return true
    }

    // all saved checklists for the signed-in user, with route names and items
    async function loadSaved() {
        savedLoading.value = true
        clearError()
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user
        if (!user) {
            savedChecklists.value = []
            savedLoading.value = false
            return false
        }

        // 1. the saved checklists
        const { data: lists, error: listErr } = await supabase
            .from('checklists')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_saved', true)
            .order('generated_at', { ascending: false })
        if (listErr) {
            error.value = listErr.message
            savedLoading.value = false
            return false
        }
        if (lists.length === 0) {
            savedChecklists.value = []
            savedLoading.value = false
            return true
        }

        const listIds = lists.map((l) => l.id)
        const routeIds = lists.map((l) => l.route_id)

        // 2. their items
        const { data: rows, error: itemsErr } = await supabase
            .from('checklist_items')
            .select('*')
            .in('checklist_id', listIds)
            .order('category')
        if (itemsErr) {
            error.value = itemsErr.message
            savedLoading.value = false
            return false
        }

        // 3. the route names
        const { data: routes, error: routesErr } = await supabase
            .from('routes')
            .select('id, name, country')
            .in('id', routeIds)
        if (routesErr) {
            error.value = routesErr.message
            savedLoading.value = false
            return false
        }

        // put it together: one entry per saved checklist
        const result = []
        for (const l of lists) {
            const route = routes.find((r) => String(r.id) === String(l.route_id))
            result.push({
                id: l.id,
                route_id: l.route_id,
                route_name: route ? route.name : 'Unknown route',
                country: route ? route.country : null,
                items: rows.filter((i) => i.checklist_id === l.id)
            })
        }
        savedChecklists.value = result
        savedLoading.value = false
        return true
    }
    

    async function toggleSaved() {
        if (!checklist.value){
            return false
        }
        clearError()

        const next = !checklist.value.is_saved
        const { error: err } = await supabase
            .from('checklists')
            .update({ is_saved: next })
            .eq('id', checklist.value.id)
        if (err) {
            error.value = err.message
            return false
        }
        checklist.value.is_saved = next
        return true
    }

    // custom item CRUD
    async function addCustom(form, targetId) {
        clearError()
        if (!validate(form)){
            return false
        }
        const id = targetId || checklistId.value
        if (!id) {
            error.value = 'Save the checklist first before adding items.'
            return false
        }

        const cleaned = clean(form)

        const { data, error: err } = await supabase
            .from('checklist_items')
            .insert({
                label: cleaned.label,
                category: cleaned.category,
                quantity: cleaned.quantity, 
                reason: cleaned.reason,
                checklist_id: id, 
                is_custom: true })
            .select()
            .single()
        if (err) {
            error.value = err.message
            return false
        }
        items.value.push(data)
        return true
    }

    async function updateItem(id, form) {
        clearError()
        if (!validate(form)){
            return false
        }

        const { data, error: err } = await supabase
            .from('checklist_items')
            .update(clean(form))
            .eq('id', id)
            .select()
            .single()
        if (err) {
            error.value = err.message
            return false
        }
        const i = items.value.findIndex((x) => x.id === id)
        if (i !== -1){
            items.value[i] = data
        }
        return true
    }

    async function deleteItem(id) {
        clearError()
        const { error: err } = await supabase
            .from('checklist_items')
            .delete()
            .eq('id', id)
        if (err) {
            error.value = err.message
            return false
        }
        items.value = items.value.filter((x) => x.id !== id)
        return true
    }

    async function toggleChecked(id, checked) {
        clearError()
        const { error: err } = await supabase
            .from('checklist_items')
            .update({ is_checked:checked })
            .eq('id', id)
        if (err) {
            error.value = err.message
            return false
        }
        const item = items.value.find((x) => x.id === id)
        if (item){
            item.is_checked = checked
        }
        return true
    }

    return {
        checklist,
        checklistId,
        items,
        error,
        loading,
        savedChecklists,
        savedLoading,
        clearError,
        reset,
        loadForRoute,
        loadSaved,
        generate,
        toggleSaved,
        addCustom,
        updateItem,
        deleteItem,
        toggleChecked
    }
})