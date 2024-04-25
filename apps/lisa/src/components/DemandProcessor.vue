<template>
  <li>
    <h3>
      <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only" @click="refreshState()"/>
      Transaction number:
      <a :href="props.demandUri">{{ props.demandUri.split("/").pop() }}</a>
    </h3>

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
          <Dropdown v-model="selectedShapeTree" :options="shapeTrees" optionLabel="label" placeholder="Request Data"/>
        </div>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary" v-bind:disabled="accessRequestUri !== undefined || isOfferCreated"
                @click="requestAccessToData()">Request business assessment data from {{ demanderName }}
        </Button>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary"
                v-bind:disabled="!isAccessRequestGranted || isAccessRequestGranted === 'false' || isOfferCreated"
                @click="fetchProcessedData()">Fetch processed business assessment data from
          {{ demanderName }}
        </Button>
      </li>

      <li class="flex align-items-center gap-2">
        <Button class="p-button p-button-secondary"
                v-bind:disabled="!isAccessRequestGranted || isAccessRequestGranted === 'false' || isOfferCreated"
                @click="requestCreationOfData()">Request creation of new business assessment data from {{
            demanderName
          }}
        </Button>
      </li>

      <li class="flex align-items-center gap-2">
        <div class="grid">
          <span class="align-self-center font-bold">Annual percentage rate % </span>
          <div class="col">
            <InputNumber id="amount" type="number" v-model="enteredAnnualPercentageRate"/>
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
        <Button class="p-button p-button-secondary" :disabled="!isAccessRequestGranted || isOfferCreated"
                @click="createOfferResource(props.demandUri, accessRequestUri!)">Create an offer for
          {{ demanderName }}
        </Button>

        <span class="offerAcceptedStatus" v-if="hasOrderForAnyOfferForThisDemand && !hasTerminatedOrder">
          &check; Offer accepted
        </span>

        <span class="offerAcceptedStatus" v-if="!hasOrderForAnyOfferForThisDemand && isOfferCreated">
          <span v-if="offerAccessRequests.length > 0 && !offerIsAccessible.some(response => response === 'true')">
            <!-- Make offer accessible -->
            <span v-for="offerAccessRequest in offerAccessRequests" :key="offerAccessRequest">
              <Button type="submit" class="p-button-text p-button-danger"
                      @click="handleAuthorizationRequest(offerAccessRequest)"> Grant  {{ demanderName }} access to offer
              </Button>
            </span>
          </span>
          <span v-else>
            &#9749; Waiting for response
          </span>
        </span>
      </li>

      <li class="flex align-items-center gap-2">
        <span>
          <Button v-bind:disabled="!(hasOrderForAnyOfferForThisDemand && !hasTerminatedOrder)"
                  class="p-button p-button-secondary" @click="SetTerminationFlagInOrder(offersForDemand)">Terminate business relation
          </Button>
        </span>
        <span v-if="hasTerminatedOrder">
            ❌ Credit contract terminated!
        </span>
      </li>

    </ul>
  </li>
</template>

<script setup lang="ts">
import {useCache, useSolidProfile, useSolidSession} from '@shared/composables';
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
  createResourceInAnyRegistrationOfShape,
  getContainerItems,
  GDPRP, RDFS
} from '@shared/solid';
import {Literal, NamedNode, Store, Writer} from 'n3';
import {useToast} from 'primevue/usetoast';
import {computed, reactive, ref, toRefs, watch} from 'vue';

const props = defineProps<{ demandUri: string }>();
const {accessInbox, authAgent} = useSolidProfile()
const toast = useToast();
const appMemory = useCache();
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

const selectedShapeTree = ref({
  label: "Business Assessment 2023",
  value: "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree"
});
const shapeTrees = [
  {
    label: "Business Assessment 2022",
    value: "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree"
  },
  {
    label: "Business Assessment 2023",
    value: "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree"
  }
];

const orderShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOrderTree';
const offerShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOfferTree';
const documentCreationDemandShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/document.tree#documentCreationDemandTree';

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

async function fillItemStoresIntoStore(itemUris: string[], store: Store) {
  const itemStores: Store[] = await Promise.all(
      itemUris.map((item) => fetchStoreOf(item))
  )
  itemStores
      .map(itemStore => itemStore.getQuads(null, null, null, null))
      .map((quads) => store.addQuads(quads))
}

function refreshState() {
  state.demandStore = new Store()
  state.offerStore = new Store()
  state.orderStore = new Store()
  state.demanderStore = new Store()
  fetchStoreOf(props.demandUri).then(store => state.demandStore = store)
}

// DEMAND
state.demandStore = await fetchStoreOf(props.demandUri);
const accessRequestUri = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("hasAccessRequest"), null, null)[0]?.object?.value);
const isAccessRequestGranted = computed(() => state.demandStore.getQuads(props.demandUri, CREDIT("isAccessRequestGranted"), null, null)[0]?.object?.value);
const amount = computed(() => state.demandStore.getObjects(null, SCHEMA("amount"), null)[0]?.value);
const currency = computed(() => state.demandStore.getObjects(null, SCHEMA("currency"), null)[0]?.value);
const demanderUri = computed(() => state.demandStore.getQuads(null, SCHEMA("seeks"), props.demandUri, null)[0]?.subject?.value);

