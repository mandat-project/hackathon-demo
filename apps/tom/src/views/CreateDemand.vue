<script setup lang="ts">
import AdvertisementCard from "@/components/AdvertisementCard.vue";
import {bank, creditDemandShapeTreeUri} from "@/constants/solid-urls";
import router from "@/router";
import {Advertisement} from "@/types/Advertisement";
import {toAdvertisementName} from "@/utils/toAdvertisementName";
import {CheckMarkSvg, HorizontalLine, PageHeadline, SmeCard, SmeCardHeadline, DacklTextInput} from "@datev-research/mandat-shared-components";
import {useIsLoggedIn, useSolidProfile, useSolidSession} from "@datev-research/mandat-shared-composables";
import {
  AD,
  createResource,
  CREDIT, getLocationHeader,
  INTEROP,
  LDP,
  RDFS,
  SCHEMA,
  VCARD
} from "@datev-research/mandat-shared-solid-requests";
import {fetchStoreOf, getContainerUris} from "@datev-research/mandat-shared-utils";
import {Store} from "n3";
import {useToast} from "primevue/usetoast";
import {computed, ref, shallowRef, watch} from "vue";

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
const enteredAmount = ref('0');

const listedAdvertisements = shallowRef<string[]>([])
const advertisements = shallowRef<Advertisement[]>([]);
const chosenAdvertisement = ref("")
const isLoadingAds = ref(false)

const chosenAdvertiserDemandInbox = ref("")
const activeAdvertisementIndex = ref<number>(-1);
const activeStep = ref<number>(0);

const headlineText = computed(() => {
  const headlines = {
    0: 'Select Service Type',
    1: 'Select Service Provider',
    2: 'Submit Request',
  };
  return headlines[activeStep.value] ?? '';
});

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
    /*toast.add({
      severity: "success",
      summary: "Received advertisements",
      life: 5000,
    });/**/
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
    /*toast.add({
      severity: "success",
      summary: "Received services",
      life: 5000,
    });/**/
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

    await router.push({name:'demands', query: { amount: `${enteredAmount.value}` }});
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
    <PageHeadline>{{ headlineText }}</PageHeadline>
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
          <SmeCard>
            <SmeCardHeadline>Service Type</SmeCardHeadline>
            <ul class="list-none gap-5 p-0 flex flex-column md:flex-row justify-content-between">
              <li v-for="ad of listedAdvertisements" :key="ad" class="w-auto flex-grow-1 flex-shrink-1 flex-basis-0">
                <AdvertisementCard @adClick="adClick" :ad="ad"/>
              </li>
            </ul>
          </SmeCard>
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
          <SmeCard>
            <SmeCardHeadline>Loan Provider</SmeCardHeadline>
            <HorizontalLine/>
            <strong>Type: {{ toAdvertisementName(chosenAdvertisement) }}</strong>
            <p class="break-all">{{ chosenAdvertisement }}</p>
            <HorizontalLine/>
            <div role="list" v-if="advertisements" class="flex flex-column gap-3 p-0">
              <Card role="listitem" class="consumer-credit p-4" v-for="(ad, index) in advertisements" :key="ad.id">
                <template #header>
                  <header class="flex gap-4">
                    <div class="w-6rem h-6rem p-3 bg-bluegray-50 flex justify-content-center align-items-center">
                      <a class="" :href="ad.inbox"><img :src="ad.creatorIconURI" class="max-w-full"></a>
                    </div>
                    <div>
                      <h3 class="m-0 text-xl font-normal">{{ ad.label }}</h3>
                      <p class="my-2">Valid until {{ ad.validUntil.split("/").pop() }}</p>
                      <p class="my-2 text-sm">{{ad.comment}}</p>
                    </div>
                  </header>
                  <HorizontalLine class="mt-0"/>
                </template>
                <template #content>

                  <div class="grid">
                    <div class="col-4 xl:col-3">
                      <p class="my-0 text-xs text-black-alpha-70">Lowest interest rate: </p>
                      <p class="my-0 text-xl font-semibold">{{ad.lowestInterestRate}} %</p>
                    </div>
                    <div class="col-4 xl:col-3">
                      <p class="my-0 text-xs text-black-alpha-70">Repayment Periods (months)</p>
                      <p class="my-0 text-xl font-semibold">{{ad.minCreditPeriodMonths}} - {{ad.maxCreditPeriodMonths}}</p>
                    </div>
                    <div class="col-4  xl:col-3 ">
                      <p class="my-0 text-xs text-black-alpha-70">Contact advertiser at:</p>
                      <a class="my-0 text-xl font-semibold" :href="ad.inbox">advertiser</a>
                    </div>
                    <div class="col-12 mt-2 xl:mt-0 xl:col-3 flex justify-content-end">
                      <Button class="w-full xl:w-auto" @click="chosedAdvertiser(ad, index)" icon="pi pi-check">
                        Select&nbsp;
                        <span class="md:hidden">Provider</span>
                        <span class="hidden md:inline">{{ ad.label }}</span>
                      </Button>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
            <span v-if="!isLoadingAds && advertisements.length === 0 && chosenAdvertisement">No ads found</span>
          </SmeCard>
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
          <SmeCard>
            <SmeCardHeadline>Loan Demand</SmeCardHeadline>
            <HorizontalLine/>
            <div class="grid">
              <div class="col-12 md:col-6">
                <strong>Type: {{ toAdvertisementName(chosenAdvertisement) }}</strong>
                <p class="break-all">{{ chosenAdvertisement }}</p>
              </div>
              <div class="col-12 md:col-6">
                <strong v-if="chosenAdvertiserDemandInbox">Provider: {{ advertisements[activeAdvertisementIndex].label }}</strong>
                <p class="break-all" v-if="chosenAdvertiserDemandInbox">{{ chosenAdvertiserDemandInbox }}</p>
              </div>
            </div>
            <HorizontalLine/>

            <form @submit="(event) => event.preventDefault()">
              <div class="flex flex-column md:flex-row mt-3">
                <DacklTextInput type="number" class="w-full md:w-auto mt-2" label="Enter amount" v-model="enteredAmount" />

                <div class="dropdown relative mt-2 md:mt-0 md:mx-3">
                  <label class="z-1 pt-2.5 pl-2 text-sm text-black-alpha-70 absolute" for="currencyDropdown">Currency</label>
                  <Dropdown class="w-full h-3.75rem md:w-auto pt-4 mt-1 control-shadow" id="currencyDropdown" v-model="selectedCurrency" :options="currencies" option-value="value" option-label="label" />
                </div>
              </div>

              <Button class="mt-3 w-full md:w-auto" @click="postCreditDemand">
                Submit {{ Number(enteredAmount).toLocaleString() + ' ' + (selectedCurrency === 'EUR' ? '&euro;' : '&dollar;') }} Demand
              </Button>
            </form>
          </SmeCard>
        </template>
      </StepperPanel>
    </Stepper>
    <ProgressBar v-if="isLoadingAds" mode="indeterminate" style="height: 2px" />
  </div>
</template>

<style scoped>

.p-stepper :deep(.p-stepper-nav) {
  width:40rem;
}
.consumer-credit :deep(.p-card-body){
  padding:0;
}
.consumer-credit :deep(.p-card-content){
  padding:0;
}
</style>