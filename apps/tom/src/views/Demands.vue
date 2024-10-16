<script setup lang="ts">

import {useIsLoggedIn} from "@/composables/useIsLoggedIn";
import {
  bank,
  creditDemandShapeTreeUri,
  documentCreationDemandShapeTreeUri,
  orderContainer,
  orderShapeTreeUri,
  tax
} from "@/constants/solid-urls";
import {Demand} from "@/types/Demand";
import {useCache, useSolidProfile, useSolidSession,} from "@shared/composables";
import {
  createResource,
  CREDIT,
  getContainerItems,
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
import {fetchStoreOf, getContainerUris} from "@shared/utils";
import {Literal, NamedNode, Store, Writer} from "n3";
import {useToast} from "primevue/usetoast";
import {ref, watch} from "vue";

const toast = useToast();
const {session} = useSolidSession();
const {memberOf, storage, authAgent} = useSolidProfile();
const appMemory = useCache();
const { isLoggedIn } = useIsLoggedIn();

const demands = ref<Demand[]>([]);
const isLoading = ref(false);

watch(storage, () => {
  if (!storage.value) return;
  loadCreditDemands();
}, {immediate:true});

async function loadCreditDemands() {
  isLoading.value = true;
  demands.value = [];

  const creditDemandContainerUris = await getDataRegistrationContainers(
      bank,
      creditDemandShapeTreeUri,
      session
  );

  const creditDemandContainerStore = await fetchStoreOf(creditDemandContainerUris[0], session);

  const orderContainerUris = await getDataRegistrationContainers(
      bank,
      orderShapeTreeUri,
      session
  );

  let orderItemsStore : Store = new Store();
  const orderItems = (await Promise.all(orderContainerUris.map(orderContainer => getContainerItems(orderContainer, session)))).flat()
  await fillItemStoresIntoStore(orderItems, orderItemsStore)

  const allDemands = creditDemandContainerStore.getObjects(
      null,
      LDP("contains"),
      null
  );
  for (let demand of allDemands) {
    try {
      const demandStore = await fetchStoreOf(demand.id, session);
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
        )[0]?.value as string;
      }
      const documentCreationDemandURI = demandStore.getObjects(
          null,
          CREDIT("hasDocumentCreationDemand"),
          null
      )[0]?.value;
      if (accessRequestURI && appMemory[accessRequestURI]) {
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
      const profileCard = await fetchStoreOf(bank, session);
      const bankname = profileCard.getObjects(bank, VCARD("fn"), null)[0].value;

      const demandObject = {
        hasAccessRequest: accessRequestURI,
        isAccessRequestGranted,
        providerName: bankname,
        providerWebID: bank,
        amount: parseFloat(amount.value),
        currency: currency.value,
        documentCreationDemand: documentCreationDemandURI
      } as any // you caught me.
      if (demandOffers.length > 0) {
        try {
          // Offer
          const offerStore = await fetchStoreOf(demandOffers[0].id, session);

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

async function postDocumentCreationDemand(documentCreationDemandURI: string) {
  const documentCreationDemandStore = await fetchStoreOf(documentCreationDemandURI, session);

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
      documentCreationDemandShapeTreeUri,
      session
  );
  await createDemand(documentCreationDemandContainerUris, documentCreationDemandPayload);
  toast.add({
    severity: "success",
    summary: "Request for data creation sent.",
    life: 5000,
  });
}


async function fillItemStoresIntoStore(itemUris: string[], store: Store) {
  const itemStores: Store[] = await Promise.all(
      itemUris.map((item) => fetchStoreOf(item, session))
  )
  itemStores
      .map(itemStore => itemStore.getQuads(null, null, null, null))
      .map((quads) => store.addQuads(quads))
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
        const {store, prefixes} = parsedN3;
        const {addQuad, getQuads, removeQuads} = store;

        removeQuads(
            getQuads(
                new NamedNode(demandUri),
                new NamedNode(CREDIT("isAccessRequestGranted")),
                null,
                null
            )
        );

        addQuad(
            new NamedNode(demandUri),
            new NamedNode(CREDIT("isAccessRequestGranted")),
            new Literal(`"true"^^${XSD("boolean")}`)
        );
        const writer = new Writer({
          format: "text/turtle",
          prefixes,
        });
        writer.addQuads(getQuads(null, null, null, null));
        let body = "";
        writer.end((error, result) => (body = result));
        return body;
      })
      .then((body) => {
        return putResource(demandUri, body, session);
      })
      .then(() => delete appMemory[accessRequestURI]);
}


async function createDemand(demandContainerUris: string[], payload: string) {
  return await createResource(demandContainerUris[0], payload, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on createDemand!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((res) => getLocationHeader(res));
}

const createOrder = async (offerId?: string) => {
  if (!offerId) { return; }

  const payload = `\
      @prefix schema: <${SCHEMA()}> .

      <> schema:acceptedOffer <${offerId}> .
    `;

  await createResource(orderContainer, payload, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on createOrder!",
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
</script>

<template>
  <div v-if="isLoggedIn">
    <div class="grid">
      <div class="col lg:col-6 lg:col-offset-3">
        <h1>
          Demands
          <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
                  @click="loadCreditDemands()" />
        </h1>

        <ul v-if="demands" class="flex flex-column p-0">
          <li v-for="(demand, index) in demands" :key="JSON.stringify(demand)"
              class="flex flex-wrap align-items-center justify-content-between">
            <hr v-if="index !== 0" class="w-full" />
            <div class="flex flex-column md:flex-row gap-2 p-3">
              <span> From </span>
              <span style="font-weight: bold">
                <a :href="demand.providerWebID">{{ demand.providerName }} </a> :
              </span>
              <span>{{ demand.amount }} {{ demand.currency }}</span>
              <span v-if="demand.offer && !demand.order?.isTerminated">(interest rate %: {{ demand.offer.interestRate
                }})</span>
              <span v-if="demand.offer && !demand.order?.isTerminated">(duration: {{ demand.offer.duration }})</span>
              <span v-if="demand.order?.isTerminated">(credit contract terminated)</span>
              <span v-if="!demand.offer">(currently no offer)</span>
            </div>
            <Button v-if="demand.hasAccessRequest &&
              !(demand.isAccessRequestGranted == 'true')
              " type="submit" :label="'Handle Access Request'" icon="pi pi-question" class="p-button-text"
                    @click="handleAuthorizationRequest(demand.hasAccessRequest)" />
            <Button v-if="demand.offer && !demand.order" type="submit" label="Accept Offer" icon="pi pi-check"
                    class="p-button-text" @click="createOrder(demand.offer?.id)" />
            <Button v-if="demand.documentCreationDemand && !demand.offer" type="submit" label="Request creation of data"
                    icon="pi pi-question" class="p-button-text"
                    @click="postDocumentCreationDemand(demand.documentCreationDemand)" />
            <Button v-if="demand.order?.isTerminated" type="submit" label="Revoke Rights" icon="pi pi-question"
                    class="p-button-text" @click="handleAuthorizationRequest(demand.hasAccessRequest)" />
          </li>
        </ul>

        <p v-else>No released demands</p>

        <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 2px" />
      </div>
    </div>
  </div>
  <span v-else>
    401 Unauthenticated : Login using the button in the top-right corner!
  </span>
</template>

<style scoped>

</style>
