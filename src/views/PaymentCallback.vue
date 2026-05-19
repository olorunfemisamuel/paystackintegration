<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const status = ref<'loading' | 'success' | 'failed'>('loading')
const message = ref('')
const txRef = ref('')

onMounted(async () => {
  const transaction_id = route.query.transaction_id as string
  const tx_ref = route.query.tx_ref as string
  const flw_status = route.query.status as string

  txRef.value = tx_ref

  // If Flutterwave already says cancelled, don't bother verifying
  if (flw_status === 'cancelled') {
    status.value = 'failed'
    message.value = 'Payment was cancelled.'
    return
  }

  if (!transaction_id && !tx_ref) {
    status.value = 'failed'
    message.value = 'No transaction reference found.'
    return
  }

  try {
    // Use transaction_id if available, fall back to tx_ref
    const endpoint = transaction_id
      ? `http://localhost:3001/api/payment/verify/id/${transaction_id}`
      : `http://localhost:3001/api/payment/verify/${tx_ref}`

    const res = await fetch(endpoint)
    const data = await res.json()

    if (data.verified) {
      status.value = 'success'
      message.value = `Payment successful! Reference: ${tx_ref}`
      localStorage.setItem('isSubscribed', 'true')
      localStorage.setItem('subscriptionRef', tx_ref)
    } else {
      status.value = 'failed'
      message.value = `Payment not confirmed. Status: ${data.status ?? 'unknown'}`
    }
  } catch {
    status.value = 'failed'
    message.value = 'Could not verify payment. Please contact support.'
  }
})
</script>

<template>
  <main class="flex flex-col items-center justify-center min-h-screen text-center px-6">

    <div v-if="status === 'loading'" class="text-gray-600 text-lg animate-pulse">
      Verifying your payment...
    </div>

    <div
      v-else-if="status === 'success'"
      class="bg-green-100 border border-green-400 text-green-800 px-8 py-6 rounded-lg max-w-sm w-full"
    >
      <p class="text-2xl font-bold mb-2">🎉 Payment Successful!</p>
      <p class="text-sm">{{ message }}</p>
      <button
        class="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg"
        @click="router.push('/')"
      >
        Go Home
      </button>
    </div>

    <div
      v-else
      class="bg-red-100 border border-red-400 text-red-800 px-8 py-6 rounded-lg max-w-sm w-full"
    >
      <p class="text-2xl font-bold mb-2">❌ Payment Failed</p>
      <p class="text-sm">{{ message }}</p>
      <button
        class="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg"
        @click="router.push('/')"
      >
        Try Again
      </button>
    </div>

  </main>
</template>