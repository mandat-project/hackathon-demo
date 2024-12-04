<template>
  <TabList class="mt-2 pl-4 w-full" @item-change="tabListItemChange" :model="tabMenu" :active="activeTab" style="background-color: rgba(237, 240, 243, 1)" />

  <div class="grid px-1 sm:px-8" >
    <h1 v-if="activeTab === TAB_STATE.OfferAccepted">Active Loans <Button v-if="session.webId" icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
                                                                               @click="fetchDemandUris(memberOf)" /></h1>
    <h1 v-else >{{activeTab}} <Button v-if="session.webId" icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
                                          @click="fetchDemandUris(memberOf)" /></h1>

    <div class="col-12 flex flex-column gap-4" style="background-color:white">
      <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 2px" />
      <template v-for="(demandUri, index) in demandUris" :key="demandUri">
        <div class="w-full" v-if="index === 0"></div>
        <Suspense timeout="0">
          <!-- main content -->

          <DemandProcessor :demandUri="demandUri" :demandState="activeTab"/>

          <!-- loading state -->
          <template #fallback>
            <div>
              <DemandSkeleton></DemandSkeleton>
            </div>
          </template>
        </Suspense>
      </template>
      <NoDataFound :activeTab="activeTab" v-if="!isLoading"></NoDataFound>
    </div>
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
.tab:not(.active){
  background-color: #033B4A26;
}
</style>

<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {useSolidProfile, useSolidSession} from "@shared/composables";
import {getDataRegistrationContainers, getResource, LDP, parseToN3} from "@shared/solid";
import {computed, ref, watch} from "vue";
import DemandProcessor from "../components/DemandProcessor.vue";
import {TabItemType, TabList} from "@shared/components";
import DemandSkeleton from "@/components/DemandSkeleton.vue";
import {TAB_STATE} from "@/enums/tabsState";
import NoDataFound from "@/components/NoDataFound.vue";


const toast = useToast();
const { session } = useSolidSession();

const shapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree';
const isLoading = ref(false);
const demandUris = ref<string[]>([]);

const { memberOf } = useSolidProfile()
const isLoggedIn = computed(() => {
  return ((session.webId && !memberOf.value) || (session.webId && memberOf.value && session.rdp) ? true : false)
});

const tabMenu = ref<TabItemType[]>([
  { id: TAB_STATE.Demands, label: 'Demands' },
  { id: TAB_STATE.OfferAccepted, label: 'Active Loans' },
  { id: TAB_STATE.Terminated, label: 'Terminated' },
]);
let activeTab = ref(TAB_STATE.Demands);

function tabListItemChange(itemId: TAB_STATE) {
  activeTab.value = itemId;
}
// refetch demandUris on login
watch(() => isLoggedIn.value, (isLoggedIn) => isLoggedIn ? fetchDemandUris(((memberOf.value) ? memberOf.value : session.webId!)) : {}, { immediate: true });

// discovers all containers including demands and add their contents (demands) to demandUris
async function fetchDemandUris(webId: string): Promise<void> {

  demandUris.value = [];
  isLoading.value = true;

  await getDataRegistrationContainers(webId, shapeTreeUri, session)
      .then(containerUris => containerUris.forEach(containerUri => getResource(containerUri, session)
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