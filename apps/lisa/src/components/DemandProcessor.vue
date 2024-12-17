<template>
  <div v-show="tabState === currentDemandState" v-if="currentState!== STATES.NoOperation" class="pb-4">
    <Card :data-demand-id="demandUri">
      <template #content>
        <div class="card-container">
        <div class="grid">
          <div class="col-12" v-if ="currentState === STATES.Terminated" >
            <StatusChip :status="STATES.Terminated"></StatusChip>
          </div>
          <div class="col-6">
            <span>Applicant</span>
            <h2>{{demanderName}}</h2>
          </div>
          <div class="col-6">
            <span>Amount</span>
            <h2>{{ amount }} - {{ currency }}</h2>
          </div>
        </div>
        <div class="border-round-2xl p-2" style="background-color:rgba(246, 247, 249, 1);">
          <div class=" grid gap-3 ml-2 py-2" v-if="currentState === STATES.DataNeeded">
            <StatusChip :status="STATES.DataNeeded"></StatusChip>
            <div class="w-full ml-2">
              <p class="font-medium" >Business Assessment data</p>
            </div>

              <div class="dropdown relative w-full ml-2">
                  <label class="z-1 pt-2.5 pl-2 text-sm text-black-alpha-70 absolute w-full">Select data</label>
                  <Dropdown class="w-full h-3.75rem pt-4 mt-1 mb-2 control-shadow" v-model="selectedShapeTree" :options="shapeTrees" option-label="label" />
              </div>
              <Button class="step-button" v-bind:disabled="accessRequestUri !== undefined || isOfferCreated"
                      @click="requestAccessToData()">Request Data</Button>
          </div>
          <div v-else-if="currentState === STATES.PendingDataRequest || currentState === STATES.DataSuccessfullyProvided" class="gap-2 ml-2 py-2">
            <StatusChip :status="currentState"></StatusChip>
            <div class="ml-2">
              <h5>Business Assessemnent data</h5>
              <p class="text-xs pb-2">Requested Data</p>
              <p class="pb-4 text-sm font-medium">{{selectedShapeTree.label}}</p>
            </div>
            <Button class="step-button"
                    v-bind:disabled="isDialogShowDataBtnDisabled"
                    @click="processDataDialogBox()">Show Data</Button>
          </div>
          <div v-else-if="currentState === STATES.WaitingForResponse || currentState === STATES.OfferAccepted || currentState === STATES.Terminated" class=" gap-2 ml-2 py-2">
            <StatusChip :status="currentState" v-if="currentState !== STATES.Terminated"></StatusChip>
            <div class="ml-2">
              <h5>Business assessment data</h5>
              <p class="text-xs pb-2">Requested Data:</p>
              <p class="pb-4 text-sm font-medium">{{selectedShapeTree.label}}</p>
            </div>
            <Button class="step-button"
                    v-bind:disabled="!isAccessRequestGranted || isAccessRequestGranted === 'false'"
                    @click="processDataDialogBox()" severity="secondary">Show Data</Button>
          </div>
        </div>
        <div class="grid pt-2 pb-2">
          <div class="col-6 pl-0">
            <DacklTextInput type="number" :disabled="!(currentState === STATES.DataSuccessfullyProvided)" :maxFractionDigits="2" class="w-full md:w-auto mt-2" label="Annual Percentage rate in %" v-model="enteredAnnualPercentageRate"/>
          </div>
          <div class="col-6">
            <div class="dropdown relative w-full ml-2">
              <label class="z-1 pt-2.5 pl-2 text-sm text-black-alpha-70 absolute w-full" for="currencyDropdown">Loan terms</label>
              <Dropdown :disabled="!(currentState === STATES.DataSuccessfullyProvided)"  class="w-full h-3.75rem pt-4 mt-1 mb-2 control-shadow" id="loanTermDropDown" v-model="selectedLoanTerm" :options="loanTerms" option-label="label" />
            </div>
          </div>
        </div>
        <Button v-if="isTerminateBtnVisible" severity="danger"
                class="step-button text-0" @click="SetTerminationFlagInOrder(offersForDemand)">Terminate business relation
        </Button>
        <Button v-else-if="currentState !== STATES.Terminated" class="step-button" :disabled="isCreateOfferBtnDisabled"
                @click="createOfferResource(props.demandUri, accessRequestUri!)">Create Offer and grant Access</Button>
        </div>
      </template>
    </Card>
  </div>


  <Dialog v-model:visible="isDialogVisible" modal header="Requested business assessment data" :style="{ width: '55rem' }">
    <div v-if="!businessDataFetched">
      <Skeleton width="100%" height="300px" ></Skeleton>
      <Skeleton width="100%" height="50px" class="mb-5 mt-2"></Skeleton>
    </div>
    <BusinessData v-if="businessDataFetched" :store="state.businessAssessmentStore" />
    <div class="py-4" v-if="businessDataFetched">
      <div class="flex justify-content-end gap-2" v-if="isDialogCloseBtnVisible">
        <Button type="button" label="Close" severity="secondary" @click="isDialogVisible = false"></Button>
      </div>
      <div v-else class="flex justify-content-end gap-2">
        <Button type="button" label="Accept provided Data" @click="isDialogVisible = false"></Button>
        <Button type="button" label="Request New Data" severity="secondary"
                v-bind:disabled="isDialogRequestNewDataBtnDisabled"
                @click="requestCreationOfData()">Request New Data</Button>
        <Button type="button" label="Cancel" severity="secondary" @click="isDialogVisible = false"></Button>
      </div>
    </div>
  </Dialog>
  <LoadingDialog :isVisible="isLoadingDialogVisible"></LoadingDialog>
