<template>
  <div v-if="isLoggedIn">
    <!-- Create Demand -->
    <div class="grid">
      <div class="col lg:col-6 lg:col-offset-3">
        <h1>Create Demand</h1>

        <form>
          <div class="grid">
            <span class="align-self-center font-bold">Amount</span>
            <div class="col">
              <InputNumber id="amount" type="number" v-model="enteredAmount"/>
            </div>
          </div>

          <div class="grid">
            <span class="align-self-center font-bold">Currency</span>
            <div class="col">
              <Dropdown v-model="selectedCurrency" :options="currencies" optionLabel="label"
                        placeholder="Select a Currency"/>
            </div>
          </div>

          <Button class="mt-2" @click="postCreditDemand"> Submit demand</Button>
        </form>
      </div>
    </div>

    <div class="grid">
      <div class="col lg:col-6 lg:col-offset-3">
        <h1>
          Demands
          <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
                  @click="loadCreditDemands()"/>
        </h1>

        <ul v-if="demands" class="flex flex-column p-0">
          <li v-for="(demand, index) in demands" :key="JSON.stringify(demand)"
              class="flex flex-wrap align-items-center justify-content-between">
            <hr v-if="index !== 0" class="w-full"/>
            <div class="flex flex-column md:flex-row gap-2 p-3">
              <span> From </span>
              <span style="font-weight: bold">
                <a :href="demand.providerWebID">{{ demand.providerName }} </a> :
              </span>
              <span>{{ demand.amount }} {{ demand.currency }}</span>
              <span v-if="demand.offer && !demand.order?.isTerminated">(interest rate %: {{ demand.offer.interestRate }})</span>
              <span v-if="demand.offer && !demand.order?.isTerminated">(duration: {{ demand.offer.duration }})</span>
              <span v-if="demand.order?.isTerminated">(credit contract terminated)</span>
              <span v-if="!demand.offer">(currently no offer)</span>
            </div>
            <Button v-if="demand.hasAccessRequest &&
              !(demand.isAccessRequestGranted == 'true')
              " type="submit" label="Handle Access Request" icon="pi pi-question" class="p-button-text"
                    @click="handleAuthorizationRequest(demand.hasAccessRequest)"/>
            <Button v-if="demand.offer && !demand.order" type="submit" label="Accept Offer" icon="pi pi-check" class="p-button-text"
                    @click="createOrder(demand.offer.id)"/>
            <Button v-if="demand.documentCreationDemand && !demand.offer" type="submit" label="Request creation of data"
                    icon="pi pi-question" class="p-button-text"
                    @click="postDocumentCreationDemand(demand.documentCreationDemand)"/>
            <Button v-if="demand.order?.isTerminated" type="submit" label="Revoke Rights"
                    icon="pi pi-question" class="p-button-text"
                    @click="handleAuthorizationRequest(demand.hasAccessRequest)"/>
          </li>
        </ul>

        <p v-else>No released demands</p>

        <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 2px"/>
      </div>
    </div>
  </div>
  <span v-else>
    401 Unauthenticated : Login using the button in the top-right corner!
  </span>
  <a class="github-fork-ribbon right-bottom fixed" href="https://github.com/DATEV-Research/Solid-B2B-showcase" data-ribbon="GitHub" title="GitHub">GitHub</a>
</template>

<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {
  useCache,
  useSolidProfile,
  useSolidSession,
} from "@shared/composables";
import {
  createResource,
  CREDIT, getContainerItems,
  getDataRegistrationContainers,
  getLocationHeader,
  getResource,
  INTEROP,
  LDP,
  parseToN3,
  putResource,
  SCHEMA,
  VCARD,
  XSD,
} from "@shared/solid";
import {Ref, computed, ref, toRefs, watch} from "vue";
import {Literal, NamedNode, Quad, Store, Writer} from "n3";

interface Demand {
  providerName: string;
  providerWebID: string;
  amount: number;
  currency: string;
  offer?: Offer;
  order?: Order;
  hasAccessRequest: string;
  isAccessRequestGranted: string;
  documentCreationDemand: string;
}

interface Offer {
  id: string;
  interestRate: number;
  duration: string;
}

interface Order {
  id: string;
  isTerminated: boolean;
}

const bank = ref("https://bank.solid.aifb.kit.edu/profile/card#me");
const tax = ref("https://tax.solid.aifb.kit.edu/profile/card#me");

const documentCreationDemandShapeTreeUri = "https://solid.aifb.kit.edu/shapes/mandat/document.tree#documentCreationDemandTree";
const creditDemandShapeTreeUri = "https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree";
const orderShapeTreeUri = "https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOrderTree";

const orderContainer = "https://bank.solid.aifb.kit.edu/credits/orders/";

