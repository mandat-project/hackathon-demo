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
              <InputText id="amount" type="number" v-model="enteredAmount"/>
            </div>
          </div>

          <div class="grid">
            <span class="align-self-center font-bold">Currency</span>
            <div class="col">
              <Dropdown
                  v-model="selectedCurrency"
                  :options="currencies"
                  optionLabel="label"
                  placeholder="Select a Currency"
              />
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
          <Button
              icon="pi pi-refresh"
              class="p-button-text p-button-rounded p-button-icon-only"
              @click="loadCreditDemands()"
          />
        </h1>

        <ul v-if="demands" class="flex flex-column p-0">
          <li
              v-for="(demand, index) in demands"
              :key="demand"
              class="flex flex-wrap align-items-center justify-content-between"
          >
            <hr v-if="index !== 0" class="w-full"/>
            <div class="flex flex-column md:flex-row gap-2 p-3">
              <span> From </span>
              <span style="font-weight: bold">
                <a :href="demand.providerWebID">{{ demand.providerName }} </a> :
              </span>
              <span>{{ demand.amount }} {{ demand.currency }}</span>
              <span v-if="demand.offer"
              >(interest rate %: {{ demand.offer.interestRate }})</span
              >
              <span v-if="demand.offer"
              >(duration: {{ demand.offer.duration }})</span
              >
              <span v-else>(currently no offer)</span>
            </div>
            <Button
                v-if="demand.hasAccessRequest && !(demand.isAccessRequestGranted=='true')"
                type="submit"
                label="Handle Access Request"
                icon="pi pi-question"
                class="p-button-text"
                @click="handleAuthorizationRequest(demand.hasAccessRequest)"
            />
            <Button
                v-if="demand.offer"
                type="submit"
                label="Accept Offer"
                icon="pi pi-check"
                class="p-button-text"
                @click="createOrder(demand.offer.id)"
            />
          </li>
        </ul>

        <p v-else>No released demands</p>

        <ProgressBar
            v-if="isLoading"
            mode="indeterminate"
            style="height: 2px"
        />
      </div>
    </div>
  </div>
  <span v-else>
    401 Unauthenticated : Login using the button in the top-right corner!
  </span>
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
  CREDIT,
  getDataRegistrationContainers,
  getLocationHeader,
  getResource, INTEROP,
  LDP,
  parseToN3,
  putResource,
  SCHEMA,
  VCARD,
  XSD,
} from "@shared/solid";
import {Ref, ref, toRefs, watch} from "vue";
import {Literal, NamedNode, Quad, Writer} from "n3";

interface Demand {
  providerName: string;
  providerWebID: string;
  amount: number;
  currency: string;
  offer?: Offer;
  hasAccessRequest: string;
  isAccessRequestGranted: string;
}

interface Offer {
  id: string;
  interestRate: number;
  duration: string;
}

const bank = ref("https://bank.solid.aifb.kit.edu/profile/card#me");
const tax = ref("https://tax.solid.aifb.kit.edu/profile/card#me");

const businessAssessmentShapeTreeUri = "https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#businessAssessmentTree";
const documentDemandShapeTreeUri = "https://solid.aifb.kit.edu/shapes/mandat/document.tree#documentDemandTree";
const creditDemandShapeTreeUri =
    "https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree";
const orderContainer = "https://bank.solid.aifb.kit.edu/credits/orders/";

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();

const {webId} = toRefs(sessionInfo);
const {isLoggedIn} = toRefs(sessionInfo);
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

watch(storage, function () {
  if (!storage.value) return;
  loadCreditDemands();
});

async function loadCreditDemands() {
  isLoading.value = true;

  demands.value = [];

  const demandContainerUris = await getDataRegistrationContainers(
      bank.value,
      creditDemandShapeTreeUri,
      authFetch.value
  );

  const demandContainerStore = await getCreditDemandContainerStore(
      demandContainerUris
  );

  const allDemands = demandContainerStore.getObjects(
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
      )[0].value;
      let isAccessRequestGranted = 'false';
      if (accessRequestURI) {
        isAccessRequestGranted = demandStore.getObjects(
            null,
            CREDIT("isAccessRequestGranted"),
            null
        )[0].value;
      }
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

      if (demandOffers.length > 0) {
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

        demands.value.push({
          hasAccessRequest: accessRequestURI,
          isAccessRequestGranted,
          providerName: bankname,
          providerWebID: bank.value,
          amount: parseFloat(amount.value),
          currency: currency.value,
          offer: {
            id: demandOffers[0].id,
            interestRate: parseFloat(interestRate.value),
            duration: duration.value,
          },
        });
      } else {
        demands.value.push({
          hasAccessRequest: accessRequestURI,
          isAccessRequestGranted,
          providerName: bankname,
          providerWebID: bank.value,
          amount: parseFloat(amount.value),
          currency: currency.value,
        });
      }
    } catch (e) {
    }
  }
  isLoading.value = false;
}

