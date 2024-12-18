<script setup lang="ts">
import {Store, Writer} from 'n3';
import {onMounted, ref} from 'vue';
import hljs from "highlight.js/lib/core";
import hljsDefineTurtle from '../assets/highlightjs-turtle/turtle.js';
import 'highlight.js/styles/stackoverflow-light.css';

hljs.registerLanguage('turtle', hljsDefineTurtle);

onMounted(() => {
  hljs.highlightBlock(document.querySelector('.turtle'));
});

const props = defineProps({
  store: Store
})
const displayText = ref("")
const n3Writer = new Writer({
  // baseIRI: baseIRI,
  // prefixes: n3Prefixes,
});
const checkIcon = require('@/assets/check.svg');
if (props.store) {
  const quads = props.store.getQuads(null, null, null, null)
  quads.length = 10
  n3Writer.addQuads(quads)
  n3Writer.end((error, text) => (displayText.value = text));
}
</script>

<template>
  <div class="p-1">
    <pre><code ref="codeBlock" class="turtle border-round bg-gray-50">{{ displayText }}</code></pre>
  </div>
  <div class="success-message border-round">
    <p>Looks good: Automatic processing returned positive!
      <span style="float:right">
        <img :src="checkIcon" alt="check"/>
      </span>
    </p>
  </div>
</template>

<style scoped>
.success-message{
  padding:0 1rem 0 1rem;
  margin-top:1rem;
  border:2px solid rgba(32, 151, 12, 1);
  background-color:rgba(230, 252, 197, 1);
  color:black
}
</style>