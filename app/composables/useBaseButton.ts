import VjsfFormDialog from '~/components/forms/VjsfFormDialog.vue'
import type { ConfirmDialogOptions } from '~/composables/useConfirmDialog'

export type BaseButtonAction = 'new' | 'create' | 'edit' | 'update' | 'destroy'
export type BaseButtonVariant = 'elevated' | 'flat' | 'tonal' | 'outlined' | 'text' | 'plain'

export interface BaseButtonProps {
  store?: object
  action?: BaseButtonAction
  storeAction?: string
  submitAction?: string
  params?: Record<string, unknown>
  dialogParams?: Record<string, unknown>
  noConfirmDialog?: boolean
  tooltipText?: string
  tooltipDisabled?: boolean
  tooltipLocation?: string
  btnText?: string
  btnIcon?: string
  btnVariant?: BaseButtonVariant
  variant?: BaseButtonVariant
  mode?: 'button' | 'text' | 'icon'
  icon?: string | boolean
  prependIcon?: string
  appendIcon?: string
  loading?: boolean
}

interface StoreActions {
  $id?: string
  loading?: boolean | Record<string, boolean | undefined>
  [key: string]: unknown
}

interface ActionPreset {
  btnText: string
  btnVariant: BaseButtonVariant
  tooltipText: string
  btnIcon: string
  confirm?: ConfirmDialogOptions
}

type BaseButtonEmit = {
  (event: 'click', value: unknown): void
  (event: 'success', value: unknown): void
  (event: 'error', value: unknown): void
}

const actionPresets: Record<BaseButtonAction, ActionPreset> = {
  new: { btnText: 'New', btnVariant: 'text', tooltipText: 'New', btnIcon: 'mdi-plus' },
  create: {
    btnText: 'Create', btnVariant: 'text', tooltipText: 'Create', btnIcon: 'mdi-plus',
    confirm: { title: 'Create item', message: 'Are you sure you want to create this item?' },
  },
  edit: { btnText: 'Edit', btnVariant: 'text', tooltipText: 'Edit', btnIcon: 'mdi-pencil' },
  update: {
    btnText: 'Update', btnVariant: 'text', tooltipText: 'Update', btnIcon: 'mdi-update',
    confirm: { title: 'Update item', message: 'Are you sure you want to update this item?' },
  },
  destroy: {
    btnText: 'Delete', btnVariant: 'text', tooltipText: 'Delete', btnIcon: 'mdi-trash-can',
    confirm: { title: 'Delete item', message: 'Are you sure you want to delete this item?', confirmColor: 'error' },
  },
}

export function useBaseButton(props: BaseButtonProps, emit: BaseButtonEmit) {
  const store = computed(() => props.store as StoreActions | undefined)
  const dialogs = useDialogService()
  const confirmDialog = useConfirmDialog()
  const preset = computed(() => props.action ? actionPresets[props.action] : undefined)
  const storeAction = computed(() => props.action && store.value
    ? props.storeAction || defaultStoreAction(props.action, store.value)
    : '')
  const mode = computed(() => props.mode || 'button')
  const btnText = computed(() => props.btnText ?? preset.value?.btnText ?? '')
  const btnVariant = computed(() => props.variant ?? props.btnVariant ?? preset.value?.btnVariant)
  const actionIcon = computed(() => props.btnIcon ?? preset.value?.btnIcon)
  const btnPrependIcon = computed(() => {
    if (mode.value === 'text') return undefined
    return props.prependIcon ?? actionIcon.value
  })
  const btnIcon = computed(() => mode.value === 'icon' ? props.icon ?? actionIcon.value : props.icon)
  const appendIcon = computed(() => props.appendIcon)
  const tooltipText = computed(() => props.tooltipText ?? preset.value?.tooltipText ?? '')
  const tooltipDisabled = computed(() => props.tooltipDisabled ?? false)
  const tooltipLocation = computed(() => props.tooltipLocation ?? 'top')
  const loading = computed(() => {
    if (props.loading) return true
    const loadingState = store.value?.loading
    if (typeof loadingState === 'boolean') return loadingState
    if (!loadingState || typeof loadingState !== 'object') return false
    const params = props.params ?? {}
    const key = [props.action, params.id, params.parent_id].filter(Boolean).join('_')
    return Boolean(loadingState[key])
  })

  async function handler(event?: unknown) {
    emit('click', event)
    if (!props.action) return
    if (!store.value) {
      emit('error', new Error('A Pinia store is required for this button action.'))
      return
    }

    try {
      let result: unknown
      if (props.action === 'new' || props.action === 'edit') {
        result = openFormDialog()
      } else {
        result = await runAction()
      }
      emit('success', result)
    } catch (cause) {
      emit('error', cause)
    }
  }

  function openFormDialog() {
    const activeStore = requireStore()
    const params = props.params ?? {}
    const loadForm = actionFor(storeAction.value)
    if (!loadForm) throw new Error(`The Pinia store does not define ${storeAction.value}().`)

    const edit = props.action === 'edit'
    const saveActionName = props.submitAction || (edit ? 'update' : 'create')
    const name = activeStore.$id?.replace(/s$/, '') || 'item'
    const title = edit ? `Edit ${name}` : `Create ${name}`
    const dialogProps = {
      title,
      loadKey: (params.id as string | number | null | undefined) ?? `new-${Date.now()}`,
      loadForm: () => props.storeAction ? loadForm(params) : edit ? loadForm(params.id) : loadForm(),
      saveForm: (model: Record<string, unknown>) => saveForm(saveActionName, params, model, !edit),
      ...props.dialogParams,
    }

    return dialogs.showDialog(VjsfFormDialog, dialogProps)
  }

  async function saveForm(actionName: string, params: Record<string, unknown>, model: Record<string, unknown>, isCreate: boolean) {
    const action = actionFor(actionName)
    if (!action) throw new Error(`The Pinia store does not define ${actionName}().`)
    if (props.submitAction) return action({ ...params, ...model })
    if (isCreate) return action({ ...params, ...model })
    return action(params.id, model)
  }

  async function runAction() {
    const params = props.params ?? {}
    const presetConfirm = props.action ? actionPresets[props.action].confirm : undefined
    if (presetConfirm && !props.noConfirmDialog) {
      const confirmed = await confirmDialog.confirm({ ...presetConfirm, ...props.dialogParams })
      if (!confirmed) return undefined
    }

    const action = actionFor(storeAction.value)
    if (!action) throw new Error(`The Pinia store does not define ${storeAction.value}().`)

    if (props.storeAction) return action(params)
    if (props.action === 'update') return action(params.id, params)
    if (props.action === 'destroy' && (storeAction.value === 'destroy' || storeAction.value === 'remove')) {
      return action(params.id ?? params)
    }
    return action(params)
  }

  function actionFor(name: string) {
    const action = requireStore()[name]
    return typeof action === 'function' ? action as (...args: unknown[]) => unknown : null
  }

  function requireStore() {
    if (!store.value) throw new Error('A Pinia store is required for this button action.')
    return store.value
  }

  return {
    btnText,
    btnVariant,
    btnPrependIcon,
    btnIcon,
    appendIcon,
    tooltipText,
    tooltipDisabled,
    tooltipLocation,
    loading,
    handler,
  }
}

function defaultStoreAction(action: BaseButtonAction, store: StoreActions) {
  if (action === 'new') return 'newForm'
  if (action === 'edit') return 'editForm'
  if (action === 'destroy' && typeof store.destroy !== 'function' && typeof store.remove === 'function') return 'remove'
  return action
}
