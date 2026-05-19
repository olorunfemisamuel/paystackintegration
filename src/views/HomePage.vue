<script setup lang="ts">
import { ref } from 'vue'
import PaystackButton from '../components/Pay-stackButton.vue'

const isSubscribed = ref(false)
const paymentRef = ref('')
const userEmail = ref('')
const selectedGateway = ref<'paystack' | 'flutterwave' | 'bank_transfer'>('paystack')
const isLoading = ref(false)
const isVerifying = ref(false)
const verifyFailed = ref(false)

const currencies = ['NGN', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'BRL', 'MXN', 'INR']
const selectedCurrency = ref('NGN')

const transferDetails = ref<{
  account_number: string
  bank_name: string
  amount: number
  expiry: string
  tx_ref: string   // ✅ added so we can verify later
} | null>(null)

function handlePaystackSuccess(reference: string) {
  isSubscribed.value = true
  paymentRef.value = reference
  localStorage.setItem('subscriptionRef', reference)
  localStorage.setItem('isSubscribed', 'true')
}

function handlePaystackCancel() {
  console.log('Paystack payment was cancelled')
}

async function payWithFlutterwave() {
  if (!userEmail.value) {
    alert('Please enter your email first.')
    return
  }

  isLoading.value = true

  try {
    const res = await fetch('http://localhost:3001/api/payment/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail.value,
        amount: 5000,
        currency: selectedCurrency.value,
        redirect_url: `${window.location.origin}/payment-callback`,
      }),
    })

    const data = await res.json()

    if (data?.data?.link) {
      window.location.href = data.data.link
    } else {
      console.error('[FLW] Backend response:', JSON.stringify(data, null, 2))
      const msg = data?.error ?? data?.message ?? 'Unknown error'
      const details = data?.details ? JSON.stringify(data.details) : ''
      alert(`Could not initiate payment.\n\nReason: ${msg}\n${details}`)
    }
  } catch (err) {
    console.error('Payment error:', err)
    alert('Something went wrong.')
  } finally {
    isLoading.value = false
  }
}

async function payWithBankTransfer() {
  if (!userEmail.value) {
    alert('Please enter your email first.')
    return
  }

  isLoading.value = true

  try {
    const res = await fetch('http://localhost:3001/api/payment/bank-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail.value,
        amount: 5000,
      }),
    })

    const data = await res.json()
    console.log('[Bank Transfer] Response:', JSON.stringify(data, null, 2))
    console.log('[Bank Transfer] data.data:', JSON.stringify(data.data, null, 2))
    console.log('[Bank Transfer] data.meta:', JSON.stringify(data.meta, null, 2))

    const auth = data?.meta?.authorization

    if (auth?.transfer_account) {
      transferDetails.value = {
        account_number: auth.transfer_account,
        bank_name: auth.transfer_bank,
        amount: parseFloat(auth.transfer_amount),
        expiry: auth.account_expiration,
        tx_ref: data.tx_ref,
      }
      verifyFailed.value = false
    } else {
      alert(`Could not generate account.\n\n${data?.error ?? JSON.stringify(data)}`)
    }
  } catch (err) {
    console.error('Bank transfer error:', err)
    alert('Something went wrong.')
  } finally {
    isLoading.value = false
  }
}

// ── Poll backend until payment is confirmed ───────────────────────────────────
async function confirmTransfer() {
  if (!transferDetails.value?.tx_ref) return

  isVerifying.value = true
  verifyFailed.value = false

  const tx_ref = transferDetails.value.tx_ref

  // ── Attempt to simulate the transfer in test mode (best-effort) ─────────
  // NOTE: Flutterwave does not expose a public API to simulate incoming bank
  // transfers. Use the Flutterwave test dashboard → "Simulate" to trigger
  // a payment, then click "I've sent the transfer" here to poll for it.
  try {
    const simRes = await fetch('http://localhost:3001/api/payment/simulate-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_ref, amount: transferDetails.value.amount }),
    })
    const simData = await simRes.json()
    if (simData.warning) {
      console.warn('[Simulate] Best-effort warning:', simData.warning)
    } else {
      console.log('[Simulate] Response:', simData)
    }
  } catch (err) {
    console.warn('[Simulate] Network error (non-blocking):', err)
  }

  // ── Wait 3 s for Flutterwave to process ─────────────────────────────────
  await new Promise(resolve => setTimeout(resolve, 3000))

  // ── Poll to verify ──────────────────────────────────────────────────────
  const MAX_ATTEMPTS = 10
  const INTERVAL_MS = 5000

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[Verify] Attempt ${attempt}/${MAX_ATTEMPTS} for ${tx_ref}`)

    try {
      const res = await fetch(`http://localhost:3001/api/payment/verify/${encodeURIComponent(tx_ref)}`)

      if (!res.ok) {
        console.error(`[Verify] Unexpected HTTP ${res.status} from backend`)
        break
      }

      const data = await res.json()
      console.log(`[Verify] Status from FLW: ${data.status ?? (data.verified ? 'successful' : 'pending')}`)

      if (data.verified) {
        isSubscribed.value = true
        paymentRef.value = tx_ref
        transferDetails.value = null
        localStorage.setItem('isSubscribed', 'true')
        localStorage.setItem('subscriptionRef', tx_ref)
        isVerifying.value = false
        return
      }

      // data.verified === false is expected while the transfer hasn't arrived yet
      // Keep polling — no action needed for pending/not_found status
    } catch (err) {
      console.error('[Verify] Network error:', err)
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS))
    }
  }

  isVerifying.value = false
  verifyFailed.value = true
}
</script>

