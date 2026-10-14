import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useChecklistStore = defineStore('checklist', () => {
    const checklistId = ref(null) // set when a saved checklist is open
    const items = ref([])
    const error = ref(null)
    const loading = ref(false)

    function clearError() {
        error.value = null
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

    async function loadItems(id) {
        loading.value = true
        clearError()
        checklistId.value = id
        const { data, error: err } = await supabase
                                    .from('checklist_items')
                                    .select('*')
                                    .eq('checklist_id', id)
                                    .order('category')
        loading.value = false
        if (err) {
            error.value = err.message
            return false
        }
        items.value = data
        return true
    }

    async function addCustom(form) {
        clearError()
        if (!validate(form)){
            return false
        }
        if (!checklistId.value) {
            error.value = 'Save the checklist first before adding items.'
            return false
        }

        const cleaned = clean(form)
        const item = {
            label:cleaned.label,
            category:cleaned.category,
            quantity:cleaned.quantity,
            reason:cleaned.reason
        }

        const { data, error: err } = await supabase
                                    .from('checklist_items')
                                    .insert({
                                        item, 
                                        checklist_id: checklistId.value, 
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
        const { error: err } = await supabase.from('checklist_items').delete().eq('id', id)
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
                                    .update({ checked })
                                    .eq('id', id)
        if (err) {
            error.value = err.message
            return false
        }
        const item = items.value.find((x) => x.id === id)
        if (item){
            item.checked = checked
        }
        return true
    }

    return {
        checklistId,
        items,
        error,
        loading,
        clearError,
        loadItems,
        addCustom,
        updateItem,
        deleteItem,
        toggleChecked,
    }
})