// DEMANDER
watch(() => demanderUri.value,
    async () => {
      if (demanderUri.value) {
        state.demanderStore =
            await fetchStoreOf(demanderUri.value)
      }
    }, {immediate: true}
)
const demanderName = computed(() => state.demanderStore.getObjects(null, FOAF("name"), null)[0]?.value);
const demanderIconUri = computed(() => state.demanderStore.getObjects(null, VCARD("hasPhoto"), null)[0]?.value);
const demanderAccessInboxUri = computed(() => state.demanderStore.getObjects(null, INTEROP("hasAccessInbox"), null)[0]?.value);

// OFFER
const offersForDemand = computed(() => state.demandStore.getObjects(props.demandUri, CREDIT("hasOffer"), null).map(term => term.value));
const isOfferCreated = computed(() => offersForDemand.value.length > 0);
watch(() => offersForDemand.value, () =>
    fillItemStoresIntoStore(offersForDemand.value, state.offerStore), {immediate: true})
const offerIsAccessible = computed(() => state.offerStore.getObjects(null, CREDIT("isAccessRequestGranted"), null).map(term => term.value));
const offerAccessRequests = computed(() => state.offerStore.getObjects(null, CREDIT("hasAccessRequest"), null).map(term => term.value));
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


// ORDER
// meh. this imposes unnecessary requests and memory, should be application wide, but it works and I dont care at this point anymore.
watch(() => offersForDemand.value,
    async () => {
      const orderContainers = await getDataRegistrationContainers(webId!.value!, orderShapeTreeUri, authFetch.value);
      const orderItems = (await Promise.all(orderContainers.map(orderContainer => getContainerItems(orderContainer)))).flat()
      await fillItemStoresIntoStore(orderItems, state.orderStore)
    }, {immediate: true})
const hasOrderForAnyOfferForThisDemand = computed(() => {
  const acceptedOffers = state.orderStore.getQuads(null, SCHEMA("acceptedOffer"), null, null).map(quad => quad.object?.value)
  return offersForDemand.value.some(offer => acceptedOffers.includes(offer))
});

