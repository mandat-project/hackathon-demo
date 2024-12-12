<template>
  <section>
    <header class="w-full md:w-11 lg:w-10 xl:w-9 mx-auto mt-7">
      <h1
        class="text-petrol-650 px-3 font-normal text-4xl md:text-6xl gap-2 flex align-items-center"
      >
        Access Manager
        <Button
          icon="pi pi-refresh"
          class="p-button-text p-button-rounded p-button-icon-only"
          @click="reloadFlag = !reloadFlag"
        />
      </h1>
    </header>

    <div class="flex flex-column gap-5 w-full md:w-11 xl:w-9 mx-auto my-5">
      <article
        v-for="accessRequestResource in displayAccessRequests"
        :key="accessRequestResource + reloadFlag"
      >
        <Suspense>
          <AccessRequest
            :informationResourceURI="accessRequestResource"
            :redirect="redirect"
            :accessReceiptContainer="accessReceiptContainer"
            :accessAuthzContainer="accessAuthzContainer"
            :dataAuthzContainer="dataAuthzContainer"
            @createdAccessReceipt="refreshAccessReceiptInformationResources"
          />
          <template #fallback>
            <Card class="h-15rem">
              <template #content>
                <Skeleton width="10rem" class="mb-2"></Skeleton>
                <Skeleton width="5rem" class="mb-2"></Skeleton>
                <Skeleton class="mb-2"></Skeleton>
                <Skeleton width="2rem" class="mb-2"></Skeleton>
                <span>
                  {{ $t("loadingAuthorization") }}
                  {{
                    accessRequestResource.split("/")[
                      accessRequestResource.split("/").length - 1
                    ]
                  }}
                </span>
              </template>
            </Card>
          </template>
        </Suspense>
      </article>

      <article
        v-for="accessReceiptResource in accessReceiptInformationResources"
        :key="accessReceiptResource + reloadFlag"
      >
        <Suspense>
          <AccessReceipt
            :informationResourceURI="accessReceiptResource"
            :accessAuthzContainer="accessAuthzContainer"
            :redirect="redirect"
            :accessAuthzArchiveContainer="accessAuthzArchiveContainer"
            @isReceiptForRequests="addRequestsToHandled"
          />
          <template #fallback>
            <Card>
              <template #content>
                <Skeleton width="10rem" class="mb-2"></Skeleton>
                <Skeleton width="5rem" class="mb-2"></Skeleton>
                <Skeleton class="mb-2"></Skeleton>
                <Skeleton width="2rem" class="mb-2"></Skeleton>
                <span>
                  {{ $t("loadingAccessReceipt") }}
                  {{
                    accessReceiptResource.split("/")[
                      accessReceiptResource.split("/").length - 1
                    ]
                  }}
                </span>
              </template>
            </Card>
          </template>
        </Suspense>
      </article>
    </div>
  </section>
</template>

<style scoped></style>

<script lang="ts" setup>
import AccessReceipt from "@/components/receipts/AccessReceipt";
import AccessRequest from "@/components/requests/AccessRequest";
import {
  useSolidProfile,
  useSolidSession,
} from "@datev-research/mandat-shared-composables";
import {
  AUTH,
  createContainer,
  getContainerItems,
  getResource,
  parseToN3,
} from "@datev-research/mandat-shared-solid-requests";
import { Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const toast = useToast();

const { t } = useI18n();

const { session } = useSolidSession();
const { accessInbox, storage } = useSolidProfile();

const props = defineProps(["inspectedAccessRequestURI", "redirect"]);

// keep track of access requests
const accessRequestInformationResources = ref<Array<string>>([]);
// handled access requests (not to display)
const handledAccessRequests = ref<Array<string>>([]);
// only display not yet handled
const displayAccessRequests = computed(() =>
  accessRequestInformationResources.value.filter(
    (r) => !handledAccessRequests.value.map((h) => h.split("#")[0]).includes(r)
  )
);

/**
 * ! Dirty hack for archiving stuff
 * TODO re-visit.
 */

// create data authorization container if needed
const dataAuthzContainerName = "data-authorizations";
const dataAuthzContainer = computed(
  () => storage.value + dataAuthzContainerName + "/"
);
// create access authorization container if needed
const accessAuthzContainerName = "authorization-registry";
const accessAuthzContainer = computed(
  () => storage.value + accessAuthzContainerName + "/"
);
// create access authorization container if needed
const accessAuthzArchiveContainerName = "authorization-archive";
const accessAuthzArchiveContainer = computed(
  () => storage.value + accessAuthzArchiveContainerName + "/"
);
// create access receipt container if needed
const accessReceiptContainerName = "authorization-receipts";
const accessReceiptContainer = computed(
  () => storage.value + accessReceiptContainerName + "/"
);

watch(
  () => storage.value,
  async () => {
    if (!storage.value) {
      return;
    }
    getResource(dataAuthzContainer.value, session)
      .catch(() =>
        createContainer(storage.value, dataAuthzContainerName, session)
      )
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: t("toast.error.createDataAuthorization"),
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      });
    getResource(accessAuthzContainer.value, session)
      .catch(() =>
        createContainer(storage.value, accessAuthzContainerName, session)
      )
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: t("toast.error.createAccessDataAuthorization"),
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      });
    getResource(accessAuthzArchiveContainer.value, session)
      .catch(() =>
        createContainer(storage.value, accessAuthzArchiveContainerName, session)
      )
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: t("toast.error.createAccessReceipt"),
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      });
    getResource(accessReceiptContainer.value, session)
      .catch(() =>
        createContainer(storage.value, accessReceiptContainerName, session)
      )
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: t("toast.error.failedCreateAccessReceipt"),
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      });
  },
  { immediate: true }
);

