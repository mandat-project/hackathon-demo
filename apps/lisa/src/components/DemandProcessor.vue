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
        <div class="col">
          <span class="align-self-center font-bold">Select additional Data to Request</span>
          <Dropdown v-model="selectedShapeTree" :options="shapeTrees" optionLabel="label" placeholder="Request Data" />
        </div>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary" v-bind:disabled="accessRequestUri !== undefined || isOfferCreated"
          @click="requestData()">Request business assessment data from {{ demanderName }}
        </Button>
        <p>
          &rightarrow;
          <a v-if="accessRequestUri" :href=accessRequestUri>Access Request</a>
        </p>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary" v-bind:disabled="isAccessRequestGranted === 'false' || isOfferCreated"
          @click="fetchProcessedData()">Fetch processed business assessment data from {{ demanderName }}
        </Button>
      </li>

      <li class="flex align-items-center gap-2">
        <div class="grid">
          <span class="align-self-center font-bold">Annual percentage rate % </span>
          <div class="col">
            <InputNumber id="amount" type="number" v-model="enteredAnnualPercentageRate" />
          </div>
        </div>
        <div class="grid">
          <span class="align-self-center font-bold">Loan terms</span>
          <div class="col">
            <Dropdown v-model="selectedLoanTerm" :options="loanTerms" optionLabel="label"
              placeholder="Select loan term" />
          </div>
        </div>
      </li>
      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary" :disabled="!isAccessRequestGranted || isOfferCreated"
          @click="createOfferResource(props.demandUri, accessRequestUri!)">Create an offer for
          {{ demanderName }}
        </Button>

        <span class="offerAcceptedStatus" v-if="isOfferAccepted">&check; Offer accepted</span>
        <span class="offerAcceptedStatus" v-if="!isOfferAccepted && isOfferCreated">&#9749; Waiting for response</span>
      </li>

    </ul>
  </li>
</template>

<script setup lang="ts">
import { useSolidProfile, useSolidSession } from '@shared/composables';
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
  getDataRegistrationContainers,
  FOAF,
  VCARD,
  INTEROP,
  XSD,
  SKOS,
  createResourceInAnyRegistrationOfShape
} from '@shared/solid';
import { Store } from 'n3';
import { useToast } from 'primevue/usetoast';
import { computed, reactive, ref, toRefs } from 'vue';

const props = defineProps<{ demandUri: string }>();
const { accessInbox } = useSolidProfile()
const toast = useToast();
const { authFetch, sessionInfo } = useSolidSession();
const { webId } = toRefs(sessionInfo);

const enteredAnnualPercentageRate = ref(1.08);
const selectedLoanTerm = ref({ label: "60 months", value: "5" });
const loanTerms = [
  { label: "6 months", value: "0.5" },
  { label: "12 months", value: "1" },
  { label: "24 months", value: "2" },
  { label: "36 months", value: "3" },
  { label: "48 months", value: "4" },
  { label: "60 months", value: "5" }
];

const selectedShapeTree = ref({ label: "Business Assessment 2023", value: "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree" });
const shapeTrees = [
  { label: "Business Assessment 2022", value: "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree" },
  { label: "Business Assessment 2023", value: "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree" }
];

const orderShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOrderTree';
const offerShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOfferTree';

const state = reactive({
  demandStore: new Store(),
  offerStore: new Store(),
  orderStore: new Store(),
  demanderStore: new Store()
});

async function fetchStoreOf(uri: string): Promise<Store> {
  return getResource(uri, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Error on fetchDemand!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, uri))
    .then((parsedN3) => parsedN3.store);
}

async function fillLdpContainsItemsIntoStore(store: Store) {
  const itemStores: Store[] = await Promise.all(
    store.getObjects(null, LDP("contains"), null)
      .map((item) => fetchStoreOf(item.value))
  )
  itemStores
    .map(itemStore => itemStore.getQuads(null, null, null, null))
    .map((quads) => store.addQuads(quads))
}

