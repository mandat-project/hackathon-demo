<script setup lang="ts">

import {
  bank,
  creditDemandShapeTreeUri,
  documentCreationDemandShapeTreeUri,
  orderContainer,
  orderShapeTreeUri,
  tax
} from "@/constants/solid-urls";
import router from "@/router";
import {Demand} from "@/types/Demand";
import {getDataRegistrationContainers} from "@datev-research/mandat-shared-solid-interop";
import {
  createResource,
  CREDIT,
  getContainerItems, getLocationHeader,
  getResource,
  INTEROP,
  LDP, parseToN3, putResource,
  SCHEMA,
  VCARD, XSD
} from "@datev-research/mandat-shared-solid-requests";
import {toRef, watchThrottled} from "@vueuse/core";
import {HorizontalLine, PageHeadline} from "@datev-research/mandat-shared-components";
import {useCache, useIsLoggedIn, useSolidProfile, useSolidSession} from "@datev-research/mandat-shared-composables";
import {fetchStoreOf, getContainerUris} from "@datev-research/mandat-shared-utils";
import {Literal, NamedNode, Store, Writer} from "n3";
import {useToast} from "primevue/usetoast";
import {computed, ref, watch} from "vue";
import {useRoute} from "vue-router";

const route = useRoute();
const toast = useToast();
const {session} = useSolidSession();
const {memberOf, storage, authAgent} = useSolidProfile();
const appMemory = useCache();
const { isLoggedIn } = useIsLoggedIn();

const props = defineProps<{ type?: 'all' | 'pending' | 'active'; }>();

const highlightAmountValue = toRef<number | null>(() => {
  const value = route.query.amount;
  if (!value) { return null; }
  const amountNumber = Number(value);
  if (isNaN(amountNumber)) { return null; }
  return amountNumber;
});

const demands = ref<Demand[]>([]);
const sortedDemands = computed<Demand[]>(() => {
  return [...demands.value].sort((a, b) => {
    const accessRequestOfA = a.hasAccessRequest && a.isAccessRequestGranted !== 'true';
    const documentCreationDemandOfA = a.documentCreationDemand && !a.offer;
    const accessRequestOfB = b.hasAccessRequest && b.isAccessRequestGranted !== 'true';
    const documentCreationDemandOfB = b.documentCreationDemand && !b.offer;

    if (a.order && !b.order) { return -1; }
    if (b.order && !a.order) { return 1; }

    if (a.offer && !b.offer) { return -1; }
    if (b.offer && !a.offer) { return 1; }

    if (documentCreationDemandOfA && !documentCreationDemandOfB) { return -1; }
    if (documentCreationDemandOfB && !documentCreationDemandOfA) { return 1; }

    if (accessRequestOfA && !accessRequestOfB) { return -1; }
    if (accessRequestOfB && !accessRequestOfA) { return 1; }

    if (a.order && b.order) {
      if (a.order.isTerminated && !b.order.isTerminated) { return 1; }
      if (b.order.isTerminated && !a.order.isTerminated) { return -1; }
    }

    return b.amount - a.amount;
  });
});
const displayedDemands = computed<Demand[]>(() => {
  if (props.type === 'pending') {
    return sortedDemands.value.filter(demand => !demand.order?.isTerminated && (!demand.order || !demand.offer));
  }
  if (props.type === 'active') {
    return sortedDemands.value.filter(demand => demand.order);
  }
  return sortedDemands.value;
});
const isLoading = ref(false);

watch(storage, () => {
  if (!storage.value) return;
  loadCreditDemands();
}, {immediate:true});

watchThrottled(
    displayedDemands,
    () => {
      if (!highlightAmountValue.value || displayedDemands.value.length < 5) {
        return;
      }

      const highlightElement = document.querySelector<HTMLElement>(`.amount-${highlightAmountValue.value}`);
      if (!highlightElement) {
        return;
      }

      highlightElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    },
  { throttle: 1_000 },)

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
        id: demand.id,
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
      tax,
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

const createOrder = async (amount: number, offerId?: string) => {
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
      })
      .then(() => {
        // Don't wait to be finished before rerouting. It's the same component, so it will just update the
        // view and the demands.
        loadCreditDemands();
        router.push({name:'services', query: { amount }});
      });
};

function handleAuthorizationRequest(inspectedAccessRequestURI: string) {
  const authAppURI = authAgent.value;
  const requestUri = encodeURIComponent(inspectedAccessRequestURI);
  const redirectUri = encodeURIComponent(window.location.origin + "/accessRequestHandled");
  const cssTheme = encodeURIComponent(window.location.origin + "/auth.css");

  const queries = {
    uri: requestUri,
    app_redirect: redirectUri,
    css: cssTheme,
  };
  const redirectUrl = `${authAppURI}?${Object.entries(queries).map(group => group.join("=")).join("&")}`;

  window.open(
      redirectUrl,
      "_self"
  );
}
</script>

