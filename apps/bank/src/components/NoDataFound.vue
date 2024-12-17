<template>
<card style="height:320px" v-if="currentTab=== TAB_STATE.Demands && isDemandTabEmpty">
<template #content>
  <div class="content">
      <h3>No Current Demands</h3>
      <p>There are no demands at the moment.</p>
      <p>Please check your Active Loans section for granted offers..</p>
  </div>
</template>
</card>
<card style="height:320px" v-if="currentTab=== TAB_STATE.OfferAccepted && isActiveLoanTabEmpty">
<template #content>
  <div class="content">
      <h3>No Active Loans</h3>
      <p>There are no active loans at the moment.</p>
      <p>Please check your Terminated section for terminated loans.</p>
  </div>
</template>
</card>
<card style="height:320px" v-if="currentTab === TAB_STATE.Terminated && isTerminatedTabEmpty">
<template #content>
  <div class="content">
      <h3>No terminated loans.</h3>
      <p>There are no terminated loans at the moment.</p>
  </div>
</template>
</card>
</template>
<style scoped>
.content {
  display: flex;           /* establish flex container */
  flex-direction: column;  /* make main axis vertical */
  justify-content: center; /* center items vertically, in this case */
  align-items: center;     /* center items horizontally, in this case */
  height: 300px;
  text-align: center;
}
</style>
 <script setup lang="ts">
 import {TAB_STATE} from "@/enums/tabsState";
 import {isActiveLoanTabEmpty, isDemandTabEmpty, isTerminatedTabEmpty} from "@/utils/demands-data";
 import {ref, watch} from "vue";

 const props = defineProps<{ activeTab: string }>();
 const currentTab = ref(props.activeTab);
 watch(()=> props.activeTab,()=> {
   currentTab.value = props.activeTab;
 }, {immediate:true});
 </script>