</template>

<script setup lang="ts">
import BusinessData from "@/components/BusinessDataPanel.vue";
import StatusChip from "@/components/StatusChip.vue";
import {
  businessAssessmentTree,
  documentCreationDemandShapeTreeUri,
  offerShapeTreeUri,
  orderShapeTreeUri
} from "@/constatns/solid-urls";
import {STATES} from "@/enums/states";
import {TAB_STATE} from "@/enums/tabsState";

import {storeDemands} from "@/utils/demands-data";
import {
  getAccessBeingSetBody,
  getCreateOfferResourceBody,
  getDataBody,
  getDocumentCreationDemandBody
} from "@/utils/request-access";
import {DacklTextInput, LoadingDialog} from "@datev-research/mandat-shared-components";
import {useCache, useSolidProfile, useSolidSession} from "@datev-research/mandat-shared-composables";
import {
  createResourceInAnyRegistrationOfShape,
  getDataRegistrationContainers
} from "@datev-research/mandat-shared-solid-interop";
import {
  createResource,
  CREDIT,
  FOAF,
  getContainerItems,
  getLocationHeader,
  getResource,
  INTEROP,
  parseToN3,
  putResource,
  SCHEMA,
  VCARD,
  XSD
} from "@datev-research/mandat-shared-solid-requests";
import {AxiosResponse} from 'axios';
import {Literal, NamedNode, Store, Writer} from 'n3';
import Card from "primevue/card";
import {useToast} from 'primevue/usetoast';
import {computed, reactive, Ref, ref, watch} from 'vue';

const props = defineProps<{ demandUri: string, demandState:string }>();
const {accessInbox, authAgent, memberOf} = useSolidProfile()
const toast = useToast();
const appMemory = useCache();
const {session} = useSolidSession();

let businessDataFetched = ref(false);
const enteredAnnualPercentageRate = ref(1.08);
const selectedLoanTerm = ref({label: "60 months", value: "5"});
const isDialogVisible = ref(false);
const isLoadingDialogVisible = ref(false);
const loanTerms = [
  {label: "6 months", value: "0.5"},
  {label: "12 months", value: "1"},
  {label: "24 months", value: "2"},
  {label: "36 months", value: "3"},
  {label: "48 months", value: "4"},
  {label: "60 months", value: "5"}
];

const selectedShapeTree = ref({
  label: "Business Assessment 2023",
  value: businessAssessmentTree
});
const shapeTrees = [
  {
    label: "Business Assessment 2022",
    value: businessAssessmentTree
  },
  {
    label: "Business Assessment 2023",
    value: businessAssessmentTree
  }
];

/**
 * Reactive state variable, but keep in mind, that something changes internally, Vuejs is not able to
 * recognize these changes, probably due to some private property changes. For example, if you use
 * store.addQuads(...) or store.add(...) the state won't be updating any computed reference / watcher,
 * that relies on that store.
 */
const state = reactive({
  demandStore: new Store(),
  offerStore: new Store(),
  orderStore: new Store(),
  demanderStore: new Store(),
  businessAssessmentStore : new Store(),
});
/**
 * change this if `state.demandStore` was changed somewhere.
 * E.g. by using `state.demandStore.addQuads(...);`
 */
