<script setup lang="ts">
import AdvertisementCard from "@/components/AdvertisementCard.vue";
import {useIsLoggedIn} from "@/composables/useIsLoggedIn";
import {bank, creditDemandShapeTreeUri} from "@/constants/solid-urls";
import {Advertisement} from "@/types/Advertisement";
import {CheckMarkSvg} from "@shared/components";
import {useSolidProfile, useSolidSession,} from "@shared/composables";
import {AD, createResource, CREDIT, getLocationHeader, INTEROP, LDP, RDFS, SCHEMA, VCARD,} from "@shared/solid";
import {fetchStoreOf, getContainerUris} from "@shared/utils";
import {Store} from "n3";
import {useToast} from "primevue/usetoast";
import {ref, shallowRef, watch} from "vue";

const {session} = useSolidSession();
const {storage, memberOf} = useSolidProfile();
const toast = useToast();
const { isLoggedIn } = useIsLoggedIn();

const currencies = [
  {label: "EUR", value: "EUR"},
  {label: "USD", value: "USD"},
] as const;
const mapOfAdShapeTrees = new Map();

const selectedCurrency = ref<'EUR' | 'USD'>('EUR');
const enteredAmount = ref(0);

const listedAdvertisements = shallowRef<string[]>([])
const advertisements = shallowRef<Advertisement[]>([]);
const chosenAdvertisement = ref("")
const isLoadingAds = ref(false)

const chosenAdvertiserDemandInbox = ref("")
const activeAdvertisementIndex = ref<number>(-1);
const activeStep = ref<number>(0);

watch(storage, () => {
  if (!storage.value) return;
  getAdsFromMarket();
}, {immediate:true});

watch(selectedCurrency, () => {
  console.log('selectedCurrency', selectedCurrency.value);
})

watch(listedAdvertisements, () => {
  if (!chosenAdvertisement.value) {
    // Pre-select first URL
    chosenAdvertisement.value = listedAdvertisements.value[0];
  }
});

watch(chosenAdvertisement, () => {// Pre-select first URL
  // Auto load ads immediately
  if (chosenAdvertisement.value) {
    getSelectedAds();
  }
});

watch(advertisements, () => {
  chosenAdvertiserDemandInbox.value = '';
  activeAdvertisementIndex.value = -1;
}, {});

async function chosedAdvertiser(ad: Advertisement, index: number){
  chosenAdvertiserDemandInbox.value = ad.inbox;
  activeAdvertisementIndex.value = index;
  activeStep.value += 1;
}

function adClick(ad: string): void {
  chosenAdvertisement.value = ad;
  activeStep.value += 1;
}

/*After user has chosen an ad shape, get all ads from the market pod*/
async function getSelectedAds() {
  //check that chosenAdvertisement is not empty
  if (!chosenAdvertisement.value) {
    return;
  }

  isLoadingAds.value = true;
  advertisements.value = [];

  try {
    const adContainerURI: string = mapOfAdShapeTrees.get(chosenAdvertisement.value);
    const adStore: Store = await fetchStoreOf(adContainerURI, session); //get ads from container on marketplace
    const _advertisements: Advertisement[] = [];
    const adList = adStore.getObjects(null, LDP('contains'), null);
    const adListLength = adList.length

    for (let i = 0; i < adListLength; i++){
      const adResource = adList[i];

      const resStore: Store = await fetchStoreOf(adResource.value, session);
      const createdBy = resStore.getObjects(adResource, AD('createdBy'), null)[0].value;

      const creatorStore: Store = await fetchStoreOf(createdBy, session);
      const creatorIconURI = creatorStore.getObjects(null, VCARD("hasPhoto"), null)[0].value;

      const adObject: Advertisement = {
        id: String(i),
        validUntil: resStore.getObjects(adResource, AD('ValidUntil'), null)[0].value,
        inbox: resStore.getObjects(adResource, AD('sendDemandTo'), null)[0].value,
        comment: resStore.getObjects(adResource, RDFS('comment'), null)[0].value,
        label: resStore.getObjects(adResource, RDFS('label'), null)[0].value,
        lowestInterestRate: resStore.getObjects(adResource, AD('lowestInterestRate'), null)[0].value,
        minCreditPeriodMonths: resStore.getObjects(adResource, AD('minCreditPeriodMonths'), null)[0].value,
        maxCreditPeriodMonths: resStore.getObjects(adResource, AD('maxCreditPeriodMonths'), null)[0].value,
        createdBy: createdBy,
        creatorIconURI: creatorIconURI
      }

      _advertisements.push(adObject);
    }

    advertisements.value = _advertisements;

    // Success Message \o/
    toast.add({
      severity: "success",
      summary: "Received advertisements",
      life: 5000,
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error on getting ads",
      detail: err,
      life: 5000,
    });
  } finally{
    isLoadingAds.value = false;
  }
}


