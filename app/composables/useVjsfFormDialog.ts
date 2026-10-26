import VjsfFormDialog from '~/components/forms/VjsfFormDialog.vue'
import type { ApiFormSchema } from '~/types/api-form'

interface VjsfFormDialogOptions {
  title: string
  loadKey?: string | number
  loadForm: () => Promise<{ vjsf: { schema: ApiFormSchema; model: any } }>
  saveForm: (model: any) => Promise<unknown>
}

export function useVjsfFormDialog() {
  const dialogs = useDialogService()

  function showDialog(options: VjsfFormDialogOptions) {
    return new Promise<unknown | undefined>((resolve) => {
      let id = ''
      id = dialogs.showDialog(VjsfFormDialog, {
        ...options,
        onSaved: (result: unknown) => dialogs.closeDialog(id, result),
      }, resolve)
    })
  }

  return { showDialog }
}