const demandStoreChanges = ref(0);
/**
 * change this if `state.offerStore` was changed somewhere.
 * E.g. by using `state.offerStore.addQuads(...);`
 */
const offerStoreChanges = ref(0);
/**
 * change this if `state.orderStore` was changed somewhere.
 * E.g. by using `state.orderStore.addQuads(...);`
 */
const orderStoreChanges = ref(0);
/**
 * change this if `state.demanderStore` was changed somewhere.
 * E.g. by using `state.demanderStore.addQuads(...);`
 */
const demanderStoreChanges = ref(0);
/**
 * change this if `state.businessAssessmentStore` was changed somewhere.
 * E.g. by using `state.businessAssessmentStore.addQuads(...);`
 */
const businessAssessmentStoreChanges = ref(0);

/**
 * call this function with whatever you want to be tracked by vue-js.
 * Note, the function does not do anything! It is a no-op function.
 *
 * Usage:
 * ```typescript
 * const someRef = computed(() => {
 *   track(someDependencyThatNeedsToBeExplicitlyTrackedHere.value);
 *   return someOtherDependencyThatIsMayBeNotTrackedCorrectly;
 * });
 * ```
 *
 * You can pass multiple arguments, signals and variables to this function.
 *
 * @param _args anything you want to track by vue
 */
function track(..._args: unknown[]): void {}

async function fetchStoreOf(uri: string): Promise<Store> {
  return getResource(uri, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetchDemand!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.data)
      .then((txt) => parseToN3(txt, uri))
      .then((parsedN3) => parsedN3.store);
}

async function fillItemStoresIntoStore(itemUris: string[], store: Store, flag?:Ref<boolean>
) {
  const itemStores: Store[] = await Promise.all(
      itemUris.map((item) => fetchStoreOf(item))
  )
  itemStores
      .map(itemStore => itemStore.getQuads(null, null, null, null))
      .forEach((quads) => store.addQuads(quads));

  if(flag != undefined)
  {
    flag.value = !flag.value
  }
}

function refreshState() {
  state.demandStore = new Store()
  demandStoreChanges.value += 1;
  fetchStoreOf(props.demandUri)
      .then(store => {
        state.demandStore = store;
        demandStoreChanges.value += 1;
      })

  state.offerStore = new Store()
  offerStoreChanges.value += 1;

  state.orderStore = new Store()
  orderStoreChanges.value += 1;

  state.demanderStore = new Store()
  demanderStoreChanges.value += 1;
}

// DEMAND
state.demandStore = await fetchStoreOf(props.demandUri);
demandStoreChanges.value += 1;

const accessRequestUri = computed(() => {
  track(demandStoreChanges.value);
  return state.demandStore.getQuads(props.demandUri, CREDIT("hasAccessRequest"), null, null)[0]?.object?.value
});
const isAccessRequestGranted = computed(() => {
  track(demandStoreChanges.value);
  return state.demandStore.getQuads(props.demandUri, CREDIT("isAccessRequestGranted"), null, null)[0]?.object?.value
});
const amount = computed(() => {
  track(demandStoreChanges.value);
  return state.demandStore.getObjects(null, SCHEMA("amount"), null)[0]?.value
});
const currency = computed(() => {
  track(demandStoreChanges.value);
  return state.demandStore.getObjects(null, SCHEMA("currency"), null)[0]?.value
});
const demanderUri = computed(() => {
  track(demandStoreChanges.value);
  return state.demandStore.getQuads(null, SCHEMA("seeks"), props.demandUri, null)[0]?.subject?.value
});
let currentDemandState= ref('Demand');
// DEMANDER
watch(() => demanderUri.value,
    async () => {
      if (demanderUri.value) {
        state.demanderStore =
            await fetchStoreOf(demanderUri.value)
        demanderStoreChanges.value += 1;
      }
    }, {immediate: true}
)
watch(()=> props.demandState,()=> {
  currentDemandState.value = props.demandState;
}, {immediate:true});
const demanderName = computed(() => {
  track(demanderStoreChanges.value);
  return state.demanderStore.getObjects(null, FOAF("name"), null)[0]?.value
});
const demanderIconUri = computed(() => {
  track(demanderStoreChanges.value);
  return state.demanderStore.getObjects(null, VCARD("hasPhoto"), null)[0]?.value
});
const demanderAccessInboxUri = computed(() => {
  track(demanderStoreChanges.value);
  return state.demanderStore.getObjects(null, INTEROP("hasAccessInbox"), null)[0]?.value
});

