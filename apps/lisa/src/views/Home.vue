<template>

  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">

      <div class="p-inputgroup">
        <InputText
            placeholder="URI of the banks' credit-demands."
            v-model="uri"
            @keyup.enter="fetchDemandUris()"/>

        <Button @click="fetchDemandUris()"> GET</Button>
      </div>

      <ProgressBar v-if="isLoading" mode="indeterminate" class="progressbar"/>

    </div>
  </div>

  <div class="grid">
    <h3 class="col-12">Demands</h3>
    <ul class="col-12 flex flex-column gap-4">
      <DemandProcessor :uri="demandUri" v-for="demandUri in demandUris" :key="demandUri"/>
    </ul>
  </div>

</template>

<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {useSolidSession} from "@shared/composables";
import {getResource, LDP, parseToN3} from "@shared/solid";
import {Ref, ref, watch} from "vue";
import DemandProcessor from "../components/DemandProcessor.vue";

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();

const uri = ref("https://bank.solid.aifb.kit.edu/credits/demands/");
const isLoading = ref(false);
const demandUris: Ref<Array<string>> = ref([]);

// refetch demandUris on login
watch(() => sessionInfo.isLoggedIn, (isLoggedIn) => isLoggedIn ? fetchDemandUris() : {});

function fetchDemandUris(): Promise<string[]> {
  isLoading.value = true;
  return getResource(uri.value, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetch!",
          detail: err,
          life: 5000,
        });
        isLoading.value = false;
        throw new Error(err);
      })
      .then(resp => resp.text())
      .then(txt => parseToN3(txt, uri.value))
      .then(parsedN3 => parsedN3.store)
      .then(store => demandUris.value = store.getObjects(uri.value, LDP("contains"), null).map((node) => node.value))
      .finally(() => isLoading.value = false);
}
</script>

<style scoped>
.progressbar {
  height: 2px;
  border-radius: 0 0 3px 3px;
  transform: translateY(-2px);
}
</style>