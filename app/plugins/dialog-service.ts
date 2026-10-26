import { markRaw, shallowReactive, type Component } from 'vue'

interface DialogEntry {
  id: string
  component: Component
  props: Record<string, unknown>
  onClose?: (result?: unknown) => void
}

export default defineNuxtPlugin(() => {
  const dialogs = shallowReactive<DialogEntry[]>([])
  let nextId = 0

  function showDialog(component: Component, props: Record<string, unknown> = {}, onClose?: (result?: unknown) => void) {
    const id = `dialog-${++nextId}`
    dialogs.push({ id, component: markRaw(component), props, onClose })
    return id
  }

  function closeDialog(id: string, result?: unknown) {
    const index = dialogs.findIndex(dialog => dialog.id === id)
    if (index === -1) return
    const [dialog] = dialogs.splice(index, 1)
    dialog?.onClose?.(result)
  }

  return {
    provide: {
      dialogService: { dialogs, showDialog, closeDialog },
    },
  }
})