// OFFER
const orderStoreFilledFlag = ref(false)
const offersForDemand = computed(() => {
  track(demandStoreChanges.value);
  return state.demandStore.getObjects(props.demandUri, CREDIT("hasOffer"), null).map(term => term.value)
});
const isOfferCreated = computed(() => offersForDemand.value.length > 0);

await fillItemStoresIntoStore(offersForDemand.value, state.offerStore, orderStoreFilledFlag)
offerStoreChanges.value += 1;

watch(() => offersForDemand.value, async () => {
  await fillItemStoresIntoStore(offersForDemand.value, state.offerStore, orderStoreFilledFlag);
  offerStoreChanges.value += 1;
});

const offerIsAccessible = computed(() => {
  track(offerStoreChanges.value);
  return state.offerStore.getObjects(null, CREDIT("isAccessRequestGranted"), null).map(term => term.value)
});
const offerAccessRequests = computed(() => {
  track(offerStoreChanges.value);
  return state.offerStore.getObjects(null, CREDIT("hasAccessRequest"), null).map(term => term.value)
});
watch(() => offerAccessRequests.value,
    async () => {
      offerAccessRequests.value.forEach(accessRequestURI => {
        if (appMemory[accessRequestURI]) {
          offersForDemand.value.forEach(offerURI => {
            if (state.offerStore.getQuads(new NamedNode(offerURI), CREDIT("hasAccessRequest"), new NamedNode(accessRequestURI), null).length > 0) {
              handleAuthorizationRequestRedirect(
                  offerURI,
                  accessRequestURI
              ).then(() => refreshState())
            }
          })
        }
      })
    }, {immediate: true}
)
/**
 * TabState will be used to determine the state of the tab.
 */
const tabState = computed( ()=>{
  if( currentState.value === STATES.Terminated){
    return TAB_STATE.Terminated;
  }
  if( currentState.value === STATES.OfferAccepted){
    return TAB_STATE.OfferAccepted;
  }
  else{
    return TAB_STATE.Demands;
  }
});

/**
 * CurrentState will be used to determine the state of the demand and the offer.
*/

const currentState = computed(() =>{
  if (accessRequestUri.value === undefined && !isOfferCreated.value) {
    return STATES.DataNeeded;
  }
  if(!isAccessRequestGranted.value || isAccessRequestGranted.value === 'false'){
    return STATES.PendingDataRequest;
  }
  if (accessRequestUri.value !== undefined && offerAccessRequests.value.length === 0) {
    return STATES.DataSuccessfullyProvided;
  }
  if(hasOrderForAnyOfferForThisDemand.value && !hasTerminatedOrder.value){
    return STATES.OfferAccepted
  }
  if(!(offerAccessRequests.value.length > 0 && !offerIsAccessible.value.some(response => response === 'true')) && !hasTerminatedOrder.value){
    return STATES.WaitingForResponse;
  }
  if(hasTerminatedOrder.value){
    return STATES.Terminated;
  }
  return STATES.NoOperation;
});

// ORDER
// meh. this imposes unnecessary requests and memory, should be application wide, but it works and I dont care at this point anymore.
watch(() => offersForDemand.value,
    async () => {
      track(orderStoreChanges.value);
      const orderContainers = await getDataRegistrationContainers(memberOf.value, orderShapeTreeUri, session);
      const orderItems = (await Promise.all(orderContainers.map(orderContainer => getContainerItems(orderContainer, session)))).flat()
      await fillItemStoresIntoStore(orderItems, state.orderStore, orderStoreFilledFlag)
      orderStoreChanges.value += 1;
    }, {immediate: true});

const hasOrderForAnyOfferForThisDemand = computed(() => {
  track(orderStoreChanges.value);
  const acceptedOffers = state.orderStore.getQuads(null, SCHEMA("acceptedOffer"), null, null).map(quad => quad.object?.value)
  return offersForDemand.value.some(offer => acceptedOffers.includes(offer))
});