// DEMAND
state.demandStore = await fetchStoreOf(props.demandUri);
const accessRequestUri = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("hasAccessRequest"), null, null)[0]?.object?.value);
const isAccessRequestGranted = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("isAccessRequestGranted"), null, null)[0]?.object?.value);
const amount = computed(() => state.demandStore.getObjects(null, SCHEMA("amount"), null)[0]?.value);
const currency = computed(() => state.demandStore.getObjects(null, SCHEMA("currency"), null)[0]?.value);
const demanderUri = computed(() => state.demandStore.getQuads(null, SCHEMA("seeks"), props.demandUri, null)[0]?.subject?.value);
// DEMANDER
state.demanderStore = await fetchStoreOf(demanderUri.value!);
const demanderName = computed(() => state.demanderStore.getObjects(null, FOAF("name"), null)[0]?.value);
const demanderIconUri = computed(() => state.demanderStore.getObjects(null, VCARD("hasPhoto"), null)[0]?.value);
const demanderAccessInboxUri = computed(() => state.demanderStore.getObjects(null, INTEROP("hasAccessInbox"), null)[0]?.value);

// OFFER
let offerContainerUris = await getDataRegistrationContainers(webId!.value!, offerShapeTreeUri, authFetch.value);
state.offerStore = await fetchStoreOf(offerContainerUris[0]);
fillLdpContainsItemsIntoStore(state.offerStore)

const offers = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("hasOffer"), null, null));
const isOfferCreated = computed(() => offers.value.length > 0);
const isOfferAccepted = computed(() => {
  const offerUri = offers.value[0]?.object?.value;
  return offerUri
    ? state.orderStore.getQuads(null, SCHEMA("acceptedOffer"), offerUri, null).length > 0
    : false;
});


async function fetchProcessedData() {
  const businessAssessmentUri = await getDataRegistrationContainers(demanderUri.value!, selectedShapeTree.value.value, authFetch.value);
  window.open(businessAssessmentUri[0], '_tab');
}

