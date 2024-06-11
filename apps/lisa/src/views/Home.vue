<template>
  <h1 class="header col-12 flex align-items-center gap-2">
    Credit Demands
    <Button v-if="sessionInfo.webId" icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
      @click="fetchDemandUris(sessionInfo.webId)" />
  </h1>
  <div style="height: 100px" id="header-bar-spacer" />
  <div class="grid">
    <ul class="col-12 flex flex-column gap-4">
      <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 2px" />
      <template v-for="(demandUri, index) in demandUris" :key="demandUri">
        <div class="w-full" v-if="index === 0"></div>
        <Suspense>
          <!-- main content -->
          <li>
            <DemandProcessor :demandUri="demandUri" />
          </li>
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
  <a class="github-fork-ribbon right-bottom fixed" href="https://github.com/DATEV-Research/Solid-B2B-showcase"
    data-ribbon="GitHub" title="GitHub">GitHub</a>
</template>

<style scoped>
.header {
  background: linear-gradient(90deg, #195B78 0%, #287F8F 100%);
  color: white;
  position: fixed;
  padding: 0.5rem 2.5rem 1rem 2.5rem;
  box-shadow: 0 0 10px -5px black;
  z-index: 1;

  .p-button {
    margin-left: 0.5rem;
    color: white;
    background-color: rgba(255, 255, 255, 0.05);

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>

<script setup lang="ts">
import { useToast } from "primevue/usetoast";
import { useSolidSession } from "@shared/composables";
import { getResource, LDP, parseToN3, getDataRegistrationContainers } from "@shared/solid";
import { ref, watch } from "vue";
import DemandProcessor from "../components/DemandProcessor.vue";

const toast = useToast();
const { authFetch, sessionInfo } = useSolidSession();

const shapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree';
const isLoading = ref(false);
const demandUris = ref<string[]>([]);

// refetch demandUris on login
watch(() => sessionInfo.isLoggedIn, (isLoggedIn) => isLoggedIn ? fetchDemandUris(sessionInfo.webId!) : {}, { immediate: true });

// discovers all containers including demands and add their contents (demands) to demandUris
async function fetchDemandUris(webId: string): Promise<void> {

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
      .then(resp => resp.data)
      .then(txt => parseToN3(txt, containerUri))
      .then(parsedN3 => parsedN3.store)

      .then(store => demandUris.value.push(...store.getObjects(containerUri, LDP("contains"), null).map((node) => node.value)))
    ))
    .finally(() => isLoading.value = false);
}
</script>