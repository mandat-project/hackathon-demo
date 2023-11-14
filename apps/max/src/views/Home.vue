<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {ref, toRefs, watch} from "vue";
import {Quad, Store} from 'n3';
import {
  CREDIT,
  getDataRegistrationContainers,
  getResource,
  INTEROP,
  LDP,
  parseToN3,
  putResource, RDF, SCHEMA, XSD
} from "@shared/solid";
import {useSolidInbox, useSolidSession} from "@shared/composables";
import Button from "primevue/button";

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const {isLoggedIn} = toRefs(sessionInfo);
const isLoading = ref(false);
const {ldns} = useSolidInbox();

const documentDemandContainerUri = ref("https://tax.solid.aifb.kit.edu/documents/demands/");
const demands = ref(new Map<string, Store | null>());

// auto refetch on ldn
watch(
    () => ldns.value,
    () => isLoggedIn ? fetchDemands() : {}
);

function fetchDemands() {
  isLoading.value = true;
  getResourceAsStore(documentDemandContainerUri.value)
    .then(containerStore => getObjects(containerStore, LDP('contains'))
      .forEach(demandUri => {
        getResourceAsStore(demandUri).then(demandStore => {
          demands.value.set(demandUri, demandStore);
        })
      }))
    .finally(() => isLoading.value = false);
}

function getBusinessAssessmentPayload() {
  return `@prefix schema: <${SCHEMA}> .
          @prefix xsd: <${XSD}> .
          @prefix rdf: <${RDF}> .
          @prefix credit: <${CREDIT}> .

          <> a credit:BusinessAssessment  ;
            credit:hasTotal     			71500.0 ;
            credit:hasCapitalizedService 		0.0 ;
            credit:hasRevenue 			70000.0 ;
            credit:hasChangeinRevenue		1500.0 ;
            credit:versionNo     			"9.12" ;
            credit:createdAt     			"2023-03-28T14:45:47.000Z"^^xsd:dateTime ;
            credit:referencedStartDate		"2021-01-01T00:00:00.000Z"^^xsd:dateTime  ;
            credit:referencedStartEnd		"2021-12-31T23:59:59.000Z"^^xsd:dateTime  .
    `;
}

async function processDemand(key: string) {
  const store = demands.value.get(key);
  if (store) {
    const requestedShapeTree = getObject(store, INTEROP('registeredShapeTree'));
    const fromSocialAgent = getObject(store, INTEROP('fromSocialAgent'));

    const targetUri = await getContainerUris(fromSocialAgent, requestedShapeTree);
    const businessAssessmentPayload = getBusinessAssessmentPayload();

    await putResource(targetUri[0], businessAssessmentPayload, authFetch.value)
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
  toast.add({
      severity: "success",
      summary: "Processing something",
      life: 5000
    });
}

// HELPER-FUNCTIONS

function getResourceAsStore(uri: string): Promise<any> {
  return getResource(uri, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetch!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then(txt => parseToN3(txt, uri))
      .then(n3 => n3.store);
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
    <div class="col lg:col-6 lg:col-offset-3">
      <ul v-if="isLoggedIn">
        <li v-for="([uri, store], index) of demands" :key="index">
          <p>Request #{{ index }}: {{ uri }}</p>
          <p>From: {{ getObject(store, INTEROP('fromSocialAgent')) }}</p>
          <p>Requested Data : {{ getObject(store, INTEROP('registeredShapeTree')) }} </p>
          <Button   @click="processDemand(uri)">Provide requested Data</Button>
        </li>
      </ul>
      <span v-else> 401 Unauthenticated : Login using the button in the top-right corner! </span>
    </div>
  </div>
</template>

<style scoped>
.grid {
  margin: 5px;
}


</style>