const postCreditDemand = async () => {
  try {
    // Create demand resource
    const payload = createCreditDemandPayload();

    const demandContainerUris = await getContainerUris(
        bank.value,
        creditDemandShapeTreeUri
    );

    const demand = await createDemand(demandContainerUris, payload);

    // Send LDN to bank about new demand
    sendLDNtoBank(demand);

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

// TODO: provided function to be called via UI
async function postDocumentDemand() {
  const documentDemandPayload = createDocumentDemandPayload();
  const documentDemandContainerUris = await getContainerUris(
      tax.value,
      documentDemandShapeTreeUri
  );

  await createDemand(documentDemandContainerUris, documentDemandPayload);
}

function createDocumentDemandPayload() {
  // TODO: replace hardcoded businessAssessmentShapeTreeUri with businessAssessmentShapeTreeUri from underlying demand
  return `\
      @prefix schema: <${SCHEMA()}> .
      @prefix interop: <${INTEROP()}> .

      <> a schema:Demand ;
      interop:fromSocialAgent <${webId!.value}> ;
      interop:registeredShapeTree <${businessAssessmentShapeTreeUri}> .

      <${webId?.value}> schema:seeks <> .
    `;
}

async function getCreditDemandContainerStore(demandContainerUris: Array<string>) {
  return await getResource(demandContainerUris[0], authFetch.value)
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, demandContainerUris[0]))
      .then((parsedN3) => parsedN3.store)
      .catch((err) => {
        isLoading.value = false;
        throw err;
      });
}

async function getCreditDemandStore(demand: any) {
  return await getResource(demand.id, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on get!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, demand.id))
      .then((parsedN3) => parsedN3.store);
}

async function getOfferStore(demandOffers: Array<Quad["object"]>) {
  return await getResource(demandOffers[0].id, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on get!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, demandOffers[0].id))
      .then((parsedN3) => parsedN3.store);
}

const createOrder = async (offerId: String) => {
  const payload = `\
      @prefix schema: <${SCHEMA()}> .

      <> schema:acceptedOffer <${offerId}> .
    `;

  await createResource(orderContainer, payload, authFetch.value)
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
  return await getResource(webId, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on getting profile Card!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, webId))
      .then((parsedN3) => parsedN3.store);
}

async function getContainerUris(webId: string, shapeTreeUri: string) {
  return await getDataRegistrationContainers(
      webId,
      shapeTreeUri,
      authFetch.value
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

async function createDemand(
    demandContainerUris: Array<string>,
    payload: string
) {
  return await createResource(demandContainerUris[0], payload, authFetch.value)
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

function sendLDNtoBank(demand: string) {
  createResource(
      "https://bank.solid.aifb.kit.edu/inbox/",
      `<${webId?.value}> <${SCHEMA("seeks")}> <${demand}> .`,
      authFetch.value
  ).catch((err) => {
    toast.add({
      severity: "error",
      summary: "Error on create!",
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  });
}

function createCreditDemandPayload() {
  return `\
      @prefix schema: <${SCHEMA()}> .
      @prefix : <${CREDIT()}> .

      <> a schema:Demand ;
        schema:itemOffered [
          a schema:LoanOrCredit ;
            schema:amount ${enteredAmount.value} ;
            schema:currency "${selectedCurrency.value.value}"
        ] .

      <${webId?.value}> schema:seeks <> .
    `;
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
  return getResource(demandUri, authFetch.value)
      .then((resp) => resp.text())
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
        return putResource(demandUri, body, authFetch.value);
      })
      .then(() => delete appMemory[accessRequestURI]);
}
</script>

<style scoped>
hr {
  border: 1px solid var(--surface-d);
}
</style>