const hasTerminatedOrder = ref(false);
watch(() => orderStoreFilledFlag.value == true, () => {
  track(orderStoreChanges.value);
  let acceptedOrders : string[] = [];
  for (const offer of offersForDemand.value){
    acceptedOrders.push(...state.orderStore.getSubjects(SCHEMA("acceptedOffer"), new NamedNode(offer), null).map(subject => subject.value));
  }
  const terminatedOrders = state.orderStore.getSubjects(CREDIT("isTerminated"), null, null).map(subject => subject.value);
  hasTerminatedOrder.value = acceptedOrders.some(acceptedOrder => terminatedOrders.includes(acceptedOrder));
});
/*
* UI Computed Values
* */
const isTerminateBtnVisible = computed(()=> hasOrderForAnyOfferForThisDemand.value && !hasTerminatedOrder.value);
const isCreateOfferBtnDisabled = computed(() => (!isAccessRequestGranted.value || isOfferCreated || currentState.value === STATES.PendingDataRequest) && !(currentState.value === STATES.DataSuccessfullyProvided));

const isDialogCloseBtnVisible = computed(() => ((currentState.value === STATES.OfferAccepted) || (currentState.value === STATES.Terminated)));
const isDialogShowDataBtnDisabled = computed(() => (!isAccessRequestGranted.value || isAccessRequestGranted.value === 'false'));
const isDialogRequestNewDataBtnDisabled = computed(() => (!isAccessRequestGranted.value || isAccessRequestGranted.value === 'false'));
async function fetchProcessedData() {
  const businessAssessmentUri = await getDataRegistrationContainers(demanderUri.value!, selectedShapeTree.value.value, session);
  const items = await getContainerItems(businessAssessmentUri[0], session);
  await fillItemStoresIntoStore(items, state.businessAssessmentStore);
  businessAssessmentStoreChanges.value += 1;
  businessDataFetched.value = true;
}

async function patchBusinessResourceToHaveAccessRequest(businessResource: string, accessRequest: string) {
  return getResource(businessResource, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on get Demand!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.data)
      .then(txt => txt.concat(`
        <> <${CREDIT('hasAccessRequest')}> <${accessRequest}> .
        <> <${CREDIT('isAccessRequestGranted')}> false .
      `))
      .then(body => {
        return putResource(businessResource, body, session)
            .catch((err) => {
              toast.add({
                severity: "error",
                summary: "Error on put Demand!",
                detail: err,
                life: 5000,
              });
              throw new Error(err);
            });
      })
}

