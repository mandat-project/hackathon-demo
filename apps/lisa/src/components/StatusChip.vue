<template>
  <Chip v-if="chipStatus === STATES.Terminated" :label="chipStatus" class="text-color text-sm terminated" />
  <Chip v-else-if="chipStatus === STATES.DataNeeded" label="Data needed" class="text-0 text-sm ml-2 data-needed"/>
  <Chip v-else-if="chipStatus === STATES.PendingDataRequest" label="Pending Data Request" class=" text-color text-sm ml-2 pending-data-request"/>
  <Chip v-else-if="chipStatus === STATES.DataSuccessfullyProvided" label="Data successfully provided" class="text-color text-sm ml-2 data-successfully-provided"/>
  <Chip v-else-if="chipStatus === STATES.WaitingForResponse" label="Waiting for response" class=" text-color text-sm ml-2 waiting-for-response"/>
  <Chip v-else-if="chipStatus === STATES.OfferAccepted" label="Offer Accepted" class="text-sm ml-2 offer-accepted"/>
</template>
<script setup>
import {ref, watch} from "vue";
import {STATES} from "@/enums/states";

const props = defineProps({status: STATES});

const chipStatus = ref(props.status);
watch(()=> props.status,()=> {
  chipStatus.value = props.status;
}, {immediate:true});
</script>

<style scoped>
.offer-accepted{
  background-color:rgba(32, 151, 12, 1);
  color:white;
}
.waiting-for-response{
  background-color:rgba(255, 206, 163, 1)
}
.data-successfully-provided{
  background-color:rgba(255, 255, 255, 1)
}
.pending-data-request{
  background-color:rgba(255, 206, 163, 1);
}
.data-needed{
  background-color: rgba(222, 26, 6, 1);
}
.terminated{
  background-color:rgba(255, 255, 255, 1);
  border: 1px solid rgba(155, 178, 186, 1);
}
</style>