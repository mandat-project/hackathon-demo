<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <div class="p-inputgroup">
        <InputText
            placeholder="GET my request."
            v-model="containerUri"
            @keyup.enter="getRequestsContainer(containerUri)"
        />
        <Button @click="getRequestsContainer(containerUri)"> GET</Button>
      </div>

      <div class="progressbarWrapper">
        <ProgressBar v-if="isLoading" mode="indeterminate"/>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <ul v-if="isLoggedIn">
        <li v-for="([uri, store], index) of requestStores" :key="index">
          <p>Request #{{ index }}: {{ uri }}</p>
          <p>Target-Uri: {{ getObject(store, EX('hasDataProcessed')) }}</p>
          <Button @click="processRequest(uri)">Do Processing</Button>
        </li>
      </ul>
      <span v-else> 401 Unauthenticated : Login using the button in the top-right corner! </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {useSolidSession} from "@/composables/useSolidSession";
import {getResource, parseToN3, putResource, createResource} from "@/lib/solidRequests";
import {ref, toRefs} from "vue";
import {EX, LDP} from "@/lib/namespaces";
import {Quad, Store} from 'n3';

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const {isLoggedIn} = toRefs(sessionInfo);
const isLoading = ref(false);

const containerUri = ref("https://sme.solid.aifb.kit.edu/data-requests/");
const requestStores = ref(new Map<string, Store | null>());

function getRequestsContainer() {
  getResourceAsStore(containerUri.value).then(containerStore => getObjects(containerStore, LDP('contains'))
      .forEach(requestUri => {
        getResourceAsStore(requestUri).then(requestStore => {
          requestStores.value.set(requestUri, requestStore);
        })
      })
  );
}

async function processRequest(key: string) {
  const store = requestStores.value.get(key);
  if (store) {
    const targetUri = getObject(store, EX('hasDataProcessed'));
    const processedDataBody = "@prefix ex: <http://example.org/vocab/datev/credit#>. <> a ex:ProcessedData .";
    await putResource(targetUri, processedDataBody, authFetch.value);

    //LDN with targetUri as msgbody 
    await createResource("https://sme.solid.aifb.kit.edu/inbox/", targetUri, authFetch.value);
    
  }
}

// HELPER-FUNCTIONS

function getResourceAsStore(uri: string): Promise<any> {
  isLoading.value = true;
  return getResource(uri, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetch!",
          detail: err,
          life: 5000,
        });
        isLoading.value = false;
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then(txt => parseToN3(txt, uri))
      .then(n3 => n3.store)
      .finally(() => {
        isLoading.value = false;
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

<style scoped>
.grid {
  margin: 5px;
}

.p-inputgroup {
  padding-bottom: 0px;
}

.border {
  border: 1px solid var(--surface-d);
  border-radius: 3px;
}

.border:hover {
  border: 1px solid var(--primary-color);
}

.progressbarWrapper {
  height: 2px;
  padding: 0px 9px 0px 9px;
  transform: translate(0, -1px);
}

.p-progressbar {
  height: 2px;
  padding-top: 0px;
  border-top-right-radius: 0;
  border-top-left-radius: 0;
}
</style>