const toast = useToast();
const {session} = useSolidSession();

const { memberOf } = useSolidProfile()
const isLoggedIn = computed(() => {
  return ((session.webId && !memberOf) || (session.webId && memberOf && session.rdp) ? true : false)
})
const {storage, authAgent} = useSolidProfile();
const appMemory = useCache();

const demands = ref([]) as Ref<Demand[]>;
const selectedCurrency = ref();
const enteredAmount = ref(0);
const form = ref();

const currencies = [
  {label: "EUR", value: "EUR"},
  {label: "USD", value: "USD"},
];

let isLoading = ref(false);

watch(() => storage.value, function () {
  if (!storage.value) return;
  loadCreditDemands();
}, {immediate:true});

async function loadCreditDemands() {
  isLoading.value = true;
  demands.value = [];

  const creditDemandContainerUris = await getDataRegistrationContainers(
      bank.value,
      creditDemandShapeTreeUri,
      session
  );

  const creditDemandContainerStore = await getCreditDemandContainerStore(
      creditDemandContainerUris
  );

  const orderContainerUris = await getDataRegistrationContainers(
      bank.value,
      orderShapeTreeUri,
      session
  );

  let orderItemsStore : Store = new Store();
  const orderItems = (await Promise.all(orderContainerUris.map(orderContainer => getContainerItems(orderContainer)))).flat()
  await fillItemStoresIntoStore(orderItems, orderItemsStore)

  const allDemands = creditDemandContainerStore.getObjects(
      null,
      LDP("contains"),
      null
  );
  for (let demand of allDemands) {
    try {
      const demandStore = await getCreditDemandStore(demand);

      const demandOffers = demandStore.getObjects(
          null,
          CREDIT("hasOffer"),
          null
      );
      const accessRequestURI = demandStore.getObjects(
          null,
          CREDIT("hasAccessRequest"),
          null
      )[0]?.value;
      let isAccessRequestGranted = "false";
      if (accessRequestURI) {
        isAccessRequestGranted = demandStore.getObjects(
            null,
            CREDIT("isAccessRequestGranted"),
            null
        )[0]?.value;
      }
      const documentCreationDemandURI = demandStore.getObjects(
          null,
          CREDIT("hasDocumentCreationDemand"),
          null
      )[0]?.value;
      if (appMemory[accessRequestURI]) {
        return handleAuthorizationRequestRedirect(
            demand.id,
            accessRequestURI
        ).then(() => {
          demands.value = [];
          loadCreditDemands();
        });
      }
      const amount = demandStore.getObjects(null, SCHEMA("amount"), null)[0];
      const currency = demandStore.getObjects(
          null,
          SCHEMA("currency"),
          null
      )[0];
      const profileCard = await getprofileCard(bank.value);
      const bankname = profileCard.getObjects(bank.value, VCARD("fn"), null)[0]
          .value;



      const demandObject = {
        hasAccessRequest: accessRequestURI,
        isAccessRequestGranted,
        providerName: bankname,
        providerWebID: bank.value,
        amount: parseFloat(amount.value),
        currency: currency.value,
        documentCreationDemand: documentCreationDemandURI
      } as any // you caught me. 
      if (demandOffers.length > 0) {
        try {
          // Offer
          const offerStore = await getOfferStore(demandOffers);

          const interestRate = offerStore.getObjects(
              null,
              SCHEMA("annualPercentageRate"),
              null
          )[0];

          const duration = offerStore.getObjects(
              demandOffers[0].value + "#duration",
              SCHEMA("value"),
              null
          )[0];

          demandObject['offer'] =
              {
                id: demandOffers[0].id,
                interestRate: parseFloat(interestRate.value),
                duration: duration.value,
              }

          // Get order
          const orderURI = orderItemsStore.getSubjects(SCHEMA("acceptedOffer"), demandOffers[0].value, null).map(t => t.value)[0];
          const isTerminated = (orderItemsStore.getObjects(orderURI, CREDIT("isTerminated"), null).map(t => t.value)[0] !== undefined);

          if (orderURI) {
            demandObject['order'] =
                {
                  id: orderURI,
                  isTerminated: isTerminated
                }
          }
        } catch (e) {
          console.error(e)
        }
      }
      demands.value.push(demandObject);
    } catch (e) {
      console.error(e)
    }
  }
  isLoading.value = false;
}

