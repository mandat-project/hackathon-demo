<template>
  <Home/>
  <Toast position="bottom-right" :breakpoints="{ '420px': { width: '100%', right: '0', left: '0' } }" />

</template>

<script lang="ts">
import {Options, Vue} from 'vue-class-component'
import Home from './components/Home.vue'
import Toast from "primevue/toast";

@Options({
  components: {
    Home,
    Toast
  }
})
export default class App extends Vue {}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
