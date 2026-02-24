<script setup>
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
</script>

<template>
  <NavBar />
  <main class="container mt-4">
    <RouterView />
  </main>
</template>

<style>
@import 'bootstrap/dist/css/bootstrap.css';
</style>
