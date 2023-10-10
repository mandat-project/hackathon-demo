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
              <Dropdown v-model="selectedCurrency" :options="currencies" optionLabel="label"
                        placeholder="Select a Currency"/>
            </div>
          </div>

          <Button class="mt-2" @click="postDemand"> Submit demand</Button>

        </form>

      </div>
    </div>

    <!-- Offers -->
    <div class="grid">
      <div class="col lg:col-6 lg:col-offset-3">

        <h1>
          Offers
          <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
                  @click="loadDemands()"/>
        </h1>

        <ul v-if="demands" class="flex flex-column p-0">
          <li v-for="(demand, index) in demands" :key="demand"
              class="flex flex-wrap align-items-center justify-content-between">
            <hr v-if="index !== 0" class="w-full"/>
            <div class="flex flex-column md:flex-row gap-2 p-3">
              <span v-if="demand.offer"> From </span>
              <span v-if="demand.offer" style="font-weight:bold ;"> <a :href=demand.providerWebID>{{ demand.providerName }} </a> : </span>                            
              <span v-if="demand.offer">{{ demand.amount }} {{ demand.currency }}</span>
              <span v-if="demand.offer">(interest rate %: {{ demand.offer.interestRate }})</span>
              <span v-if="demand.offer">(duration: {{ demand.offer.duration }})</span>
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
  </div>
  <span v-else> 401 Unauthenticated : Login using the button in the top-right corner! </span>
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
    LDP,
    parseToN3,
    putResource,
    SCHEMA,
VCARD
} from "@shared/solid";
import {Ref, ref, toRefs, watch} from "vue";
import {Quad} from "n3";

interface Demand {
  providerName: string,
  providerWebID: string ,
  amount: number,
  currency: string,
  offer?: Offer
}

interface Offer {
    id: string,
    interestRate: number
    duration: string
}

const bank = ref("https://bank.solid.aifb.kit.edu/profile/card#me");
const tax = ref("https://tax.solid.aifb.kit.edu/profile/card#me");

const demandShapeTreeUri = 'https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditDemandTree';
const orderContainer = "https://bank.solid.aifb.kit.edu/credits/orders/";


const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();

const {webId} = toRefs(sessionInfo);
const {isLoggedIn} = toRefs(sessionInfo);
const {storage} = useSolidProfile();

const demands = ref([]) as Ref<Demand[]>;
const selectedCurrency = ref();
const enteredAmount = ref(0);
const form = ref();

const currencies = [
  {label: "EUR", value: "EUR"},
  {label: "USD", value: "USD"}
];

let isLoading = ref(false);

watch(storage, function () {
  if (!storage.value) return;
  loadDemands();
})
async function loadDemands() {
  isLoading.value = true;

  demands.value = [];

  const demandContainerUris = await getDataRegistrationContainers(bank.value, demandShapeTreeUri, authFetch.value);

  const demandContainerStore = await getDemandContainerStore(demandContainerUris);

  const allDemands = demandContainerStore.getObjects(null, LDP('contains'), null);
  for (let demand of allDemands) {
    try {
      const demandStore = await getDemandStore(demand);

      const demandOffers = demandStore.getObjects(null, CREDIT('hasOffer'), null);
      const amount = demandStore.getObjects(null, SCHEMA('amount'), null)[0];
      const currency = demandStore.getObjects(null, SCHEMA('currency'), null)[0];
      const profileCard = await getprofileCard(bank.value);
      const bankname = profileCard.getObjects(bank.value, VCARD('fn'),null)[0].value;

      if (demandOffers.length > 0) {
        const offerStore = await getOfferStore(demandOffers);

        const interestRate = offerStore.getObjects(null, SCHEMA('annualPercentageRate'), null)[0];

        const duration = offerStore.getObjects(demandOffers[0].value + "#duration", SCHEMA('value'), null)[0];

        console.log(duration);

        demands.value.push({
          providerName:bankname ,
          providerWebID: bank.value , 
          amount: parseFloat(amount.value),
          currency: currency.value,
          offer: {id: demandOffers[0].id, interestRate: parseFloat(interestRate.value), duration: duration.value}
        })
      } else {
        demands.value.push({providerName: bankname, providerWebID: bank.value, amount: parseFloat(amount.value), currency: currency.value})
      }
    } catch (e) {
    }

  }
  isLoading.value = false;

}
const postDemand = async () => {
  try {
    // create data-processed resource
    const dataProcessed = await createDataProcessedResource();

    // set its ACL
    const aclDataProcessed = createAclDataProcessed(dataProcessed);
    setDataProcessedAcl(dataProcessed, aclDataProcessed);

    // create data-request resource
    const dataRequest = await createDataRequestResource(dataProcessed);

    // set its ACL
    const aclDataRequest = createAclDataRequest(dataRequest);
    setDataRequestAcl(dataRequest, aclDataRequest);

    // Create demand resource
    const payload = createDemandPayload(dataRequest, dataProcessed);

    const demandContainerUris = await getContainerUris(bank.value, demandShapeTreeUri);

    const demand = await createDemand(demandContainerUris, payload);

    // Send LDN to bank about new demand
    sendLDNtoBank(demand);

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
async function getDemandContainerStore(demandContainerUris: Array<string>) {
  return await getResource(demandContainerUris[0], authFetch.value)
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, demandContainerUris[0]))
      .then((parsedN3) => parsedN3.store)
      .catch(err => {
        isLoading.value = false
        throw err;
      });

}
async function getDemandStore(demand: any) {
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
                life: 5000
            });
        });
};

async function createDataProcessedResource() {
  return await createResource(storage.value + "data-processed/", "", authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on create!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then(res => getLocationHeader(res));
}

async function createDataRequestResource(dataProcessed: string) {
  return await createResource(storage.value + "data-requests/", `<> <${CREDIT('hasDataProcessed')}> <${dataProcessed}> .`, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on create!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then(res => getLocationHeader(res));
}

function setDataProcessedAcl(dataProcessed: string, aclDataProcessed: string) {
  putResource(dataProcessed + ".acl", aclDataProcessed, authFetch.value)
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

function setDataRequestAcl(dataRequest: string, aclDataRequest: string) {
  putResource(dataRequest + ".acl", aclDataRequest, authFetch.value)
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
      }).then((resp) => resp.text())
      .then((txt) => parseToN3(txt, webId))
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

async function createDemand(demandContainerUris: Array<string>, payload: string) {
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
      .then(res => getLocationHeader(res));
}

function sendLDNtoBank(demand: string) {
  createResource("https://bank.solid.aifb.kit.edu/inbox/", `<${webId?.value}> <${SCHEMA('seeks')}> <${demand}> .`, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on create!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      });
}

function createAclDataProcessed(dataProcessed: string) {
  return `\
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
}

function createAclDataRequest(dataRequest: string) {
  return `\
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
}

function createDemandPayload(dataRequest: string, dataProcessed: string) {
  return `\
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
}
</script>

<style scoped>
hr {
    border: 1px solid var(--surface-d);
}
</style>