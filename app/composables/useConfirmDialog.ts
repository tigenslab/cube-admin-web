import ConfirmDialog from '~/components/ConfirmDialog.vue'

export interface ConfirmDialogOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmColor?: string
}

export function useConfirmDialog() {
  const dialogs = useDialogService()

  function confirm(options: ConfirmDialogOptions) {
    return new Promise<boolean>((resolve) => {
      let id = ''
      id = dialogs.showDialog(ConfirmDialog, {
        ...options,
        onConfirm: () => dialogs.closeDialog(id, true),
      }, (result) => resolve(result === true))
    })
  }

  return { confirm }
}