// setup done, now do stuff

/**
 * Retrieve access requests from an access inbox
 * @param accessInbox
 */
async function getAccessRequestInformationResources(accessInbox: string) {
  if (!accessInbox) {
    return [];
  }
  if (props.inspectedAccessRequestURI) {
    return [props.inspectedAccessRequestURI.split("#")[0]];
  }
  return await getContainerItems(accessInbox, session);
}

// once an access inbox is available, get the access requests from there
// except when we have a specific access request to focus on. then only focus on that one.
watch(
  () => accessInbox.value,
  () => {
    getAccessRequestInformationResources(accessInbox.value).then(
      (newAccessRequestResources) =>
        accessRequestInformationResources.value.push(
          ...newAccessRequestResources
        )
    );
    if (!props.inspectedAccessRequestURI) {
      // TODO Anzeige schön machen: Focus item (und vllt trotzdem im Hintergrund Dinge laden? Oder eigene Komponente für Focus/Übersicht)
      getAccessReceiptInformationResources().then((newAccessReceipts) =>
        accessReceiptInformationResources.value.push(...newAccessReceipts)
      );
    } else {
      getAccessReceiptInformationResourcesForAccessRequest(
        props.inspectedAccessRequestURI
      ).then((accessReceipts) =>
        accessReceiptInformationResources.value.push(...accessReceipts)
      );
    }
  },
  { immediate: true }
);

// keep track of access receipts
const accessReceiptInformationResources = ref<Array<string>>([]);
/**
 * get the access receipts
 */
async function getAccessReceiptInformationResources() {
  return await getContainerItems(accessReceiptContainer.value, session);
}

async function getAccessReceiptInformationResourcesForAccessRequest(
  accessRequestURI: string
) {
  const accessReceiptStore = new Store();
  const accessReceiptContainerItems =
    await getAccessReceiptInformationResources();

  await fillItemStoresIntoStore(
    accessReceiptContainerItems,
    accessReceiptStore
  );

  return accessReceiptStore
    .getSubjects(AUTH("hasAccessRequest"), accessRequestURI, null)
    .map((subject) => subject.value);
}

/**
 * when an access receipt states that it is associated to specific access requests
 * @param requests
 */
function addRequestsToHandled(requests: string[]) {
  handledAccessRequests.value.push(...requests);
}

/**
 * Util Functions
 */
async function fillItemStoresIntoStore(itemUris: string[], store: Store) {
  const itemStores: Store[] = await Promise.all(
    itemUris.map((item) => fetchStoreOf(item))
  );
  itemStores
    .map((itemStore) => itemStore.getQuads(null, null, null, null))
    .map((quads) => store.addQuads(quads));
}

async function fetchStoreOf(uri: string): Promise<Store> {
  return getResource(uri, session)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: t("toast.error.fetchDemand"),
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then((resp) => resp.data)
    .then((txt) => parseToN3(txt, uri))
    .then((parsedN3) => parsedN3.store);
}

/**
 * refresh view
 */
const reloadFlag = ref(false);
watch(
  () => reloadFlag.value,
  () => {
    refreshAccessRequestInformationResources();
    refreshAccessReceiptInformationResources();
  }
);
async function refreshAccessRequestInformationResources() {
  const newListOfAccessRequests = await getAccessRequestInformationResources(
    accessInbox.value
  );
  accessRequestInformationResources.value.length = 0;
  accessRequestInformationResources.value.push(...newListOfAccessRequests);
}
async function refreshAccessReceiptInformationResources() {
  const newListOfAccessReceipts = await getAccessReceiptInformationResources();
  accessReceiptInformationResources.value.length = 0;
  accessReceiptInformationResources.value.push(...newListOfAccessReceipts);
}
</script>
