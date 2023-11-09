<template>

  <div v-if="isLoggedIn" class="grid">
    <h1 class="col-12 flex align-items-center gap-2">
      Demands
      <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only" @click="fetchDemandUris()"/>
    </h1>
    <ul class="col-12 flex flex-column gap-4">
      <template v-for="(demandUri, index) in demandUris" :key="demandUri">
        <hr class="w-full" v-if="index !== 0">
        <DemandProcessor :demandUri="demandUri"/>
      </template>
    </ul>
  </div>
  <span v-else> 401 Unauthenticated : Login using the button in the top-right corner! </span>
</template>

<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {useSolidSession} from "@shared/composables";
import {getResource, LDP, parseToN3, getDataRegistrationContainers} from "@shared/solid";
import {ref, toRefs, watch} from "vue";
import DemandProcessor from "../components/DemandProcessor.vue";

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const {isLoggedIn} = toRefs(sessionInfo);

const shapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree';
const webId = 'https://bank.solid.aifb.kit.edu/profile/card#me';
const isLoading = ref(false);
const demandUris = ref<string[]>([]);

// refetch demandUris on login
watch(() => sessionInfo.isLoggedIn, (isLoggedIn) => isLoggedIn ? fetchDemandUris() : {});


// discovers all containers including demands and add their contents (demands) to demandUris
async function fetchDemandUris(): Promise<void> {

  demandUris.value = [];
  isLoading.value = true;

  getDataRegistrationContainers(webId, shapeTreeUri, authFetch.value)
      .then(containerUris => containerUris.forEach(containerUri => getResource(containerUri, authFetch.value)
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
          .then(txt => parseToN3(txt, containerUri))
          .then(parsedN3 => parsedN3.store)

          .then(store => demandUris.value.push(...store.getObjects(containerUri, LDP("contains"), null).map((node) => node.value)))
      ))
      .finally(() => isLoading.value = false);
}
</script>