<template>
  <PageHeadline class="gap-2 flex align-items-center">
    <span v-if="type === 'pending'">Current Loan Demands</span>
    <span v-if="type === 'active'">Active Loans</span>
    <span v-if="type === 'all'">Loans</span>
    <Badge class="relative -top-1rem bg-gray-100" :value="displayedDemands.length" />
    <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
            @click="loadCreditDemands" />
  </PageHeadline>

  <ProgressBar v-show="isLoading" mode="indeterminate" style="height: 2px" />

  <div role="list" v-if="displayedDemands" class="flex flex-column gap-3 py-0 px-3">
    <Card :class="{'highlight' : highlightAmountValue === demand.amount, ['amount-'+demand.amount]: true }"
          role="listitem" v-for="demand in displayedDemands" :key="demand.id" :data-demand-id="demand.id">
      <template #title>
        <a class="font-normal text-black-alpha-90 no-underline" :href="demand.providerWebID">{{ demand.providerName }}</a>
      </template>
      <template #content>

        <p class="text-xs">Amount: </p>
        <strong>{{ Number(demand.amount).toLocaleString() }} {{ demand.currency }}</strong>

        <HorizontalLine />
      </template>
      <template #footer>

        <div class="flex flex-column md:flex-row gap-2 md:align-items-center" v-if="demand.hasAccessRequest && demand.isAccessRequestGranted !== 'true'">
          <div><Chip
              label="Data Required"
              class="bg-red-500 text-white text-sm"
          /></div>
          <span>Please provide additional information to continue.</span>
          <Button class="md:ml-auto" severity="primary" :label="'Handle Access Request'"
                  @click="handleAuthorizationRequest(demand.hasAccessRequest)" />
        </div>

        <div class="flex flex-column md:flex-row gap-2 md:align-items-center" v-else-if="demand.offer && !demand.order">
          <div><Chip
              label="Pending"
              class="text-sm"
          /></div>
          <span>interest rate %: {{demand.offer.interestRate}} duration: {{ demand.offer.duration }}</span>
          <Button class="md:ml-auto" severity="primary" label="Accept Offer"
                  @click="createOrder(demand.amount, demand.offer?.id)" />
        </div>

        <div class="flex flex-column md:flex-row gap-2 md:align-items-center" v-else-if="demand.documentCreationDemand && !demand.offer">
          <div><Chip
              label="New Data Required"
              class="bg-red-500 text-white text-sm"
          /></div>
          <span>Your information is outdated.</span>
          <Button class="md:ml-auto" severity="primary" label="Request creation of data"
                  @click="postDocumentCreationDemand(demand.documentCreationDemand)" />
        </div>

        <div class="flex flex-column md:flex-row gap-2 md:align-items-center" v-else-if="demand.order?.isTerminated">
          <div><Chip
              label="Terminated"
              class="bg-red-500 text-white text-sm"
          /></div>
          <span>credit contract terminated</span>
          <Button class="md:ml-auto" severity="secondary" label="Revoke Rights"
                  @click="handleAuthorizationRequest(demand.hasAccessRequest)" />
        </div>

        <div class="flex flex-column md:flex-row gap-2 md:align-items-center" v-else-if="demand.offer && demand.order">
          <div><Chip
              label="Active"
              class="bg-green-300 text-sm"
          /></div>
          <span>interest rate %: {{demand.offer.interestRate}} duration: {{ demand.offer.duration }}</span>

        </div>

        <div class="flex flex-column md:flex-row gap-2 md:align-items-center" v-else>
          <div><Chip
              label="Pending"
              class="text-sm"
          /></div>
          <span>currently no offer</span>
        </div>
      </template>
    </Card>
  </div>

  <p v-else>No released demands</p>

  <div v-if="isLoading" class="relative flex flex-column gap-3 py-0 mt-3 px-3">
    <Card v-for="index in 5" :key="index" class="h-15rem">
      <template #content>
        <Skeleton width="10rem" class="mb-2" />
        <Skeleton width="5rem" class="mb-2" />
        <Skeleton class="mb-2" />
        <Skeleton width="2rem" class="mb-2" />
      </template>
    </Card>
  </div>
</template>

<style scoped>
.-top-1rem {
  top: -1rem;
}
 .p-card :deep(.p-card-content) {
   padding-top: 0;
   padding-bottom: 0;
 }
.p-card :deep(.p-card-footer) {
  padding-top: 0;
}
.highlight{
  border: 2px solid rgba(182,202,209,1);
  background: rgba(246,247,249,1);
}
</style>
