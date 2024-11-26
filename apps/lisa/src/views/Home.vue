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

          <DemandProcessor :demandUri="demandUri" :demandState="activeTab" @LoanType="loanTypeToHandle"/>

          <!-- loading state -->
          <template #fallback>
            <div>
              <DemandSkeleton></DemandSkeleton>
            </div>
          </template>
        </Suspense>
      </template>
      <card style="height:320px" v-if="isCardVisible && !isLoading">
        <template #content>
          <div class="content">
            <div v-if="activeTab === TAB_STATE.Demands">
              <h3> No Current Demands</h3>
              <p>There are no demands at the moment.</p>
              <p>Please check your Active Loans section for granted offers..</p>
            </div>
            <div v-if="activeTab === TAB_STATE.OfferAccepted">
              <h3>No Active Loans</h3>
              <p>There are no active loans at the moment.</p>
              <p>Please check your Terminated section for terminated loans.</p>
            </div>
            <div v-if="activeTab === TAB_STATE.Terminated">
              <h3>No terminated loans.</h3>
              <p>There are no terminated loans at the moment.</p>
            </div>
          </div>
        </template>
      </card>
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
import {useToast} from "primevue/usetoast";
import {useSolidProfile, useSolidSession} from "@shared/composables";
import {getDataRegistrationContainers, getResource, LDP, parseToN3} from "@shared/solid";
import {computed, ref, watch} from "vue";
import DemandProcessor from "../components/DemandProcessor.vue";
import {TabItemType, TabList} from "@shared/components";
import DemandSkeleton from "@/components/DemandSkeleton.vue";
import {TAB_STATE} from "@/enums/tabsState";


const toast = useToast();
const { session } = useSolidSession();

const shapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree';
const isLoading = ref(false);
const demandUris = ref<string[]>([]);

const { memberOf } = useSolidProfile()
const isLoggedIn = computed(() => {
  return ((session.webId && !memberOf.value) || (session.webId && memberOf.value && session.rdp) ? true : false)
});

let totalDemands = ref(0);
let totalActiveLoans = ref(0);
let totalTerminated = ref(0);

const isCardVisible = computed(() => {
  return (totalDemands.value ===0 && activeTab.value === TAB_STATE.Demands) || (totalActiveLoans.value ===0 && activeTab.value === TAB_STATE.OfferAccepted) || (totalTerminated.value ===0 && activeTab.value === TAB_STATE.Terminated);
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


function loanTypeToHandle(request: string) {
  if(request === TAB_STATE.Demands ){
    totalDemands.value = totalDemands.value +1;
  }
  else if(request === TAB_STATE.OfferAccepted ){
    totalActiveLoans.value = totalActiveLoans.value +1;
  }
  else if(request === TAB_STATE.Terminated ){
    totalTerminated.value = totalTerminated.value +1;
  }
}
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