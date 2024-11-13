<script setup lang="ts">
import { Store, Writer } from 'n3';
import { ref } from 'vue';

const props = defineProps({
  store: Store
})
const displayText = ref("")
const n3Writer = new Writer({
  // baseIRI: baseIRI,
  // prefixes: n3Prefixes,
});
if (props.store) {
  const quads = props.store.getQuads(null, null, null, null)
  quads.length = 10
  n3Writer.addQuads(quads)
  n3Writer.end((error, text) => (displayText.value = text));
}
</script>

<template>
  <div class="card bg-gray-50 border-round" style="background: rgba(232, 236, 239, 0.7); padding:0.5rem">
    <p style="font-size:14px; color:rgba(0, 0, 0, 0.7)">Annual Percentage rate in %</p>
    <p class="m-0">{{ displayText }} </p>
  </div>
  <div class="success-message border-round">
    <p>Looks good: Automatic processing returned positive!
      <span style="float:right">
        <svg width="22" height="24" viewBox="0 0 22 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M18.1295 3.5L21 5.39073L11.1813 20.5L3 12.5047L5.35257 10.0041L10.6334 15.0353L18.1295 3.5Z" fill="#00451D" fill-opacity="0.9"/>
<path d="M10.8153 16.5901L18.4194 4.88867L19.6197 5.67924L11.0074 18.9321L4.40039 12.4754L5.3911 11.4223L10.8153 16.5901Z" fill="#7AD200"/>
</svg>
      </span></p>
  </div>
</template>

<style scoped>
.success-message{
  padding:1rem;
  margin-top:1rem;
  border:2px solid rgba(32, 151, 12, 1);
  background-color:rgba(230, 252, 197, 1);
  color:black
}
</style>