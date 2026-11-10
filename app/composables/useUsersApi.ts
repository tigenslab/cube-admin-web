export type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserCreateForm,
  UserEditForm,
} from '~/stores/users'

/** User API actions live in the Pinia store. */
export function useUsersApi() {
  return useUsersStore()
}
