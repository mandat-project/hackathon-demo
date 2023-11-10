<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {ref, toRefs, watch} from "vue";
import {Quad, Store, NamedNode, Literal, Writer, Parser} from 'n3';
import { createResource, CREDIT, getResource, LDP, parseToN3, putResource, getLocationHeader, ACL, SCHEMA, FOAF, DCT, createContainer, patchResource } from "@shared/solid";
import { useSolidInbox, useSolidSession, useSolidProfile } from "@shared/composables";

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const { isLoggedIn, webId } = toRefs(sessionInfo);
const isLoading = ref(false);
const {ldns} = useSolidInbox();
const { storage } = useSolidProfile()

const smeWebID = ref("https://sme.solid.aifb.kit.edu/profile/card#me");
const containerUri = ref("https://sme.solid.aifb.kit.edu/data-requests/");
const inboxUri = ref("https://sme.solid.aifb.kit.edu/inbox/");
const requests = ref(new Map<string, Store | null>());

// auto refetch on ldn
watch(
    () => ldns.value,
    () => isLoggedIn ? fetchRequests() : {}
);

function fetchRequests() {
  isLoading.value = true;
  getResourceAsStore(containerUri.value)
    .then(containerStore => getObjects(containerStore, LDP('contains'))
      .forEach(requestUri => {
        getResourceAsStore(requestUri).then(requestStore => {
          requests.value.set(requestUri, requestStore);
        })
      }))
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Couldn't fetch requests!",
        detail: "",
        life: 5000,
      });
    })
    .finally(() => isLoading.value = false);
}

async function processRequest(key: string) {
  const store = requests.value.get(key);
  if (store) {

    try{
      const targetUri = getObject(store, CREDIT('hasDataProcessed'));
      const processedDataBody = `@prefix ex: <${CREDIT()}>. <> a ex:ProcessedData .`;
      await putResource(targetUri, processedDataBody, authFetch.value);

      //LDN with targetUri as msgbody
      await createResource(inboxUri.value, "change happened at " + targetUri, authFetch.value);

      toast.add({
        severity: "success",
        summary: "Data was successfully processed! Resource changed at " + targetUri,
        life: 5000
      });
    }catch (err) {
      toast.add({
        severity: "error",
        summary: "Error during Data Processing",
        detail: err,
        life: 5000,
      });
    }
  }
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

function getObjects(store: Store, quad1: string, quad2?: Quad) {
  const subjectUri = store.getSubjects(null, null, null)[0].value;
  return store.getObjects(subjectUri, quad1, quad2 || null).map(obj => obj.value);
}

function getObject(store: Store, quad1: string, quad2?: Quad): string {
  return getObjects(store, quad1, quad2)[0];
}

function idsToList(webIds : String[]) : String{
  let r = ""
  for(let i = 0; i < webIds.length; i++){
    r += webIds[i];
    if(i < webIds.length-1)
    { r+=">, <" }
  }
  return r;
}
</script>

<template>
  <Toolbar v-if="isLoggedIn">
    <template  #start>
      <router-link to="/">
        <Button>Home</Button>
      </router-link>
      <router-link to="/processes/">
        <Button >Processes</Button>
      </router-link>
    </template>
  </Toolbar>
  
  
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <div class="p-inputgroup">
        <InputText
            placeholder="GET my request."
            v-model="containerUri"
            @keyup.enter="fetchRequests()"
        />
        <Button @click="fetchRequests()"> GET</Button>
      </div>

        <ProgressBar v-if="isLoading" mode="indeterminate" class="progressbar"/>
    </div>
  </div>

  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <ul v-if="isLoggedIn">
        <li v-for="([uri, store], index) of requests" :key="index">
          <p>Request #{{ index }}: {{ uri }}</p>
          <p>Date : {{ getObject(store!, DCT('modified')) }} </p>
          <Button @click="processRequest(uri)">Do Processing</Button>
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

.p-inputgroup {
  padding-bottom: 0;
}

.progressbar {
  height: 2px;
  border-radius: 0 0 3px 3px;
  transform: translateY(-2px);
}
</style>
