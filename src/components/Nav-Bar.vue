<script setup lang="ts">
// defineProps<{
//   msg: string
// }>()
</script>

<template>

  <div class="min-h-60svh bg-blue-50 text-gray-900 flex flex-col">
    <!-- 🌊 Navbar -->
    <header class="bg-blue-600 text-white shadow-md">
      <nav class="container mx-auto flex items-center justify-between py-4 px-6">
        <h1 class="text-2xl font-bold text-white">
          <span class="text-green-400">My</span>Brand
        </h1>

        <!-- Desktop Links -->
        <ul class="hidden md:flex space-x-8 text-white">
          <li><a href="#home" class="hover:text-green-300 transition">Home</a></li>
          <li><a href="#features" class="hover:text-green-300 transition">Features</a></li>
          <li><a href="#about" class="hover:text-green-300 transition">About</a></li>
          <li><a href="#contact" class="hover:text-green-300 transition">Contact</a></li>
        </ul>

        <!-- Mobile Menu Button -->
        <!-- <button @click="toggleMenu" class="md:hidden text-white focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button> -->
      </nav>
    </header>
  </div>




 <!-- <div class="greetings">
    <h1 class="green">{{ msg }}</h1>
    <h3>
      You’ve successfully created a project with
      <a href="https://vite.dev/" target="_blank" rel="noopener">Vite</a> +
      <a href="https://vuejs.org/" target="_blank" rel="noopener">Vue 3</a>. What's next?
    </h3>
  </div> -->
</template>

<style scoped>

</style>
