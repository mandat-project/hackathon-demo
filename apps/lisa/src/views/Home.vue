<template>

  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">

      <div class="p-inputgroup">
        <InputText placeholder="URI of the banks' credit-demands."
                   v-model="uri"
                   @keyup.enter="fetch"/>
        <Button @click="fetch"> GET</Button>
      </div>

      <ProgressBar v-if="isLoading" mode="indeterminate" class="progressbar"/>

    </div>
  </div>

  <div class="demands">
    <span>
      <h3> Demands </h3>
      <ol>
        <DemandProcessor :uri="demandURI" v-for="demandURI in demands" :key="demandURI"/>
      </ol>
      <div v-if="demandsAvailable">No demands available.</div>
    </span>
  </div>

</template>

<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {useSolidSession} from "@shared/composables";
import {getResource, LDP, parseToN3} from "@shared/solid";
import {ref} from "vue";
import DemandProcessor from "../components/DemandProcessor.vue";


const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const isLoading = ref(false);
const demandsAvailable = ref(false);

// uri of the information resource
const uri = ref("https://bank.solid.aifb.kit.edu/credits/demands/");

// get content of information resource
let demands = ref()
const fetch = async () => {
  isLoading.value = true;
  await getResource(uri.value, authFetch.value)
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
      .then((resp) => resp.text()).then((txt) => {
        return parseToN3(txt, uri.value)
      }).then((parsedN3) => {
        return parsedN3.store;
      }).then((store) => {
        demands.value = store.getObjects(uri.value, LDP("contains"), null).map((node) => node.value);
      })
      .finally(() => {
        isLoading.value = false;
      })
};
</script>

<style scoped>
.grid {
  margin: 5px;
}

.p-inputgroup {
  padding-bottom: 0px;
}

.progressbar {
  height: 2px;
  border-radius: 0 0 3px 3px;
  transform: translateY(-2px);
}

.demands ol li {
  margin-bottom: 1em;
}
</style>