const hasTerminatedOrder = ref(false);
watch(state.orderStore, () => {
  let acceptedOrders : string[] = [];
  for (const offer of offersForDemand.value){
    acceptedOrders.push(...state.orderStore.getSubjects(SCHEMA("acceptedOffer"), new NamedNode(offer), null).map(subject => subject.value));
  }
  const terminatedOrders = state.orderStore.getSubjects(CREDIT("isTerminated"), null, null).map(subject => subject.value);
  hasTerminatedOrder.value = acceptedOrders.some(acceptedOrder => terminatedOrders.includes(acceptedOrder));
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
        <> <${CREDIT('hasAccessRequest')}> <${accessRequest}> .
        <> <${CREDIT('isAccessRequestGranted')}> false .
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

async function requestAccessToData() {
  const accessRequestBody = `@prefix interop: <${INTEROP()}> .
    @prefix ldp: <${LDP()}> .
    @prefix skos: <${SKOS()}> .
    @prefix credit: <${CREDIT()}> .
    @prefix xsd: <${XSD()}> .
    @prefix acl: <${ACL()}> .
    @prefix gdprp: <${GDPRP()}> .
    @prefix rdfs: <${RDFS()}> .

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
      skos:prefLabel "Access business analyses (Group)"@en ;
      skos:definition "The bank needs to know your business analyses in order to prepare a suitable loan offer for you"@en .

    <#bwaAccessNeedDescription>
      a interop:AccessNeedDescription ;
      interop:inAccessDescriptionSet <#bwaAccessDescriptionSet> ;
      interop:hasAccessNeed <#bwaAccessNeed> ;
      skos:prefLabel "Access business analyses"@en ;
      skos:definition "The bank needs to know your business analyses in order to prepare a suitable loan offer for you"@en .

    # Goes into the access inbox of sme
    <#bwaAccessRequest>
      a interop:AccessRequest ;
      gdprp:purposeForProcessing gdprp:contractualObligations ;
      interop:fromSocialAgent <${webId!.value}> ;
      interop:toSocialAgent  <${demanderUri.value}> ;
      interop:hasAccessNeedGroup <#bwaAccessNeedGroup> ;

      rdfs:seeAlso <${props.demandUri}>.`;

  const accessRequestUri = await createResource(demanderAccessInboxUri!.value!, accessRequestBody, authFetch.value)
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
  const documentCreationDemandBody = `\
      @prefix schema: <${SCHEMA()}> .
      @prefix credit: <${CREDIT()}> .
      @prefix interop: <${INTEROP()}> .
      <> a schema:Demand ;
      interop:fromSocialAgent <${webId!.value}> ;
      credit:derivedFromDemand <${props.demandUri}> ;
      interop:registeredShapeTree <${selectedShapeTree.value.value}> .
      <${webId!.value}> schema:seeks <> .
    `;
  const documentCreationDemandContainerUris = await getDataRegistrationContainers(demanderUri.value!, documentCreationDemandShapeTreeUri, authFetch.value);
  const documentCreationDemandURI = await createResource(documentCreationDemandContainerUris[0], documentCreationDemandBody, authFetch.value)
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

async function patchDocumentCreationDemandInDemand(demandURI: string, documentCreationDemandURI: string): Promise<Response> {
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
        <> <${CREDIT('hasDocumentCreationDemand')}> <${documentCreationDemandURI}> .
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

async function SetTerminationFlagInOrder(offersForDemand: string[]) {
  const orderURIs = state.orderStore.getSubjects( SCHEMA("acceptedOffer"), offersForDemand[0], null).map(x => x.value);
  return getResource(orderURIs[0], authFetch.value)
      .then((resp) => resp.text())
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
        return putResource(orderURIs[0], body, authFetch.value);
      })
      .then(_ => toast.add({
        severity: "success",
        summary: "Termination set successfully",
        life: 5000,
      }));
}

async function patchOfferInDemand(demandURI: string, offerURI: string): Promise<Response> {
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

  await patchOfferInDemand(demand, offerLocation)

  const offerSelfAcccessRequestLocation = await requestAccessBeingSet(offerLocation, demanderUri.value!)
  await patchBusinessResourceToHaveAccessRequest(offerLocation, offerSelfAcccessRequestLocation + "#accessRequest")
  refreshState(); // update state
  toast.add({
    severity: "success",
    summary: "Offer created successfully",
    life: 5000,
  });
}

async function requestAccessBeingSet(resource: string, forAgent: string) {
  const body = `@prefix interop: <${INTEROP()}> .
    @prefix ldp: <${LDP()}> .
    @prefix skos: <${SKOS()}> .
    @prefix credit: <${CREDIT()}> .
    @prefix xsd: <${XSD()}> .
    @prefix acl: <${ACL()}> .
    @prefix gdprp: <${GDPRP()}> .
    @prefix rdfs: <${RDFS()}> .

    <#accessRequest>
      a interop:AccessRequest ;
      gdprp:purposeForProcessing gdprp:contractualObligations ;
      interop:fromSocialAgent <${webId!.value}> ;
      interop:toSocialAgent  <${webId!.value}> ;
      interop:forSocialAgent <${forAgent}> ;
      interop:hasAccessNeedGroup <#accessNeedGroup> ;
      rdfs:seeAlso <${props.demandUri}>.

    <#accessNeedGroupDescription>
      a interop:AccessNeedGroupDescription ;
      interop:inAccessDescriptionSet <#accessDescriptionSet> ;
      interop:hasAccessNeedGroup <#accessNeedGroup> ;
      skos:prefLabel "Zugriff Offer und Order container"@de ;
      skos:definition "Gib das Angebot frei."@de .

    <#accessNeedGroup>
      a interop:AccessNeedGroup ;
      interop:hasAccessDescriptionSet <#accessDescriptionSet> ;
      interop:accessNecessity interop:accessRequired ;
      interop:accessScenario interop:sharedAccess ;
      interop:authenticatesAs interop:SocialAgent ;
      interop:hasAccessNeed <#accessNeed>, <#accessNeed2> .

    <#accessNeedDescription>
      a interop:AccessNeedDescription ;
      interop:inAccessDescriptionSet <#accessNeedGroupDescription> ;
      interop:hasAccessNeed <#accessNeed> ;
      skos:prefLabel "Zugriff Offer"@de ;
      skos:definition "Gib das Angebot frei."@de .

    <#accessNeed>
      a interop:AccessNeed ;
      interop:accessMode acl:Read ;
      interop:registeredShapeTree <https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOfferTree> ;
      interop:hasDataInstance <${resource}> ;
      interop:accessNecessity interop:accessRequired .

    <#accessNeedDescription2>
      a interop:AccessNeedDescription ;
      interop:inAccessDescriptionSet <#accessNeedGroupDescription> ;
      interop:hasAccessNeed <#accessNeed2> ;
      skos:prefLabel "Zugriff Order"@de ;
      skos:definition "Gib den Order Container frei."@de .

    <#accessNeed2>
      a interop:AccessNeed ;
      interop:accessMode acl:Append, acl:Read ;
      interop:registeredShapeTree <https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOrderTree> ;
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

function handleAuthorizationRequest(inspectedAccessRequestURI: string) {
  console.log(inspectedAccessRequestURI);
  window.open(
      `${authAgent.value}?uri=${encodeURIComponent(
          inspectedAccessRequestURI
      )}&app_redirect=${encodeURIComponent(
          window.location.origin + "/accessRequestHandled"
      )}`,
      "_self"
  );
}

async function handleAuthorizationRequestRedirect(
    businessResourceURI: string,
    accessRequestURI: string
) {
  // patch demand
  return getResource(businessResourceURI, authFetch.value)
      .then((resp) => resp.text())
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
        return putResource(businessResourceURI, body, authFetch.value);
      })
      .then(() => delete appMemory[accessRequestURI]);
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