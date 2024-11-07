<script setup lang="ts">
import {TabItemType} from "./TabItemType";

const props = defineProps<{ item: TabItemType; active: boolean; }>();
</script>

<template>
  <div class="tab cursor-pointer block" :class="{'active bg-white px-1 text-black': active, 'text-white h-3rem p-1': !active}">
    <div class="tab_content p-2 border-round">
      {{ item.label }}
    </div>
  </div>
</template>

<style scoped>
.active {
  border-radius: .25rem .25rem 0 0;
  height: 3.5rem;
  padding-top: .75rem;
}

.tab:not(.active), .tab:not(.active) .tab_content:hover {
  background-color: rgba(0, 0, 0, 0.2);
}
</style>
