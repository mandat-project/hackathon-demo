<template>
  <div class="grid">
    <div class="col-12 lg:col-12 lg:col-offset-0">
      <h2>Your Access Manager</h2>
      <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
        @click=" reloadFlag = !reloadFlag" />
    </div>
    <div class="col-12 lg:col-12 lg:col-offset-0">
      <div v-for="accessReceiptResource in accessReceiptInformationResources" :key="accessReceiptResource + reloadFlag"
        class="p-card" style="margin: 5px">
        <Suspense>
          <AccessReceipt :informationResourceURI="accessReceiptResource" :accessAuthzContainer="accessAuthzContainer" :redirect="redirect"
            :accessAuthzArchiveContainer="accessAuthzArchiveContainer" @isReceiptForRequests="addRequestsToHandled" />
          <template #fallback>
            <span>
              Loading {{ accessReceiptResource.split("/")[accessReceiptResource.split("/").length - 1] }}
            </span>
          </template>
        </Suspense>
      </div>
      <div v-for="accessRequestResource in displayAccessRequests" :key="accessRequestResource + reloadFlag" class="p-card"
        style="margin: 5px">
        <Suspense>
          <AccessRequest :informationResourceURI="accessRequestResource" :redirect="redirect"
            :accessReceiptContainer="accessReceiptContainer" :accessAuthzContainer="accessAuthzContainer"
            :dataAuthzContainer="dataAuthzContainer" @createdAccessReceipt="refreshAccessReceipts" />
          <template #fallback>
            <span>
              Loading {{ accessRequestResource.split("/")[accessRequestResource.split("/").length - 1] }}
            </span>
          </template>
        </Suspense>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import AccessRequest from "../comoponents/AccessRequest.vue";
import AccessReceipt from "../comoponents/AccessReceipt.vue";
import {AUTH, createContainer, getContainerItems, getResource, parseToN3} from "@shared/solid";
import { useSolidProfile, useSolidSession } from "@shared/composables";
import { computed, ref, watch } from "vue";
import { useToast } from "primevue/usetoast";
import {Store} from "n3";

const toast = useToast();

const { authFetch } = useSolidSession();
const { accessInbox, storage } = useSolidProfile();

const props = defineProps(["inspectedAccessRequestURI", "redirect"]);

// keep track of access requests
const accessRequestInformationResources = ref<Array<string>>([]);
// handled access requests (not to display)
const handledAccessRequests = ref<Array<string>>([]);
// only display not yet handled
const displayAccessRequests = computed(() =>
    accessRequestInformationResources.value.filter(r => !handledAccessRequests.value.map(h => h.split('#')[0]).includes(r))
)

/**
 * Retrieve access requests from an access inbox
 * @param accessInbox
 */
async function getAccessRequests(accessInbox: string) {
  if (!accessInbox) {
    return [];
  }
  if (props.inspectedAccessRequestURI) {
    return [props.inspectedAccessRequestURI.split('#')[0]]
  }
  return await getContainerItems(accessInbox, authFetch.value)
}

// once an access inbox is available, get the access requests from there
// except when we have a specific access request to focus on. then only focus on that one.
watch(
  () => accessInbox.value,
  () => {
    getAccessRequests(accessInbox.value).then((newAccessRequestResources) =>
      accessRequestInformationResources.value.push(...newAccessRequestResources)
    )
    if (!props.inspectedAccessRequestURI) {
      // TODO Anzeige schön machen: Focus item (und vllt trotzdem im Hintergrund Dinge laden? Oder eigene Komponente für Focus/Übersicht)
      getAccessReceipts().then(newAccessReceipts =>
        accessReceiptInformationResources.value.push(...newAccessReceipts))
    } else {
      getAccessReceiptsForAccessRequest(props.inspectedAccessRequestURI).then(accessReceipts =>
        accessReceiptInformationResources.value.push(...accessReceipts));
    }
  }
);


// keep track of access receipts
const accessReceiptInformationResources = ref<Array<string>>([]);
/**
 * get the access receipts
 */
async function getAccessReceipts() {
  return await getContainerItems(accessReceiptContainer.value, authFetch.value)
}

async function getAccessReceiptsForAccessRequest(accessRequestURI: string) {
  const accessReceiptStore = new Store();
  const accessReceiptContainerItems = await getAccessReceipts();

  await fillItemStoresIntoStore(accessReceiptContainerItems, accessReceiptStore)

  return accessReceiptStore.getSubjects(AUTH("hasAccessRequest"), accessRequestURI, null).map(subject => subject.value);
}


/**
 * when an access receipt states that it is associated to specific access requests
 * @param requests
 */
function addRequestsToHandled(requests: string[]) {
  handledAccessRequests.value.push(...requests)
}

/**
 * Util Functions
 */
async function fillItemStoresIntoStore(itemUris: string[], store: Store) {
  const itemStores: Store[] = await Promise.all(
    itemUris.map((item) => fetchStoreOf(item))
  )
  itemStores
    .map(itemStore => itemStore.getQuads(null, null, null, null))
    .map((quads) => store.addQuads(quads))
}

async function fetchStoreOf(uri: string): Promise<Store> {
  return getResource(uri, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Error on fetchDemand!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, uri))
    .then((parsedN3) => parsedN3.store);
}


/**
 * refresh view
 */
const reloadFlag = ref(false)
watch(() => reloadFlag.value, () => {
  refreshAccessRequests()
  refreshAccessReceipts()
}
)
async function refreshAccessRequests() {
  const newListOfAccessRequests = await getAccessRequests(accessInbox.value);
  accessRequestInformationResources.value.length = 0;
  accessRequestInformationResources.value.push(...newListOfAccessRequests);
}
async function refreshAccessReceipts() {
  const newListOfAccessReceipts = await getAccessReceipts();
  accessReceiptInformationResources.value.length = 0;
  accessReceiptInformationResources.value.push(...newListOfAccessReceipts);
}

/**
 * ! Dirty hack for archiving stuff
 * TODO re-visit.
 */

// create data authorization container if needed
const dataAuthzContainerName = "data-authorizations"
const dataAuthzContainer = computed(() => storage.value + dataAuthzContainerName + "/");
// create access authorization container if needed
const accessAuthzContainerName = "authorization-registry"
const accessAuthzContainer = computed(() => storage.value + accessAuthzContainerName + "/");
// create access authorization container if needed
const accessAuthzArchiveContainerName = "authorization-archive"
const accessAuthzArchiveContainer = computed(() => storage.value + accessAuthzArchiveContainerName + "/");
// create access receipt container if needed
const accessReceiptContainerName = "authorization-receipts"
const accessReceiptContainer = computed(() => storage.value + accessReceiptContainerName + "/");
watch(() => storage.value,
  async () => {
    if (!storage.value) { return }
    getResource(dataAuthzContainer.value, authFetch.value)
      .catch(() => createContainer(storage.value, dataAuthzContainerName, authFetch.value))
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Failed to create Data Authorization Container!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
    getResource(accessAuthzContainer.value, authFetch.value)
      .catch(() => createContainer(storage.value, accessAuthzContainerName, authFetch.value))
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Failed to create Access Authorization Container!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
    getResource(accessAuthzArchiveContainer.value, authFetch.value)
      .catch(() => createContainer(storage.value, accessAuthzArchiveContainerName, authFetch.value))
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Failed to create Access Receipt Container!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
    getResource(accessReceiptContainer.value, authFetch.value)
      .catch(() => createContainer(storage.value, accessReceiptContainerName, authFetch.value))
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Failed to create Access Receipt Container!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })

  })
</script>