const postCreditDemand = async () => {
  try {
    // Create demand resource
    const payload = `\
      @prefix schema: <${SCHEMA()}> .
      @prefix : <${CREDIT()}> .

      <> a schema:Demand ;
        schema:itemOffered [
          a schema:LoanOrCredit ;
            schema:amount ${enteredAmount.value} ;
            schema:currency "${selectedCurrency.value.value}"
        ] .

      <${memberOf.value}> schema:seeks <> .
    `;

    const demandContainerUris = await getContainerUris(
        bank.value,
        creditDemandShapeTreeUri
    );

    await createDemand(demandContainerUris, payload);

    // Success Message \o/
    toast.add({
      severity: "success",
      summary: "Demand created sucessfully",
      life: 5000,
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error creating Demand!",
      detail: err,
      life: 5000,
    });
  }
};

async function postDocumentCreationDemand(documentCreationDemandURI: string) {
  const documentCreationDemandStore = await getResource(documentCreationDemandURI, session)
      .then((resp) => resp.data)
      .then((txt) => parseToN3(txt, documentCreationDemandURI))
      .then((parsedN3) => parsedN3.store);

  const requestedShapeTree = documentCreationDemandStore.getObjects(
      null,
      INTEROP("registeredShapeTree"),
      null
  )[0]?.value;

  const documentCreationDemandPayload = `\
      @prefix schema: <${SCHEMA()}> .
      @prefix interop: <${INTEROP()}> .
      <> a schema:Demand ;
      interop:fromSocialAgent <${memberOf.value}> ;
      interop:registeredShapeTree <${requestedShapeTree}> .
      <${memberOf.value}> schema:seeks <> .
    `;
  const documentCreationDemandContainerUris = await getContainerUris(
      tax.value,
      documentCreationDemandShapeTreeUri
  );
  await createDemand(documentCreationDemandContainerUris, documentCreationDemandPayload);
  toast.add({
    severity: "success",
    summary: "Request for data creation sent.",
    life: 5000,
  });
}

async function getCreditDemandContainerStore(demandContainerUris: Array<string>) {
  return await getResource(demandContainerUris[0], session)
      .then((resp) => resp.data)
      .then((txt) => parseToN3(txt, demandContainerUris[0]))
      .then((parsedN3) => parsedN3.store)
      .catch((err) => {
        isLoading.value = false;
        throw err;
      });
}

async function getCreditDemandStore(demand: any) {
  return await getResource(demand.id, session)
      .then((resp) => resp.data)
      .then((txt) => parseToN3(txt, demand.id))
      .then((parsedN3) => parsedN3.store);
}

async function getOfferStore(demandOffers: Array<Quad["object"]>) {
  return await getResource(demandOffers[0].id, session)
      .then((resp) => resp.data)
      .then((txt) => parseToN3(txt, demandOffers[0].id))
      .then((parsedN3) => parsedN3.store);
}

const createOrder = async (offerId: String) => {
  const payload = `\
      @prefix schema: <${SCHEMA()}> .

      <> schema:acceptedOffer <${offerId}> .
    `;

  await createResource(orderContainer, payload, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on create!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then(() => {
        toast.add({
          severity: "success",
          summary: "Order created sucessfully",
          life: 5000,
        });
      });
};

async function getprofileCard(webId: string) {
  return await getResource(webId, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on getting profile Card!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.data)
      .then((txt) => parseToN3(txt, webId))
      .then((parsedN3) => parsedN3.store);
}

async function getContainerUris(webId: string, shapeTreeUri: string) {
  return await getDataRegistrationContainers(
      webId,
      shapeTreeUri,
      session
  ).catch((err) => {
    toast.add({
      severity: "error",
      summary: "Error on getDataRegistrationContainers!",
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  });
}

async function fillItemStoresIntoStore(itemUris: string[], store: Store) {
  const itemStores: Store[] = await Promise.all(
      itemUris.map((item) => fetchStoreOf(item))
  )
  itemStores
      .map(itemStore => itemStore.getQuads(null, null, null, null))
      .map((quads) => store.addQuads(quads))
}

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

async function createDemand(demandContainerUris: Array<string>, payload: string) {
  return await createResource(demandContainerUris[0], payload, session)
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

function handleAuthorizationRequest(inspectedAccessRequestURI: string) {
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
    demandUri: string,
    accessRequestURI: string
) {
  // patch demand
  return getResource(demandUri, session)
      .then((resp) => resp.data)
      .then((txt) => parseToN3(txt, demandUri))
      .then((parsedN3) => {
        parsedN3.store.removeQuads(
            parsedN3.store.getQuads(
                new NamedNode(demandUri),
                new NamedNode(CREDIT("isAccessRequestGranted")),
                null,
                null
            )
        );
        parsedN3.store.addQuad(
            new NamedNode(demandUri),
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
        return putResource(demandUri, body, session);
      })
      .then(() => delete appMemory[accessRequestURI]);
}
</script>

<style scoped>
hr {
  border: 1px solid var(--surface-d);
}
</style>
