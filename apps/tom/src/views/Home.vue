<template>

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
            <Dropdown v-model="selectedCurrency" :options="currencies" optionLabel="label"
                      placeholder="Select a Currency"/>
          </div>
        </div>

        <Button class="mt-2" type="submit" @click="postDemand"> Submit demand</Button>

      </form>

    </div>
  </div>

  <!-- Offers -->
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">

      <h1>
        Offers
        <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only" @click="loadDemands()"/>
      </h1>

      <ul v-if="demands" class="flex flex-column p-0">
        <li v-for="(demand, index) in demands" :key="demand" class="flex flex-wrap align-items-center justify-content-between">
          <hr v-if="index !== 0" class="w-full"/>

          <div class="flex flex-column md:flex-row gap-2 p-3">
            <span>{{ demand.amount }} {{ demand.currency }}</span>

            <span v-if="demand.offer">({{ demand.offer.interestRate }} % interest rate)</span>
            <span v-else>(no offer)</span>
          </div>
          <Button v-if="demand.offer"
                  type="submit"
                  label="Accept Offer"
                  icon="pi pi-check"
                  class="p-button-text"
                  @click="createOrder(demand.offer.id)"/>
        </li>
      </ul>

      <p v-else>No released demands</p>

      <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 2px"/>

    </div>
  </div>
</template>

<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {useSolidProfile, useSolidSession} from "@shared/composables";
import {
  ACL,
  createResource,
  CREDIT,
  getDataRegistrationContainers,
  getLocationHeader,
  getResource,
  parseToN3,
  putResource,
  SCHEMA
} from "@shared/solid";
import {Ref, ref, toRefs, watch} from "vue";
import {DataFactory} from "n3";
import * as url from "url";

interface Demand {
  amount: number,
  currency: string,
  offer?: Offer
}

interface Offer {
  id: string,
  interestRate: number
}

const bank = ref("https://bank.solid.aifb.kit.edu/profile/card#me");
const tax = ref("https://tax.solid.aifb.kit.edu/profile/card#me");

const demandShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree';

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const {webId} = toRefs(sessionInfo);
const demands = ref([]) as Ref<Demand[]>;
const {storage} = useSolidProfile()

let isLoading = ref(false);

async function loadDemands() {
  isLoading.value = true;
  demands.value = [];

  const demandContainerUris = await getDataRegistrationContainers(webId!.value!, demandShapeTreeUri, authFetch.value);

  const store = await getResource(demandContainerUris[0], authFetch.value)
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, demandContainerUris[0]))
      .then((parsedN3) => parsedN3.store)
      .catch(err => {
        isLoading.value = false
        throw err;
      });

  const allDemands = store.getObjects(DataFactory.namedNode(webId!.value!),
      CREDIT('hasDemand'), null);

  for (let demand of allDemands) {
    try {
      const demandStore = await getResource(demand.id, authFetch.value)
          .then((resp) => resp.text())
          .then((txt) => parseToN3(txt, demand.id))
          .then((parsedN3) => parsedN3.store);

      const demandOffers = demandStore.getObjects(null, CREDIT('hasOffer'), null);

      const amount = demandStore.getObjects(null, SCHEMA('amount'), null)[0];
      const currency = demandStore.getObjects(null, SCHEMA('currency'), null)[0];

      if (demandOffers.length > 0) {
        const offerStore = await getResource(demandOffers[0].id, authFetch.value)
            .then((resp) => resp.text())
            .then((txt) => parseToN3(txt, demandOffers[0].id))
            .then((parsedN3) => parsedN3.store);
        const interestRate = offerStore.getObjects(null, SCHEMA('annualPercentageRate'), null)[0];

        demands.value.push({
          amount: parseFloat(amount.value),
          currency: currency.value,
          offer: {id: demandOffers[0].id, interestRate: parseFloat(interestRate.value)}
        })
      } else {
        demands.value.push({amount: parseFloat(amount.value), currency: currency.value})
      }
    } catch (e) {
    }
  }

  isLoading.value = false;
}

watch(storage, function () {
  if (!storage.value) return;
  loadDemands();
})

const selectedCurrency = ref()
const enteredAmount = ref(0)
const form = ref();
const currencies = [
  {label: "EUR", value: "EUR"},
  {label: "USD", value: "USD"}
];

