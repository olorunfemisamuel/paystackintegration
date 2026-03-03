<script setup lang="ts">
import { ref } from 'vue'
import PaystackButton from '../components/Pay-stackButton.vue'  // ✅ Fix 1: rename your actual file to match this casing exactly

const isSubscribed = ref(false)
const paymentRef = ref('')
const userEmail = ref('')

function handleSuccess(reference: string) {
  isSubscribed.value = true
  paymentRef.value = reference
  localStorage.setItem('subscriptionRef', reference)
  localStorage.setItem('isSubscribed', 'true')
}

function handleCancel() {
  console.log('Payment was cancelled')
}
</script>

<template>
  <main class="flex-grow flex flex-col justify-center items-center text-center px-6 py-12">

    <div v-if="isSubscribed" class="bg-green-100 border border-green-400 text-green-800 px-6 py-4 rounded-lg mb-6">
      <p class="font-semibold text-lg">🎉 You're now subscribed!</p>
      <p class="text-sm text-gray-600">Reference: {{ paymentRef }}</p>
    </div>

    <template v-else>
      <h2 class="text-4xl md:text-5xl font-bold text-blue-800 mb-4">
        Empower Your Ideas with <span class="text-green-500">Innovation</span>
      </h2>
      <p class="text-gray-700 max-w-2xl mb-8">
        Build, create, and grow your business with cutting-edge digital solutions.
      </p>

      <!-- ✅ Fix 2: email must be in quotes as a plain string, not bound with : -->
      <input
        v-model="userEmail"
        type="email"
        placeholder="Enter your email"
        class="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full max-w-sm"
      />

      <!-- ✅ Fix 3: use :email="userEmail" to bind the ref, not a raw email address -->
      <PaystackButton
        :email="userEmail"
        plan-code="PLN_wj20rxuvpwo1v7r"
        public-key="pk_test_1d269d5342ef028e3be2ff4d8a2325e67f06b549"
        @success="handleSuccess"
        @cancel="handleCancel"
      />
    </template>

  </main>
</template>
