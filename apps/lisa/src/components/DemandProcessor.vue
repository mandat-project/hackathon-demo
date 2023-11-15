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
          <Dropdown v-model="selectedShapeTree" :options="shapeTrees" optionLabel="label"
                    placeholder="Request Data"/>
        </div>
      </li>

      <li class="flex align-items-center gap-2">       
        <Button class="p-button p-button-secondary"
                v-bind:disabled="accessRequestUri !== undefined || isOfferCreated"
                @click="requestData()">Request business assessment data from {{ demanderName }}
        </Button>
        <p>
          &rightarrow;
          <a v-if="accessRequestUri" :href=accessRequestUri>Access Request</a>
        </p>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary"
                v-bind:disabled="isAccessRequestGranted === 'false' || isOfferCreated"
                @click="fetchProcessedData()">Fetch processed business assessment data from {{ demanderName }}
        </Button>
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
                v-bind:disabled="isAccessRequestGranted === false || isOfferCreated"
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
import {useSolidSession} from '@shared/composables';
import {
  ACL,
  createResource,
  CREDIT,
  FOAF,
  getDataRegistrationContainers,
  getLocationHeader,
  getResource,
  INTEROP,
  LDP,
  parseToN3,
  putResource,
  SCHEMA,
  SKOS,
  VCARD,
  XSD
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

const selectedShapeTree = ref({label: "Business Assessment 2023", value: "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree"});
const shapeTrees = [
  {label: "Business Assessment 2022", value: "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree"},
  {label: "Business Assessment 2023", value: "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree"}
];

const orderShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOrderTree';
const offerShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOfferTree';
const documentDemandShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/document.tree#documentDemandTree';

let orderContainerUris: Array<string>;
let offerContainerUris: Array<string>;


const state = reactive({
  demandStore: new Store(),
  orderStore: new Store(),
  demanderStore: new Store()
});

// Demander
const demanderName: ComputedRef<string | undefined> = computed(() => state.demanderStore.getObjects(null, FOAF("name"), null)[0]?.value);
const demanderIconUri: ComputedRef<string | undefined> = computed(() => state.demanderStore.getObjects(null, VCARD("hasPhoto"), null)[0]?.value);
const demanderAccessInboxUri: ComputedRef<string | undefined> = computed(() => state.demanderStore.getObjects(null, INTEROP("hasAccessInbox"), null)[0]?.value);

// Demand

const accessRequestUri: ComputedRef<string | undefined> = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("hasAccessRequest"), null, null)[0]?.object?.value);
const isAccessRequestGranted: ComputedRef<string | undefined> = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("isAccessRequestGranted"), null, null)[0]?.object?.value);
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

onMounted(async () => {
  await getAllDataRegistrationContainers()
  await fetchDemand();
  await fetchDemander();
  await fetchOrders()
      .then(() => addOrderDetails());
});

async function getAllDataRegistrationContainers() {
  orderContainerUris = await getContainerUris(webId!.value!, orderShapeTreeUri);
  offerContainerUris = await getContainerUris(webId!.value!, offerShapeTreeUri);
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

async function fetchProcessedData() {
  const businessAssessmentUri = await getDataRegistrationContainers(demanderUri.value!, selectedShapeTree.value.value, authFetch.value);
  window.open(businessAssessmentUri[0], '_tab');
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


function getAccessRequestBody() {
  return `@prefix interop: <${INTEROP()}> .
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
}

function patchDemandAccessRequest(accessRequestUri: string) {
  getResource(props.demandUri, authFetch.value)
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
        <> :hasAccessRequest <${accessRequestUri}#bwaAccessRequest> .
        <> :isAccessRequestGranted false .
      `))
      .then(body => {
        return putResource(props.demandUri, body, authFetch.value)
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
      .then(()=>fetchDemand())
}

async function postAccessRequest() {
  const accessRequest = getAccessRequestBody();

  return await createResource(demanderAccessInboxUri!.value!, accessRequest, authFetch.value)
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
}

async function requestData() {
  const accessRequestUri = await postAccessRequest();
  patchDemandAccessRequest(accessRequestUri);

  const documentDemandPayload = createDemandPayload(accessRequestUri);
  const documentDemandContainerUris = await getContainerUris(demanderUri.value!, documentDemandShapeTreeUri);
  await createDemand(documentDemandContainerUris, documentDemandPayload);
}

async function createDemand(
    documentDemandContainerUris: Array<string>,
    payload: string
) {
  return await createResource(documentDemandContainerUris[0], payload, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on create!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((res) => getLocationHeader(res));
}


function createDemandPayload(accessRequestUri: string) {
  return `\
      @prefix schema: <${SCHEMA()}> .
      @prefix credit: <${CREDIT()}> .
      @prefix interop: <${INTEROP()}> .

      <> a schema:Demand ;
      interop:fromSocialAgent <${webId!.value}> ;
      credit:derivedFromDemand <${props.demandUri}> ;
      credit:hasUnderlyingRequest <${accessRequestUri}> ;
      interop:registeredShapeTree <${selectedShapeTree.value.value}> .

      <${webId?.value}> schema:seeks <> .
    `;
}

function patchDemandOffer(demandURI: string, offerURI: string): Promise<Response> {
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

async function createOfferResource(demandURI: string, accessRequestUri: string): Promise<void> {
  const businessAssessmentUri = await getDataRegistrationContainers(demanderUri!.value!, selectedShapeTree.value.value, authFetch.value);

  const body = `
            @prefix : <#>.
            @prefix credit: <${CREDIT()}> .
            @prefix schema: <${SCHEMA()}> .
            <> a credit:Offer;
            schema:itemOffered <#credit>;
          schema:availability schema:InStock;
            credit:derivedFromDemand <${demandURI}> ;
            credit:derivedFromData <${businessAssessmentUri[0]}>;
            credit:hasUnderlyingRequest <${accessRequestUri}> .
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

  await patchDemandOffer(demandURI, offerURI);
  await grantAccessToResource(offerURI, demanderUri.value!); // TODO do via access request
  await grantAccessToResource(demandURI, demanderUri.value!); // obsolete when custom CSS with creator handler is deployed

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