const createOrder = async (offerId: String) => {
  const payload = `\
      @prefix schema: <${SCHEMA()}> .

      <> schema:acceptedOffer <${offerId}> .
    `;

  await createResource("https://bank.solid.aifb.kit.edu/credits/orders/", payload, authFetch.value)
      .then(() => {
        toast.add({
          severity: "success",
          summary: "Order created sucessfully",
          life: 5000
        });
      });
};

const postDemand = async () => {
  try {
    // create data-processed resource
    const dataProcessed = await createResource(storage.value + "data-processed/", "", authFetch.value).then(res => getLocationHeader(res));

    // set its ACL
    const aclDataProcessed = `\
      @prefix acl: <${ACL()}>.

      <#owner>
        a acl:Authorization;
        acl:accessTo <${dataProcessed}> ;
        acl:agent <${webId?.value}> ;
        acl:mode acl:Control, acl:Read, acl:Write.
      <#bank>
          a acl:Authorization;
          acl:accessTo <${dataProcessed}> ;
          acl:agent <${bank.value}> ;
          acl:mode acl:Read .
      <#tax>
          a acl:Authorization;
          acl:accessTo <${dataProcessed}> ;
          acl:agent <${tax.value}> ;
          acl:mode acl:Write .
    `;
    putResource(dataProcessed + ".acl", aclDataProcessed, authFetch.value);

    // create data-request resource ...
    const dataRequest = await createResource(storage.value + "data-requests/", `<> <${CREDIT('hasDataProcessed')}> <${dataProcessed}> .`, authFetch.value)
        .then(res => getLocationHeader(res));

    // set its ACL
    const aclDataRequest = `\
      @prefix acl: <${ACL()}>.

      <#owner>
        a acl:Authorization;
        acl:accessTo <${dataRequest}> ;
        acl:agent <${webId?.value}> ;
        acl:mode acl:Control, acl:Read, acl:Write.
      <#bank>
          a acl:Authorization;
          acl:accessTo <${dataRequest}> ;
          acl:agent <${bank.value}> ;
          acl:mode acl:Read, acl:Write .
      <#tax>
          a acl:Authorization;
          acl:accessTo <${dataRequest}> ;
          acl:agent <${tax.value}> ;
          acl:mode acl:Read .
    `;
    putResource(dataRequest + ".acl", aclDataRequest, authFetch.value);

    // Create demand resource
    const payload = `\
      @prefix schema: <${SCHEMA()}> .
      @prefix : <${CREDIT()}> .

      <> a schema:Demand ;
        :hasDataRequest <${dataRequest}> ;
        :hasDataProcessed <${dataProcessed}> ;
        schema:itemOffered [
          a schema:LoanOrCredit ;
            schema:amount ${enteredAmount.value} ;
            schema:currency "${selectedCurrency.value.value}"
        ] .

      <${webId?.value}> schema:seeks <> .
    `;

    const demandContainerUris = await getDataRegistrationContainers(webId!.value!, demandShapeTreeUri, authFetch.value);

    const demand = await createResource("https://bank.solid.aifb.kit.edu/credits/demands/", payload, authFetch.value)
        .then(res => getLocationHeader(res));

    // Get our demand list and add newly created demand
    try {
      const getDemandList = await getResource(demandContainerUris[0], authFetch.value);
      const demandListBody = await getDemandList.text();
      const newDemandList = demandListBody.substring(0, demandListBody.lastIndexOf('.')) + ", <" + demand + "> ."
      putResource(demandContainerUris[0], newDemandList, authFetch.value);
    } catch (error) {
      putResource(demandContainerUris[0], `<${webId?.value}> <${CREDIT('hasDemand')}> <${demand}> .`, authFetch.value);
    }

    // Send LDN to bank about new demand
    createResource("https://bank.solid.aifb.kit.edu/inbox/", `<${webId?.value}> <${SCHEMA('seeks')}> <${demand}> .`, authFetch.value);

    // Success Message \o/
    toast.add({
      severity: "success",
      summary: "Demand created sucessfully",
      life: 5000
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
</script>

<style scoped>
  hr {
    border: 1px solid var(--surface-d);
  }
</style>