<template>
  <main class="flex-grow flex flex-col justify-center items-center text-center px-6 py-12">

    <!-- Success state -->
    <div
      v-if="isSubscribed"
      class="bg-green-100 border border-green-400 text-green-800 px-6 py-4 rounded-lg mb-6"
    >
      <p class="font-semibold text-lg">🎉 You're now subscribed!</p>
      <p class="text-sm text-gray-600">Reference: {{ paymentRef }}</p>
    </div>

    <!-- Bank transfer details card -->
    <div
      v-else-if="transferDetails"
      class="bg-blue-50 border border-blue-300 text-blue-900 px-8 py-6 rounded-xl max-w-sm w-full text-left"
    >
      <p class="font-bold text-lg mb-4 text-center">🏦 Transfer Details</p>

      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Bank</span>
          <span class="font-semibold">{{ transferDetails.bank_name }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Account No.</span>
          <span class="font-mono font-bold tracking-widest text-lg">{{ transferDetails.account_number }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Amount</span>
          <span class="font-semibold">₦{{ transferDetails.amount.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Expires</span>
          <span class="font-semibold text-red-500 text-xs">{{ transferDetails.expiry }}</span>
        </div>
      </div>

      <p class="text-xs text-gray-500 mt-4 text-center">
        Transfer the exact amount to confirm your subscription.
      </p>

      <!-- ✅ Confirm button -->
      <button
        :disabled="isVerifying"
        class="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
        @click="confirmTransfer"
      >
        <span v-if="isVerifying" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        {{ isVerifying ? 'Checking payment...' : "I've sent the transfer" }}
      </button>

      <!-- Not yet confirmed message -->
      <div v-if="verifyFailed" class="mt-3 text-xs text-red-500 text-center">
        Payment not confirmed yet. If you've already transferred, wait a moment and try again.
        <button class="underline ml-1" @click="confirmTransfer">Retry</button>
      </div>

      <button
        class="mt-3 w-full text-xs text-blue-600 underline"
        @click="transferDetails = null; verifyFailed = false"
      >
        Cancel / Start over
      </button>
    </div>

    <template v-else>
      <h2 class="text-4xl md:text-5xl font-bold text-blue-800 mb-4">
        Empower Your Ideas with <span class="text-green-500">Innovation</span>
      </h2>
      <p class="text-gray-700 max-w-2xl mb-8">
        Build, create, and grow your business with cutting-edge digital solutions.
      </p>

      <input
        v-model="userEmail"
        type="email"
        placeholder="Enter your email"
        class="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full max-w-sm"
      />

      <select
        v-if="selectedGateway === 'flutterwave'"
        v-model="selectedCurrency"
        class="border border-gray-300 rounded-lg px-4 py-2 mb-6 w-full max-w-sm text-sm text-gray-700"
      >
        <option v-for="currency in currencies" :key="currency" :value="currency">
          {{ currency }}
        </option>
      </select>

      <div class="flex flex-wrap gap-3 mb-6 justify-center">
        <button
          :class="[
            'px-5 py-2 rounded-full border text-sm font-medium transition',
            selectedGateway === 'paystack'
              ? 'bg-blue-700 text-white border-blue-700'
              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
          ]"
          @click="selectedGateway = 'paystack'"
        >
          Pay with Paystack
        </button>
        <button
          :class="[
            'px-5 py-2 rounded-full border text-sm font-medium transition',
            selectedGateway === 'flutterwave'
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'
          ]"
          @click="selectedGateway = 'flutterwave'"
        >
          Pay with Flutterwave
        </button>
        <button
          :class="[
            'px-5 py-2 rounded-full border text-sm font-medium transition',
            selectedGateway === 'bank_transfer'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
          ]"
          @click="selectedGateway = 'bank_transfer'"
        >
          Pay via Bank Transfer
        </button>
      </div>

      <PaystackButton
        v-if="selectedGateway === 'paystack'"
        :email="userEmail"
        plan-code="PLN_wj20rxuvpwo1v7r"
        public-key="pk_test_1d269d5342ef028e3be2ff4d8a2325e67f06b549"
        @success="handlePaystackSuccess"
        @cancel="handlePaystackCancel"
      />

      <button
        v-else-if="selectedGateway === 'flutterwave'"
        :disabled="isLoading"
        class="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg transition"
        @click="payWithFlutterwave"
      >
        {{ isLoading ? 'Redirecting...' : `Subscribe with Flutterwave (${selectedCurrency})` }}
      </button>

      <button
        v-else
        :disabled="isLoading"
        class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg transition"
        @click="payWithBankTransfer"
      >
        {{ isLoading ? 'Generating account...' : 'Pay via Bank Transfer (NGN 5,000)' }}
      </button>

    </template>

  </main>
</template>
