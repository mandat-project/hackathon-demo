<template>
  <li>
    <h3>Transaction number: <a :href="props.demandUri">{{ props.demandUri.split("/").pop() }}</a></h3>

    <ul class="flex flex-column gap-2">

      <li class="flex align-items-center gap-1">
        <p>From: <a :href="demanderUri">{{ demanderName }} </a></p>
        <img :src="demanderIconUri" width="25" alt="demander icon">
      </li>

      <li class="flex align-items-center gap-1">
        <p>Amount: {{ amount }} {{ currency }}</p>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary"
                v-bind:disabled="!dataRequestURI || hasRequestedData || isOfferCreated"
                @click="requestData()">Request business assessment data from {{ demanderName }}
        </Button>
        <p>
          &rightarrow;
          <a v-if="dataRequestURI" :href=dataRequestURI>Data Request</a>
        </p>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary"
                v-bind:disabled="!dataRequestURI || hasRequestedData || isOfferCreated"
                @click="fetchProcessedData()">Fetch processed business assessment data from {{ demanderName }}
        </Button>
        <p>
          &rightarrow;
          <a v-if="dataProcessedURI" :href=dataProcessedURI>Processed Data</a>
        </p>
      </li>

      <li class="flex align-items-center gap-2">
        <div class="grid">
          <span class="align-self-center font-bold">Annual percentage rate % </span>
          <div class="col">
            <InputText id="amount" type="number" v-model="enteredAnnualPercentageRate"/>
          </div>
        </div>
        <div class="grid">
          <span class="align-self-center font-bold">Loan terms</span>
          <div class="col">
            <Dropdown v-model="selectedLoanTerm" :options="loanTerms" optionLabel="label"
                      placeholder="Select loan term"/>
          </div>
        </div>
      </li>
      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary"
                v-bind:disabled="!dataRequestURI || isOfferCreated"
                @click="createOfferResource(props.demandUri, dataRequestURI!, dataProcessedURI!)">Create an offer for
          {{ demanderName }}
        </Button>

        <span class="offerAcceptedStatus" v-if="isOfferAccepted">&check; Offer accepted</span>
        <span class="offerAcceptedStatus" v-if="!isOfferAccepted && isOfferCreated">&#9749; Waiting for response</span>
      </li>

    </ul>
  </li>
</template>

<script setup lang="ts">
import {useSolidSession} from '@shared/composables';
import {
  ACL,
  createResource,
  CREDIT,
  getLocationHeader,
  getResource,
  LDP,
  parseToN3,
  putResource,
  SCHEMA,
  getDataRegistrationContainers, FOAF, VCARD
} from '@shared/solid';
import {Store} from 'n3';
import {useToast} from 'primevue/usetoast';
import {computed, ComputedRef, onMounted, reactive, ref, toRefs} from 'vue';


const props = defineProps<{ demandUri: string }>();

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const {webId} = toRefs(sessionInfo);

const enteredAnnualPercentageRate = ref(1.08);
const selectedLoanTerm = ref({label: "60 months", value: "5"});
const loanTerms = [
  {label: "6 months", value: "0.5"},
  {label: "12 months", value: "1"},
  {label: "24 months", value: "2"},
  {label: "36 months", value: "3"},
  {label: "48 months", value: "4"},
  {label: "60 months", value: "5"}
];

const orderShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOrderTree';
const offerShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOfferTree';

let orderContainerUris: Array<string>;
let offerContainerUris: Array<string>;


const hasRequestedData = ref(false)

const state = reactive({
  demandStore: new Store(),
  orderStore: new Store(),
  processedDataStore: new Store(),
  demanderStore: new Store()
});

// Demander
const demanderName: ComputedRef<string | undefined> = computed(() => state.demanderStore.getObjects(null, FOAF("name"), null)[0]?.value);
const demanderIconUri: ComputedRef<string | undefined> = computed(() => state.demanderStore.getObjects(null, VCARD("hasPhoto"), null)[0]?.value);

// Demand
const dataRequestURI: ComputedRef<string | undefined> = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("hasDataRequest"), null, null)[0]?.object?.value);
const dataProcessedURI: ComputedRef<string | undefined> = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("hasDataProcessed"), null, null)[0]?.object?.value);
const amount: ComputedRef<string | undefined> = computed(() => state.demandStore.getObjects(null, SCHEMA("amount"), null)[0]?.value);
const currency: ComputedRef<string | undefined> = computed(() => state.demandStore.getObjects(null, SCHEMA("currency"), null)[0]?.value);
const demanderUri: ComputedRef<string | undefined> = computed(() => state.demandStore.getQuads(null, SCHEMA("seeks"), props.demandUri, null)[0]?.subject?.value);

// Offers
const offers = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("hasOffer"), null, null));
const isOfferCreated = computed(() => offers.value.length > 0);
const isOfferAccepted = computed(() => {
  const offerUri = offers.value[0]?.object?.value;
  return offerUri
      ? state.orderStore.getQuads(null, SCHEMA("acceptedOffer"), offerUri, null).length > 0
      : false;
});

async function getAllDataRegistrationContainers() {
  orderContainerUris = await getContainerUris(webId!.value!, orderShapeTreeUri);
  offerContainerUris = await getContainerUris(webId!.value!, offerShapeTreeUri);
}

async function getStoreProfileCard(uri: string) {
  return await getResource(uri, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on getStoreProfileCard!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, sessionInfo.webId!))
      .then((parsedN3) => parsedN3.store);
}

