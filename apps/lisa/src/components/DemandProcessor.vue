<template>
  <li>
    <h3>Demand: <a :href="props.demandUri">{{ props.demandUri }}</a></h3>

    <ul class="flex flex-column gap-2">

      <li class="flex align-items-center gap-2">
        <p>Amount: {{amount}} {{currency}}</p>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary" label="Demand additional data from StB"
                v-bind:disabled="!dataRequestURI || hasRequestedData || isOfferCreated"
                @click="requestData()"/>
        <p>
          &rightarrow;
          <a v-if="dataRequestURI" :href=dataRequestURI>Data Request</a>
        </p>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary" label="Fetch processed data demand from StB"
                v-bind:disabled="!dataRequestURI || hasRequestedData || isOfferCreated"
                @click="fetchProcessedData()"/>
        <p>
          &rightarrow;
          <a v-if="dataProcessedURI" :href=dataProcessedURI>Processed Data</a>
        </p>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary" label="Create an offer for SME"
                v-bind:disabled="!dataRequestURI || isOfferCreated"
                @click="createOfferResource(props.demandUri, dataRequestURI!, dataProcessedURI!)"/>
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
  getDataRegistrationContainers
} from '@shared/solid';
import {Store} from 'n3';
import {useToast} from 'primevue/usetoast';
import {computed, ComputedRef, onMounted, reactive, ref, toRefs} from 'vue';


const props = defineProps<{ demandUri: string }>();

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const {webId} = toRefs(sessionInfo);

const orderShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOrderTree';
const offerShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOfferTree';

let orderContainerUris: Array<string>;
let offerContainerUris: Array<string>;

const hasRequestedData = ref(false)

const state = reactive({
  demandStore: new Store(),
  orderStore: new Store(),
  processedDataStore: new Store(),
});

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
  orderContainerUris = await getDataRegistrationContainers(webId!.value!, orderShapeTreeUri, authFetch.value);
  offerContainerUris = await getDataRegistrationContainers(webId!.value!, offerShapeTreeUri, authFetch.value);
}

onMounted(async () => {
  await getAllDataRegistrationContainers()
  await fetchDemand();
  await fetchOrders()
      .then(() => addOrderDetails());
});

async function fetchDemand(): Promise<Store> {
  return getResource(props.demandUri, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetch!",
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
          summary: "Error on fetch!",
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
              summary: "Error on fetch!",
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
          summary: "Error on fetch!",
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
          summary: "Error on fetch!",
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
      })
}

function patchDemand(demandURI: string, offerURI: string): Promise<Response> {
  // GET the current data
  return getResource(demandURI, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetch!",
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
        return putResource(demandURI, body, authFetch.value);
      })
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
                  schema:annualPercentageRate "1.08";
                  schema:loanTerm <#duration>.
            <#duration>
              a schema:QuantitativeValue;
              schema:value "10 years".
            `
  const offerURI = await createResource(offerContainerUris[0], body, authFetch.value)
      .then(getLocationHeader)
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
  return putResource(aclUri, body, authFetch.value);
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