async function requestAccessToData() {

  const accessRequestBody = getDataBody(props.demandUri,demanderUri.value, selectedShapeTree.value.value, memberOf.value);
  const accessRequestUri = await createResource(demanderAccessInboxUri!.value!, accessRequestBody, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on put Demand!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then(getLocationHeader);

  await patchBusinessResourceToHaveAccessRequest(props.demandUri, accessRequestUri + "#bwaAccessRequest")
  refreshState();
  toast.add({
    severity: "success",
    summary: "Request to data access sent.",
    life: 5000,
  });
}

async function requestCreationOfData() {
  isDialogVisible.value = false
  const documentCreationDemandBody = getDocumentCreationDemandBody(memberOf.value,props.demandUri,selectedShapeTree.value.value);
  const documentCreationDemandContainerUris = await getDataRegistrationContainers(demanderUri.value!, documentCreationDemandShapeTreeUri, session);
  const documentCreationDemandURI = await createResource(documentCreationDemandContainerUris[0], documentCreationDemandBody, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on create!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then(getLocationHeader)
  await patchDocumentCreationDemandInDemand(props.demandUri, documentCreationDemandURI);
  toast.add({
    severity: "success",
    summary: "Request for data creation sent.",
    life: 5000,
  });
}

async function patchDocumentCreationDemandInDemand(demandURI: string, documentCreationDemandURI: string): Promise<AxiosResponse<any, any>> {
  // GET the current data
  return getResource(demandURI, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on get Demand!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.data)
      .then(txt => txt.concat(`
        <> <${CREDIT('hasDocumentCreationDemand')}> <${documentCreationDemandURI}> .
      `))
      .then(body => {
        return putResource(demandURI, body, session)
            .catch((err) => {
              toast.add({
                severity: "error",
                summary: "Error on put Demand!",
                detail: err,
                life: 5000,
              });
              throw new Error(err);
            });
      })
}

async function SetTerminationFlagInOrder(offersForDemand: string[]) {
  const orderURIs = state.orderStore.getSubjects( SCHEMA("acceptedOffer"), offersForDemand[0], null).map(x => x.value);
  return getResource(orderURIs[0], session)
      .then((resp) => resp.data)
      .then((txt) => parseToN3(txt, orderURIs[0]))
      .then((parsedN3) => {
        parsedN3.store.addQuad(
            new NamedNode(orderURIs[0]),
            new NamedNode(CREDIT("isTerminated")),
            new Literal(`"true"^^${XSD("boolean")}`)
        );
        const writer = new Writer({
          format: "text/turtle",
          prefixes: parsedN3.prefixes,
        });
        writer.addQuads(parsedN3.store.getQuads(null, null, null, null));
        let body = "";
        writer.end((error, result) => (body = result));
        return body;
      })
      .then((body) => {
        return putResource(orderURIs[0], body, session);
      })
      .then(_ => toast.add({
        severity: "success",
        summary: "Termination set successfully",
        life: 5000,
      }))
      .then(() => refreshState());
}

async function patchOfferInDemand(demandURI: string, offerURI: string): Promise<AxiosResponse<any, any>> {
  // GET the current data
  return getResource(demandURI, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on get Demand!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.data)
      .then(txt => txt.concat(`
        <${demandURI}> <${CREDIT('hasOffer')}> <${offerURI}> .
      `))
      .then(body => {
        return putResource(demandURI, body, session)
            .catch((err) => {
              toast.add({
                severity: "error",
                summary: "Error on put Demand!",
                detail: err,
                life: 5000,
              });
              throw new Error(err);
            });
      })
}

async function createOfferResource(demand: string, dataAccessRequest: string) {
  isLoadingDialogVisible.value =true;
  const businessAssessmentRegistrations = await getDataRegistrationContainers(demanderUri!.value!, selectedShapeTree.value.value, session);
  const derivedFromData = businessAssessmentRegistrations.map(r => "<" + r + ">").join(", ");
  const body = getCreateOfferResourceBody(
      demand,
      derivedFromData,
      dataAccessRequest,
      memberOf.value,
      demanderUri.value,
      amount.value,
      currency.value,
      enteredAnnualPercentageRate.value,
      selectedLoanTerm.value.value
  );
  const offerLocation = await createResourceInAnyRegistrationOfShape(memberOf.value!, offerShapeTreeUri, body, session)
      .catch((err) => {
        isLoadingDialogVisible.value = false;
        toast.add({
          severity: "error",
          summary: "Error on create offer!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then(getLocationHeader);

  await patchOfferInDemand(demand, offerLocation)

  const offerSelfAcccessRequestLocation = await requestAccessBeingSet(offerLocation, demanderUri.value!)
  await patchBusinessResourceToHaveAccessRequest(offerLocation, offerSelfAcccessRequestLocation + "#accessRequest")
  refreshState(); // update state
  toast.add({
    severity: "success",
    summary: "Offer created successfully",
    life: 5000,
  });
  setTimeout(()=>{
    offerAccessRequests.value.forEach(function (offerAccessRequest) {
      handleAuthorizationRequest(offerAccessRequest)
    });
  }, 5000);

}

async function requestAccessBeingSet(resource: string, forAgent: string) {
  const body = getAccessBeingSetBody(memberOf.value, forAgent, props.demandUri, resource);
  return createResource(accessInbox.value, body, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on request access!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then(getLocationHeader);
}

function handleAuthorizationRequest(inspectedAccessRequestURI: string) {
  isLoadingDialogVisible.value =false;
  window.open(
      `${authAgent.value}?uri=${encodeURIComponent(
          inspectedAccessRequestURI
      )}&app_redirect=${encodeURIComponent(
          window.location.origin + "/accessRequestHandled"
      )}&css=${encodeURIComponent(window.location.origin + "/auth.css")}`,
      "_self"
  );
}
function processDataDialogBox(){
  isDialogVisible.value = true;
  fetchProcessedData()
}
async function handleAuthorizationRequestRedirect(
    businessResourceURI: string,
    accessRequestURI: string
) {
  // patch demand
  return getResource(businessResourceURI, session)
      .then((resp) => resp.data)
      .then((txt) => parseToN3(txt, businessResourceURI))
      .then((parsedN3) => {
        parsedN3.store.removeQuads(
            parsedN3.store.getQuads(
                new NamedNode(businessResourceURI),
                new NamedNode(CREDIT("isAccessRequestGranted")),
                null,
                null
            )
        );
        parsedN3.store.addQuad(
            new NamedNode(businessResourceURI),
            new NamedNode(CREDIT("isAccessRequestGranted")),
            new Literal(`"true"^^${XSD("boolean")}`)
        );
        const writer = new Writer({
          format: "text/turtle",
          prefixes: parsedN3.prefixes,
        });
        writer.addQuads(parsedN3.store.getQuads(null, null, null, null));
        let body = "";
        writer.end((error, result) => (body = result));
        return body;
      })
      .then((body) => {
        return putResource(businessResourceURI, body, session);
      })
      .then(() => delete appMemory[accessRequestURI]);
}
setTimeout(()=>{
  const id = props.demandUri.slice(props.demandUri.lastIndexOf('/')+1);
  const data = {
    "id": id,
    "name": demanderName.value,
    "status": currentState.value,
    "amount": amount.value,
    "tab": tabState.value
  };

  storeDemands(data);
},1000);
</script>

<style scoped>
.p-component :deep(.p-card-body){
  padding-top:0px
}
.p-component :deep(.p-card-content ){
  padding-top:0px
}


.p-disabled{
  background-color: rgba(237, 240, 243, 1); /* Change to your desired color */
  cursor: not-allowed; /* Optional: Change cursor style */
}
  .container {
    display: flex;
    border-radius: 0.5rem;
    box-shadow: 0px 1px 6px 0px rgba(44, 51, 53, 0.06), 0px 1px 24px 0px rgba(44, 51, 53, 0.09);
    overflow: hidden;
    margin-left: 1rem;
    margin-right: 2rem;
  }

  .content-left {
    flex: 1;
    background-color: white;
    padding: 1.5rem;
  }

  .content-right {
    width: 21rem;
    background-color: rgba(208, 222, 227, 1);
    padding: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .p-stepper-number {
    &.step-inactive {
      background-color: rgb(200, 200, 200);
    }
  }

  .p-stepper-title {
    font-family: "Noto Sans Display", Arial, sans-serif;
    font-weight: 500;
    font-size: 1rem;
    color: rgba(0, 0, 0, 1);

    &.step-inactive {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .dropdown-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .p-dropdown-panel {
    /* causes known bug: https://github.com/primefaces/primevue/issues/4043 */
    /* display: none; */
  }

  .step-button {
    color:black;
    width: fit-content;
    font-weight: bold;
    border: none;
    margin-left: 0.5rem;

    &:hover {
      background-color: rgba(65, 132, 153, 0.2);
    }

    &:disabled {
      color: rgba(0, 0, 0, 0.7);
    }
  }

  .button-next {
    color: rgba(0, 0, 0, 0.9);
    font-weight: 500;
    min-width: 4rem;
    background: rgba(153, 232, 39, 1);
    border-radius: 4px;
    box-shadow: 0px 1px 4px 0px rgba(44, 51, 53, 0.07), 0px 2px 3px 0px rgba(44, 51, 53, 0.06), 0px 2px 1px 0px rgba(44, 51, 53, 0.12), 0px 1px 0px 0px rgba(3, 59, 74, 0.46);
    &:hover {
      outline-color: rgba(32, 151, 12, 0.1);
    }
  }

  .button-back {
    color: rgba(0, 0, 0, 0.9);
    font-weight: 500;
    min-width: 4rem;
    background: rgba(246, 247, 249, 1);
    border-radius: 4px;
    box-shadow: 0px 1px 4px 0px rgba(44, 51, 53, 0.07), 0px 2px 3px 0px rgba(44, 51, 53, 0.06), 0px 2px 1px 0px rgba(44, 51, 53, 0.12), 0px 1px 0px 0px rgba(3, 59, 74, 0.46);

    &:hover {
      outline-color: rgba(0, 0, 0, 0.15);
    }
  }

  .refresh-container {
    display: none;
    position: relative;

    Button {
      position: absolute;
      top: 0;
      right: -0.5rem;
      z-index: 1;
    }
  }

  .content-right-side {
    width: 100%;

    .amount-label {
      text-align: right;

    }

    .amount-value {
      font-size: 2rem;
      font-weight: 500;
      color: rgba(0, 0, 0, 1);
      text-align: right;
    }
  }

  .demand {
    display: flex;
    justify-content: flex-end;

    a {
      display: flex;
      align-items: center;
      text-decoration: none;
      font-size: 1rem;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.9);
    }
  }

  p {
    margin: 0;
  }

  a {
    color: white;
  }

  hr {
    border: 1px solid var(--surface-d);
  }
</style>