async function getContainerUris(webId: string, shapeTreeUri: string) {
  return await getDataRegistrationContainers(webId, shapeTreeUri, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on getDataRegistrationContainers!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      });
}

onMounted(async () => {
  await getAllDataRegistrationContainers()
  await fetchDemand();
  await fetchDemander();
  await fetchOrders()
      .then(() => addOrderDetails());
});

async function fetchDemander(): Promise<Store> {
  return getResource(demanderUri.value!, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetchDemander!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, props.demandUri))
      .then((parsedN3) => state.demanderStore = parsedN3.store);
}

async function fetchDemand(): Promise<Store> {
  return getResource(props.demandUri, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetchDemand!",
          detail: err,
          life: 5000,
        });
        //      isLoading.value = false;
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, props.demandUri))
      .then((parsedN3) => state.demandStore = parsedN3.store);
}

async function fetchOrders() {
  return getResource(orderContainerUris[0], authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetchOrders!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, orderContainerUris[0]))
      .then((parsedN3) => state.orderStore = parsedN3.store);
}

/**
 * Adds details to orderStore foreach contained order
 */
function addOrderDetails(): Promise<void[]> {
  return Promise.all(state.orderStore.getObjects(null, LDP("contains"), null).map((order) => order.value)
      .map(orderUri => getResource(orderUri, authFetch.value)
          .catch((err) => {
            toast.add({
              severity: "error",
              summary: "Error on get Order!",
              detail: err,
              life: 5000,
            });
            throw new Error(err);
          })
          .then((resp) => resp.text())
          .then((txt) => parseToN3(txt, orderUri))
          .then((parsedN3) => state.orderStore.addQuads(parsedN3.store.getQuads(null, null, null, null)))
      )
  );
}

function fetchProcessedData(): Promise<Store> {
  return getResource(dataProcessedURI.value!, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetchProcessedData!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => {
        toast.add({
          severity: "success",
          summary: "Processed Data",
          detail: txt,
          life: 10000,
        });
        return parseToN3(txt, dataProcessedURI.value!)
      })
      .then((parsedN3) => state.processedDataStore = parsedN3.store)
}

function requestData(): Promise<Response> {
  // simulate patch as it is not supported, warning: not atomic
  return getResource(dataRequestURI.value!, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on get requestData!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then(txt => txt.concat(`
        <> <${CREDIT('hasRequestedData')}> <#requestedData> .
            <#requestedData> a <${CREDIT('Balance')}> .
      `))
      .then(body => {
        hasRequestedData.value = true;
        return putResource(dataRequestURI.value!, body, authFetch.value)
            .catch((err) => {
              toast.add({
                severity: "error",
                summary: "Error on put!",
                detail: err,
                life: 5000,
              });
              throw new Error(err);
            })
      })
}

function patchDemand(demandURI: string, offerURI: string): Promise<Response> {
  // GET the current data
  return getResource(demandURI, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on get Demand!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then(txt => txt.concat(`
        <${demandURI}> <${CREDIT('hasOffer')}> <${offerURI}> .
      `))
      .then(body => {
        hasRequestedData.value = true;
        return putResource(demandURI, body, authFetch.value)
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

async function createOffer(body: string) {
  return await createResource(offerContainerUris[0], body, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on create Offer!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then(getLocationHeader);
}

async function createOfferResource(demandURI: string, dataRequestURI: string, dataProcessedURI: string): Promise<void> {
  const body = `
            @prefix : <#>.
            @prefix credit: <${CREDIT()}> .
            @prefix schema: <${SCHEMA()}> .
            <> a credit:Offer;
            schema:itemOffered <#credit>;
          schema:availability schema:InStock;
            credit:derivedFromDemand <${demandURI}> ;
            credit:derivedFromData <${dataProcessedURI}>;
            credit:hasUnderlyingRequest <${dataRequestURI}> .
            <${webId?.value}> schema:offers <>  .
          <${demanderUri.value}> schema:seeks <>  .
            <http://example.com/loansAndCredits/c12345#credit>
                  a schema:LoanOrCredit ;
                  schema:amount "${amount.value}";
                  schema:currency "${currency.value}";
                  schema:annualPercentageRate "${enteredAnnualPercentageRate.value}";
                  schema:loanTerm <#duration>.
            <#duration>
              a schema:QuantitativeValue;
              schema:value "${selectedLoanTerm.value.value} years".
            `
  const offerURI = await createOffer(body);

  await patchDemand(demandURI, offerURI);
  await grantAccessToResource(offerURI, demanderUri.value!);
  await grantAccessToResource(demandURI, demanderUri.value!); // for demand

  await fetchDemand(); // trigger recalculation of isOfferAccepted
}

function grantAccessToResource(resourceUri: string, agentUri: string): Promise<Response> {
  const aclUri = `${resourceUri}.acl`;
  const body = `
            @prefix : <#>.
            @prefix acl: <${ACL()}> .
            <#read> a acl:Authorization;
                acl:agent <${agentUri}>;
                acl:mode acl:Read;
                acl:accessTo <${resourceUri}> .
            <#control> a acl:Authorization;
                acl:agent <${webId?.value}>;
                acl:mode acl:Read,acl:Control,acl:Write;
                acl:accessTo <${resourceUri}> .
            `
  return putResource(aclUri, body, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on put!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      });
}

</script>

<style>
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