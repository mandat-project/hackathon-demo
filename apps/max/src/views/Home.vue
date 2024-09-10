<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {computed, ref, toRefs, watch} from "vue";
import {Quad, Store} from 'n3';
import {
  createResource,
  CREDIT,
  getDataRegistrationContainers,
  getResource,
  INTEROP,
  LDP,
  parseToN3,
  RDF,
  SCHEMA,
  XSD
} from "@shared/solid";
import { useSolidProfile, useSolidSession} from "@shared/composables";
import Button from "primevue/button";
import Card from "primevue/card";

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
    <div class="col lg:col-9 lg:col-offset-2">
      <ul v-if="isLoggedIn">
        <Card style="width: 80%; margin-bottom: 1rem;" v-for="([uri, store], index) of documentCreationDemands" :key="index">
          <template #title>Request #{{ index }}: {{ uri }}</template>
          <template #content>
            <p>From: {{ getObject(store!, INTEROP('fromSocialAgent')) }}</p>
            <p>Requested Data : {{ getObject(store!, INTEROP('registeredShapeTree')) }} </p>
            <Button @click="processDocumentCreationDemand(uri)">Provide requested Data</Button>
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
}

.p-inputgroup {
  padding-bottom: 0;
}

</style>