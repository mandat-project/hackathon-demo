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
  <div class="card" style="background: #DCDCDC">
    <Panel header="Business Data" toggleable>
      <p class="m-0">
        {{ displayText }}
      </p>
      <template #footer>
        <Message severity="success" :closable="false">Looks good: Automatic processing returned positive!</Message>
      </template>
    </Panel>
  </div>
</template>

<style scoped>
.p-message {
  background: linear-gradient(90deg, #195B78 0%, #287F8F 100%);
  
}
</style>