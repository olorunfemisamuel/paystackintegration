<script setup lang="ts">

// ✅ Replace `any` with a proper type interface
interface PaystackHandler {
  openIframe: () => void
}

interface PaystackOptions {
  key: string
  email: string
  plan: string
  currency: string
  callback: (response: { reference: string }) => void
  onClose: () => void
}

interface PaystackPopInterface {
  setup: (options: PaystackOptions) => PaystackHandler
}

declare global {
  interface Window { PaystackPop: PaystackPopInterface }  // ✅ No more `any`
}

const props = defineProps<{
  email: string
  planCode: string
  publicKey: string
}>()

const emit = defineEmits<{
  success: [reference: string]
  cancel: []
}>()

function payWithPaystack() {
  const handler = window.PaystackPop.setup({
    key: props.publicKey,
    email: props.email,
    plan: props.planCode,
    currency: 'NGN',
    callback: (response: { reference: string }) => {
      emit('success', response.reference)
    },
    onClose: () => {
      emit('cancel')
    }
  })
  handler.openIframe()
}
</script>

<template>
  <button
    @click="payWithPaystack"
    class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition"
  >
    Subscribe Now
  </button>
</template>
