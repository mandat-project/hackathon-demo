<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <div class="p-inputgroup">
        <InputText
            placeholder="GET my request."
            v-model="requestUri"
            @keyup.enter="getDataRequests"
        />
        <Button @click="getDataRequests"> GET</Button>
      </div>
      <div class="p-inputgroup">
        <InputText
            placeholder="POST processed data to..."
            v-model="processedUri"
        />
        <Button> POST</Button>
      </div>
      <div class="progressbarWrapper">
        <ProgressBar v-if="isLoading" mode="indeterminate"/>
      </div>
    </div>
  </div>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <ul v-if="isLoggedIn && store">
        <li v-for="requestId in getRequestIds()" :key="requestId">{{ requestId.value }}</li>
      </ul>
      <span v-else> 401 Unauthenticated : Login using the button in the top-right corner! </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {useSolidSession} from "@/composables/useSolidSession";
import {getResource, parseToN3} from "@/lib/solidRequests";
import {ref, toRefs} from "vue";
import {LDP} from "@/lib/namespaces";

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const {isLoggedIn, webId} = toRefs(sessionInfo);
const isLoading = ref(false);

const requestUri = ref("https://max.solid.aifb.kit.edu/requests/");
const processedUri = ref("https://max.solid.aifb.kit.edu/processed/");

const content = ref("");
const store = ref();

function getDataRequests(): Promise<any> {
  isLoading.value = true;
  return getResource(requestUri.value, authFetch.value)
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
      .then(txt => {
        console.log(txt)
        return parseToN3(txt, requestUri.value)
      })
      .then(n3 => {
        console.log(n3.store.getObjects(requestUri.value, LDP("contains"), null));
        store.value = n3.store
      })
      .finally(() => {
        isLoading.value = false;
      });
}

function getRequestIds() {
  return store.value.getObjects(requestUri.value, LDP("contains"), null);
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