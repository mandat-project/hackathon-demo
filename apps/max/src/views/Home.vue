<script setup lang="ts">
import {getDataRegistrationContainers} from "@datev-research/mandat-shared-solid-interop";
import {
  createResource,
  CREDIT,
  getResource,
  INTEROP,
  LDP, parseToN3,
  RDF,
  SCHEMA,
  XSD
} from "@datev-research/mandat-shared-solid-requests";
import {useToast} from "primevue/usetoast";
import {computed, ref, toRefs, watch} from "vue";
import {Quad, Store} from 'n3';
import { useSolidProfile, useSolidSession} from "@datev-research/mandat-shared-composables";
import Button from "primevue/button";
import Card from "primevue/card";
import Divider from 'primevue/divider';

const toast = useToast();
const {session} = useSolidSession();
const {memberOf} = useSolidProfile()
const isLoggedIn = computed(() => {
  return ((session.webId && !memberOf) || (session.webId && memberOf && session.rdp) ? true : false)
})
const isLoading = ref(false);

const documentCreationDemands = ref(new Map<string, Store | null>());
const documentDemandContainerUri = ref("https://tax.solid.aifb.kit.edu/documents/demands/");
// ! this should be dynamic

// auto refetch on ldn
watch(
    () => isLoggedIn.value,
    () => isLoggedIn.value ? fetchDocumentCreationDemands() : {},
    {immediate:true}
);

function fetchDocumentCreationDemands() {
  isLoading.value = true;
  getResourceAsStore(documentDemandContainerUri.value)
      .then(containerStore => getObjects(containerStore, LDP('contains'))
          .forEach(documentCreationDemandUri => {
            getResourceAsStore(documentCreationDemandUri).then(requestStore => {
              documentCreationDemands.value.set(documentCreationDemandUri, requestStore);
            })
          }))
      .finally(() => isLoading.value = false);
}

async function processDocumentCreationDemand(key: string) {
  const store = documentCreationDemands.value.get(key);
  if (store) {
    const requestedShapeTree = getObject(store, INTEROP('registeredShapeTree'));
    const targetUri = await getDataRegistrationContainers(memberOf.value, requestedShapeTree, session);
    const date = new Date().toISOString();
    const businessAssessmentPayload = `@prefix schema: <${SCHEMA()}> .
          @prefix xsd: <${XSD()}> .
          @prefix rdf: <${RDF()}> .
          @prefix credit: <${CREDIT()}> .
          <> a credit:BusinessAssessment ;
            credit:hasTotal 71500.0 ;
            credit:hasCapitalizedService 0.0 ;
            credit:hasRevenue 70000.0 ;
            credit:hasChangeinRevenue 1500.0 ;
            credit:versionNo "9.12" ;
            credit:createdAt "${date}"^^xsd:dateTime ;
            credit:referencedStartDate "2021-01-01T00:00:00.000Z"^^xsd:dateTime ;
            credit:referencedStartEnd "2021-12-31T23:59:59.000Z"^^xsd:dateTime .
    `;
    await createResource(targetUri[0], businessAssessmentPayload, session)
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
  toast.add({
    severity: "success",
    summary: "Processing something",
    life: 5000
  });
}

// HELPER-FUNCTIONS

function getResourceAsStore(uri: string): Promise<any> {
  return getResource(uri, session)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetch!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.data)
      .then(txt => parseToN3(txt, uri))
      .then(n3 => n3.store);
}

function getObjects(store: Store, quad1: string, quad2?: Quad) {
  const subjectUri = store.getSubjects(null, null, null)[0].value;
  return store.getObjects(subjectUri, quad1, quad2 || null).map(obj => obj.value);
}

function getObject(store: Store, quad1: string, quad2?: Quad): string {
  return getObjects(store, quad1, quad2)[0];
}
</script>

<template>
  <div class="grid">
    <div class="col lg:col-12 wrapper">
      <h1 class="text-petrol-650 px-3 font-normal text-4xl md:text-6xl gap-2 flex align-items-center">Client Requests</h1>
      <ul v-if="isLoggedIn" class="pb-2">
        <Card class="mb-4" v-for="([uri, store], index) of documentCreationDemands" :key="index">
          <template #title><div class="col-12 block">Request #{{ index + 1 }}:</div></template>
            <template #content>
              <div class="grid">
                <div class="col-12 text-sm block word-break"> <a :href="uri" target="_blank" class="font-bold">Documents Demands</a></div>
                <div class="col-12 sm:col-6 block word-break pt-4">
                    <span class="text-black-alpha-70 text-xs">From: </span>
                    <a :href="getObject(store!, INTEROP('fromSocialAgent'))" target="_blank" class="font-bold text-sm">
                      {{ getObject(store!, INTEROP('fromSocialAgent')) }}
                    </a>
                </div>
                <div class="col-12 sm:col-6 block word-break pt-4">
                  <span class="text-black-alpha-70 text-xs">Requested Data : </span>
                  <a :href="getObject(store!, INTEROP('registeredShapeTree'))" target="_blank" class="text-sm font-bold">{{ getObject(store!, INTEROP('registeredShapeTree')).split('#')?.[1] }}</a></div>
                <Divider />
              </div>
              <div class="col-12 text-right">
                <Button @click="processDocumentCreationDemand(uri)" class="mr-0 sm:mr-3 w-full sm:w-auto text-center inline-block	">Provide requested Data</Button>
                <Button severity="secondary" class="w-full sm:w-auto inline-block	mt-2 sm:mt-0">Delete Request</Button>
              </div>
            </template>
        </Card>
      </ul>
    </div>
  </div>
  <a class="github-fork-ribbon right-bottom fixed" href="https://github.com/DATEV-Research/Solid-B2B-showcase" data-ribbon="GitHub" title="GitHub">GitHub</a>
</template>

<style scoped>
.grid {
  margin: 5px;
  .wrapper {
    width: -webkit-fill-available;
    ul{
      padding-left:0px;
      .word-break{
        word-wrap: break-word;
      }
    }
  }
}

.p-card-content{
  padding:0px;
}
.p-inputgroup {
  padding-bottom: 0;
}

</style>