async function patchBusinessResourceToHaveAccessRequest(businessResource: string, accessRequest: string) {
  return getResource(businessResource, authFetch.value)
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
        <> :hasAccessRequest <${accessRequest}> .
        <> :isAccessRequestGranted false .
      `))
    .then(body => {
      return putResource(businessResource, body, authFetch.value)
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

async function requestData() {
  const body = `@prefix interop: <${INTEROP()}> .
    @prefix ldp: <${LDP()}> .
    @prefix skos: <${SKOS()}> .
    @prefix credit: <${CREDIT()}> .
    @prefix xsd: <${XSD()}> .
    @prefix acl: <${ACL()}> .

    # This could be hosted at the profle document of the application or social agent or at a
    # central location (e.g. together with the shapes/shapetress) for "standardized" access needs
    <#bwaAccessNeed>
      a interop:AccessNeed ;
      interop:accessMode acl:Read ;
      interop:registeredShapeTree <${selectedShapeTree.value.value}> ;
      interop:accessNecessity interop:accessRequired .

    <#bwaAccessNeedGroup>
      a interop:AccessNeedGroup ;
      interop:hasAccessDescriptionSet <#bwaAccessDescriptionSet> ;
      interop:accessNecessity interop:accessRequired ;
      interop:accessScenario interop:sharedAccess ;
      interop:authenticatesAs interop:SocialAgent ;
      interop:hasAccessNeed <#bwaAccessNeed> .

    <#bwaAccessDescriptionSet>
      a interop:AccessDescriptionSet ;
      interop:usesLanguage "de"^^xsd:language .

    # This is hosted at the profile document of the agent or application
    <#bwaAccessNeedGroupDescription>
      a interop:AccessNeedGroupDescription ;
      interop:inAccessDescriptionSet <#bwaAccessDescriptionSet> ;
      interop:hasAccessNeedGroup <#bwaAccessNeedGroup> ;
      skos:prefLabel "Zugriff BWA (Gruppe)"@de ;
      skos:definition "Die Bank muss deine BWAs kennen, um ein für dich passendes Kreditangebot zu erstellen"@de .

    <#bwaAccessNeedDescription>
      a interop:AccessNeedDescription ;
      interop:inAccessDescriptionSet <#bwaAccessDescriptionSet> ;
      interop:hasAccessNeed <#bwaAccessNeed> ;
      skos:prefLabel "Zugriff BWA"@de ;
      skos:definition "Die Bank muss deine BWAs kennen, um ein für dich passendes Kreditangebot zu erstellen"@de .

    # Goes into the access inbox of sme
    <#bwaAccessRequest>
      a interop:AccessRequest ;
      interop:fromSocialAgent <${webId!.value}> ;
      interop:toSocialAgent  <${demanderUri.value}> ;
      interop:hasAccessNeedGroup <#bwaAccessNeedGroup> ;
      credit:fromDemand <${props.demandUri}>.`;

  const accessRequestUri = await createResource(demanderAccessInboxUri!.value!, body, authFetch.value)
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
  state.demandStore = await fetchStoreOf(props.demandUri);
}

async function patchDemandOffer(demandURI: string, offerURI: string): Promise<Response> {
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

async function createOfferResource(demand: string, dataAccessRequest: string) {
  const businessAssessmentRegistrations = await getDataRegistrationContainers(demanderUri!.value!, selectedShapeTree.value.value, authFetch.value);

  const body = `
          @prefix : <#>.
          @prefix credit: <${CREDIT()}> .
          @prefix schema: <${SCHEMA()}> .
          <> a credit:Offer;
            schema:itemOffered <#credit>;
            schema:availability schema:InStock;
            credit:derivedFromDemand <${demand}> ;
            credit:derivedFromData ${businessAssessmentRegistrations.map(r => "<" + r + ">").join(", ")} ;
            credit:hasUnderlyingRequest <${dataAccessRequest}> .
          <${webId?.value}> schema:offers <>  .
          <${demanderUri.value}> schema:seeks <>  .
          <#credit>
                  a schema:LoanOrCredit ;
                  schema:amount "${amount.value}";
                  schema:currency "${currency.value}";
                  schema:annualPercentageRate "${enteredAnnualPercentageRate.value}";
                  schema:loanTerm <#duration>.
            <#duration>
              a schema:QuantitativeValue;
              schema:value "${selectedLoanTerm.value.value} years".
            `
  const offerLocation = await createResourceInAnyRegistrationOfShape(webId!.value!, offerShapeTreeUri, body, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Error on create offer!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then(getLocationHeader);
  await patchDemandOffer(demand, offerLocation)
  const offerSelfAcccessRequestLocation = await requestAccessBeingSet(offerLocation, demanderUri.value!)
  await patchBusinessResourceToHaveAccessRequest(offerLocation, offerSelfAcccessRequestLocation + "#accessRequest")
  state.demandStore = await fetchStoreOf(props.demandUri); // trigger recalculation of isOfferAccepted
}

async function requestAccessBeingSet(resource: string, forAgent: string) {
  const body = `@prefix interop: <${INTEROP()}> .
    @prefix ldp: <${LDP()}> .
    @prefix skos: <${SKOS()}> .
    @prefix credit: <${CREDIT()}> .
    @prefix xsd: <${XSD()}> .
    @prefix acl: <${ACL()}> .

    <#accessRequest>
      a interop:AccessRequest ;
      interop:fromSocialAgent <${webId!.value}> ;
      interop:toSocialAgent  <${forAgent}> ;
      interop:hasAccessNeedGroup <#accessNeedGroup> ;
      credit:fromDemand <${props.demandUri}>.

    <#accessNeedGroupDescription>
      a interop:AccessNeedGroupDescription ;
      interop:inAccessDescriptionSet <#accessDescriptionSet> ;
      interop:hasAccessNeedGroup <#accessNeedGroup> ;
      skos:prefLabel "Zugriff Offer"@de ;
      skos:definition "Gib das Angebot frei."@de .

    <#accessNeedGroup>
      a interop:AccessNeedGroup ;
      interop:hasAccessDescriptionSet <#accessDescriptionSet> ;
      interop:accessNecessity interop:accessRequired ;
      interop:accessScenario interop:sharedAccess ;
      interop:authenticatesAs interop:SocialAgent ;
      interop:hasAccessNeed <#accessNeed> .

    <#accessNeedDescription>
      a interop:AccessNeedDescription ;
      interop:inAccessDescriptionSet <#accessNeedGroupDescription> ;
      interop:hasAccessNeed <#accessNeed> ;
      skos:prefLabel "Zugriff Offer"@de ;
      skos:definition "Gib das Angebot frei."@de .

    <#accessNeed>
      a interop:AccessNeed ;
      interop:accessMode acl:Read ;
      interop:registeredShapeTree <https://solid.aifb.kit.edu/shapes/mandat/credit.shape#creditOfferShape> ;
      interop:hasDataInstance <${resource}> ;
      interop:accessNecessity interop:accessRequired .

    <#accessDescriptionSet>
      a interop:AccessDescriptionSet ;
      interop:usesLanguage "de"^^xsd:language .`;

  return createResource(accessInbox.value, body, authFetch.value)
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