/**Get advertisements from a marketplace for any kind of ad shape */
async function getAdsFromMarket() {
  isLoadingAds.value = true;
  try {

    const marketURI = "https://market.solid.aifb.kit.edu/profile/card"
    const registrySetMarket = (await fetchStoreOf(marketURI, session)).getObjects(null,INTEROP("hasRegistrySet"),null)[0].value;
    const marketStore = await fetchStoreOf(registrySetMarket, session);

    mapOfAdShapeTrees.clear();
    for(const registry of marketStore.getObjects(null,INTEROP("hasDataRegistry"),null)){
      const regStore = await fetchStoreOf(registry.value, session);

      for(const registration of regStore.getObjects(null,INTEROP("hasDataRegistration"),null)){
        regStore.addQuads((await fetchStoreOf(registration.value, session)).getQuads(null,null,null,null));
        for (const shapeTree of regStore.getObjects(registration,INTEROP("registeredShapeTree"),null)){
          //add to our overview list (we assume that all shapeTree and their registrations are unique...)
          mapOfAdShapeTrees.set(shapeTree.value, registration.value)
        }
      }
    }
    //we have all ad shaoe --> display as list in dropdown s.t. user may select ad shape
    listedAdvertisements.value = Array.from(mapOfAdShapeTrees.keys());
    //@@@ we can add labels to shapes with '// rdfs:label "Credit Shape"' and then display the label as human readable text
    // probably parse the shape (with shex.js?), transform to JSON-LD, then look for Annotations
    /**
     * Example for Shape with annotations:
     * <CreditShape> {               # An Observation has:
     :status ["preliminary" "final"];
     :subject @<OtherShape>
     //rdfs:label "This is a Credit Shape"
     }
     *
     * Example how it looks like in JSON-LD:
     *  "annotations": [
     {
     "type": "Annotation",
     "predicate": "http://www.w3.org/2000/01/rdf-schema#label",
     "object": {
     "value": "This is a Credit Shape"
     }
     }
     ]
     */

    // Success Message \o/
    toast.add({
      severity: "success",
      summary: "Received services",
      life: 5000,
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error on contacting market",
      detail: err,
      life: 5000,
    });
  }
  finally{
    isLoadingAds.value = false;
  }
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
            schema:currency "${selectedCurrency.value}"
        ] .

      <${memberOf.value}> schema:seeks <> .
    `;


    let demandContainerUris: string[];
    //either inbox comes from fixed bank URI (as before), or a "new" inbox as received from advertisement
    if (chosenAdvertiserDemandInbox.value == ""){
      demandContainerUris = await getContainerUris(bank, creditDemandShapeTreeUri, session); //take inbox as pre-determined by code...
    }else{
      demandContainerUris = [chosenAdvertiserDemandInbox.value]; //take inbox as received from ad
    }

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

async function createDemand(demandContainerUris: string[], payload: string) {
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
</script>

<template>
  <div v-if="isLoggedIn">
    <div class="">
      <div class="">
        <h1 class="text-petrol-650 font-normal text-4xl md:text-6xl">Select Service Type</h1>

        <Stepper v-model:active-step="activeStep">
          <StepperPanel>
            <template #header="{ index, clickCallback }">
              <button class="bg-transparent cursor-pointer border-none inline-flex flex-row gap-2 align-items-center font-medium text-base" @click="clickCallback">
                <div v-if="index < activeStep" class="flex flex-shrink-0 justify-content-center align-items-center bg-transparent border-1 border-petrol-600 w-2rem h-2rem border-round-3xl">
                  <CheckMarkSvg class="fill-petrol-600" />
                </div>
                <span v-else :class="['border-round-3xl border-1 border-black w-2rem h-2rem inline-flex align-items-center justify-content-center', { 'bg-petrol-600 border-petrol-600 text-white': index === activeStep }]">
                    {{ index + 1 }}
                </span>
                <span class="hidden sm:inline">Service Type</span>
              </button>
            </template>

            <template #content>
              <ul class="list-none gap-5 flex">
                <li v-for="ad of listedAdvertisements" :key="ad">
                  <AdvertisementCard @adClick="adClick" :ad="ad"/>
                </li>
              </ul>
            </template>
          </StepperPanel>
          <StepperPanel>
            <template #header="{ index, clickCallback }">
              <button class="bg-transparent cursor-pointer border-none inline-flex flex-row gap-2 align-items-center font-medium text-base" @click="clickCallback">
                <div v-if="index < activeStep" class="flex flex-shrink-0 justify-content-center align-items-center bg-transparent border-1 border-petrol-600 w-2rem h-2rem border-round-3xl">
                  <CheckMarkSvg class="fill-petrol-600" />
                </div>
                <span v-else :class="['border-round-3xl border-1 border-black w-2rem h-2rem inline-flex align-items-center justify-content-center', { 'bg-petrol-600 border-petrol-600 text-white': index === activeStep }]">
                    {{ index + 1 }}
                </span>
                <span class="hidden sm:inline">Service Provider</span>
              </button>
            </template>

            <template #content>
              <ul v-if="advertisements" class="flex flex-column p-0">
                <li v-for="(ad, index) in advertisements" :key="ad.id" class="flex flex-wrap align-items-center justify-content-between">
                  <hr v-if="index !== 0" class="w-full" />
                  <div class="flex flex-column md:flex-row gap-2 p-3" :class="{ 'bg-bluegray-100 font-bold': index == activeAdvertisementIndex }">
                    <span> {{ad.label}}</span>
                    <span> Ad no. {{ ad.id
                      }}, valid until {{
                        ad.validUntil.split("/").pop()
                      }}</span>
                    <span> Lowest interest rate: {{ad.lowestInterestRate}}</span>
                    <span> Credit periods from {{ad.minCreditPeriodMonths}} to {{ad.maxCreditPeriodMonths}} months</span>
                    <span> Contact advertiser at: </span>
                    <a :href="ad.inbox"><img :src="ad.creatorIconURI" width="50" height="50"></a>
                  </div>
                  <div class="flex flex-column md:flex-row gap-2 p-3" :class="{ 'bg-bluegray-100 font-bold': index == activeAdvertisementIndex }">
                    <span> {{ad.comment}}</span>
                    <span>
                  <Button @click="chosedAdvertiser(ad, index)" label="Choose"
                          icon="pi pi-check" /></span>
                  </div>
                </li>
              </ul>
              <span v-if="!isLoadingAds && advertisements.length === 0 && chosenAdvertisement">No ads found</span>
            </template>
          </StepperPanel>
          <StepperPanel>
            <template #header="{ index, clickCallback }">
              <button class="bg-transparent cursor-pointer border-none inline-flex flex-row gap-2 align-items-center font-medium text-base" @click="clickCallback">
                <div v-if="index < activeStep" class="flex flex-shrink-0 justify-content-center align-items-center bg-transparent border-1 border-petrol-600 w-2rem h-2rem border-round-3xl">
                  <CheckMarkSvg class="fill-petrol-600" />
                </div>
                <span v-else :class="['border-round-3xl border-1 border-black w-2rem h-2rem inline-flex align-items-center justify-content-center', { 'bg-petrol-600 border-petrol-600 text-white': index === activeStep }]">
                    {{ index + 1 }}
                </span>
                <span class="hidden sm:inline">Submit Request</span>
              </button>
            </template>

            <template #content>
              <h1>Create Demand</h1>
              <!-- We just display the chosen ad's demand container here - currently it is not used in the form below -->
              <span v-if="chosenAdvertiserDemandInbox != ''">Create a demand at
              <strong>{{chosenAdvertiserDemandInbox}}</strong></span>

              <form>
                <div class="grid">
                  <span class="align-self-center font-bold">Amount</span>
                  <div class="col">
                    <InputNumber id="amount" type="number" v-model="enteredAmount" />
                  </div>
                </div>

                <div class="grid">
                  <span class="align-self-center font-bold">Currency</span>
                  <div class="col">
                    <Dropdown v-model="selectedCurrency" :options="currencies" option-value="value" option-label="label"
                              placeholder="Select a Currency" />
                  </div>
                </div>

                <Button class="mt-2" @click="postCreditDemand">Submit demand</Button>
              </form>
            </template>
          </StepperPanel>
        </Stepper>

        <ProgressBar v-if="isLoadingAds" mode="indeterminate" style="height: 2px" />


      </div>
    </div>
  </div>
</template>

<style scoped>
.-top-1rem {
  top: -1rem;
}
</style>
