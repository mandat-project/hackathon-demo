<template>
  <div class="grid">
    <h1 class="col-12 flex align-items-center gap-2">
      Credit demands
      <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only" @click="fetchDemandUris()" />
    </h1>
    <ul class="col-12 flex flex-column gap-4">
      <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 2px" />
      <template v-for="(demandUri, index) in demandUris" :key="demandUri">
        <hr class="w-full" v-if="index !== 0">
        <Suspense>
          <!-- main content -->
          <DemandProcessor :demandUri="demandUri" />
          <!-- loading state -->
          <template #fallback>
            <div>
              Loading demand ...
            </div>
          </template>
        </Suspense>
      </template>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useToast } from "primevue/usetoast";
import { useSolidSession } from "@shared/composables";
import { getResource, LDP, parseToN3, getDataRegistrationContainers } from "@shared/solid";
import { ref, watch } from "vue";
import DemandProcessor from "../components/DemandProcessor.vue";

const toast = useToast();
const { authFetch, sessionInfo } = useSolidSession();

const shapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree';
const webId = 'https://bank.solid.aifb.kit.edu/profile/card#me';
const isLoading = ref(false);
const demandUris = ref<string[]>([]);

// refetch demandUris on login
watch(() => sessionInfo.isLoggedIn, (isLoggedIn) => isLoggedIn ? fetchDemandUris() : {});
fetchDemandUris()

// discovers all containers including demands and add their contents (demands) to demandUris
async function fetchDemandUris(): Promise<void> {

  demandUris.value = [];
  isLoading.value = true;

  await getDataRegistrationContainers(webId, shapeTreeUri, authFetch.value)
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