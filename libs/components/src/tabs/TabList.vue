<script setup lang="ts">
import TabItem from "./TabItem.vue";
import {TabItemType} from "./TabItemType";
import {ref, watch} from "vue";

const props = defineProps<{ model: TabItemType[], active?: string }>();
const emit = defineEmits<{
  (e: 'itemChange', itemId: string): void
}>();
const active = ref<string | null>(props.active ?? null);

watch(() => props.active, () => active.value = props.active);

function setActive(item: TabItemType): void {
  active.value = item.id;
  emit('itemChange', item.id);
}

</script>

<template>
  <div class="tab-list font-medium h-4rem font-normal flex align-items-end" role="list">
    <TabItem role="listitem" @click="setActive(item)" v-for="item in model" :key="item.id" :item="item" :active="item.id === active" />
  </div>
</template>

<style scoped>
[role=list] {
  font-family: var(--font-family);
}
[role=listitem] {
  &:first-child {
    border-top-left-radius: .4375rem;
  }
  &:last-child {
    border-top-right-radius: .4375rem;
  }
}
</style>
