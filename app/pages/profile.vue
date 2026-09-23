<script setup lang="ts">
const session = useSessionStore()
const email = ref(session.user?.email ?? '')
const phone = ref(session.user?.phone ?? '')
const firstName = ref('')
const lastName = ref('')
const profileSaving = ref(false)
const loading = ref(true)
const error = ref('')
const verificationCode = ref('')
const verificationSent = ref(false)
const phoneVerificationCode = ref('')
const phoneVerificationSent = ref(false)
const message = ref('')

interface ProfileUser {
  id?: string | number
  username?: string
  name?: string | null
  email?: string | null
  phone?: string | null
  first_name?: string | null
  last_name?: string | null
}

onMounted(async () => {
  try {
    const user = await useApi()<ProfileUser>('/sessions/user')
    session.user = user
    session.userUsername = user.username ?? ''
    email.value = user.email ?? ''
    phone.value = user.phone ?? ''
    firstName.value = user.first_name ?? ''
    lastName.value = user.last_name ?? ''
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Unable to load your profile.')
  } finally {
    loading.value = false
  }
})

async function requestEmailVerification() {
  message.value = ''
  verificationSent.value = false
  try {
    await useApi()('/sessions/user/email-verification', { method: 'POST', body: { email: email.value } })
    verificationSent.value = true
    message.value = 'A verification code was sent to your new email address.'
  } catch (error) {
    message.value = getApiErrorMessage(error, 'Unable to update your email address.')
  }
}

async function updateProfile() {
  message.value = ''
  profileSaving.value = true
  try {
    const user = await useApi()<ProfileUser>('/sessions/user', {
      method: 'PATCH',
      body: { first_name: firstName.value, last_name: lastName.value }
    })
    session.user = user
    message.value = 'Your profile has been updated.'
  } catch (cause) {
    message.value = getApiErrorMessage(cause, 'Unable to update your profile.')
  } finally {
    profileSaving.value = false
  }
}

async function verifyEmail() {
  try {
    await useApi()('/sessions/user/email-verification/confirm', {
      method: 'POST', body: { code: verificationCode.value }
    })
    message.value = 'Your email address has been updated.'
    verificationSent.value = false
  } catch (error) {
    message.value = getApiErrorMessage(error, 'The verification code is invalid.')
  }
}

async function requestPhoneVerification() {
  try {
    await useApi()('/sessions/user/phone-verification', { method: 'POST', body: { phone: phone.value } })
    phoneVerificationSent.value = true
    message.value = 'A verification code was sent to your phone number.'
  } catch (error) {
    message.value = getApiErrorMessage(error, 'Unable to update your phone number.')
  }
}

async function verifyPhone() {
  try {
    await useApi()('/sessions/user/phone-verification/confirm', { method: 'POST', body: { code: phoneVerificationCode.value } })
    phoneVerificationSent.value = false
    message.value = 'Your phone number has been verified.'
  } catch (error) {
    message.value = getApiErrorMessage(error, 'The verification code is invalid.')
  }
}
</script>

<template>
  <VContainer>
    <VBtn class="mb-6" prepend-icon="mdi-arrow-left" to="/" variant="text">Back to dashboard</VBtn>
    <h1 class="text-h4 font-weight-bold">My profile</h1>
    <p class="text-body-2 text-medium-emphasis mt-2">Manage your account details and security.</p>
    <VAlert v-if="error" class="mt-4" color="error" variant="tonal">{{ error }}</VAlert>

    <VRow class="mt-4" max-width="760">
      <VCol cols="12" md="6">
        <VCard class="pa-6" rounded="lg">
          <h2 class="text-h6">Account details</h2>
          <VProgressLinear v-if="loading" class="mt-5" color="primary" indeterminate />
          <template v-else>
            <VTextField :model-value="[firstName, lastName].filter(Boolean).join(' ') || session.userUsername" class="mt-5" label="Name" readonly variant="outlined" />
            <VTextField v-model="firstName" label="First name" variant="outlined" />
            <VTextField v-model="lastName" class="mt-4" label="Last name" variant="outlined" />
            <VBtn class="mt-2" color="primary" :loading="profileSaving" @click="updateProfile">Save profile</VBtn>
            <VTextField v-model="email" label="Email" type="email" variant="outlined" />
            <VTextField v-model="phone" class="mt-4" label="Phone" type="tel" variant="outlined" />
          </template>
          <VBtn class="mt-2" color="primary" @click="requestEmailVerification">Update email</VBtn>
          <VBtn class="mt-2 ml-2" color="primary" @click="requestPhoneVerification">Update phone</VBtn>
          <VAlert v-if="message" class="mt-4" density="compact" variant="tonal">{{ message }}</VAlert>
          <div v-if="verificationSent" class="mt-4">
            <VTextField v-model="verificationCode" label="Email verification code" placeholder="Enter verification code" variant="outlined" />
            <VBtn class="mt-2" @click="verifyEmail">Verify email</VBtn>
          </div>
          <div v-if="phoneVerificationSent" class="mt-4">
            <VTextField v-model="phoneVerificationCode" label="Phone verification code" placeholder="Enter verification code" variant="outlined" />
            <VBtn class="mt-2" @click="verifyPhone">Verify phone</VBtn>
          </div>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard class="pa-6" rounded="lg">
          <h2 class="text-h6">Security</h2>
          <p class="text-body-2 text-medium-emphasis mt-3">Keep your account secure with a strong password.</p>
          <VBtn class="mt-3" color="primary" to="/sessions/change_password">Change password</VBtn>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
