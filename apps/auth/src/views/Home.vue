<template>
  <section>
    <header class="w-full md:w-11 lg:w-10 xl:w-9 mx-auto mt-7">
      <h1>
        {{ headingTitle }}
      </h1>
    </header>

  <div class="flex flex-column gap-5 w-full md:w-11 xl:w-9 mx-auto my-5">
    <article v-for="accessRequestResource in displayAccessRequests" :key="accessRequestResource + reloadFlag">
      <Suspense>
        <AccessRequest :informationResourceURI="accessRequestResource" :redirect="redirect" />
        <template #fallback>
          <Card class="h-15rem">
            <template #content>
              <Skeleton width="10rem" class="mb-2"></Skeleton>
              <Skeleton width="5rem" class="mb-2"></Skeleton>
              <Skeleton class="mb-2"></Skeleton>
              <Skeleton width="2rem" class="mb-2"></Skeleton>
              <span>
                Loading Authorization {{ accessRequestResource.split("/")[accessRequestResource.split("/").length - 1] }}
              </span>
            </template>
          </Card>
        </template>
      </Suspense>
    </article>

    <article v-for="accessReceiptResource in accessReceiptInformationResources" :key="accessReceiptResource + reloadFlag">
      <Suspense>
        <AccessReceipt :informationResourceURI="accessReceiptResource" :accessAuthzContainer="accessAuthzContainer"
                       :redirect="redirect" :accessAuthzArchiveContainer="accessAuthzArchiveContainer"
                       @isReceiptForRequests="addRequestsToHandled"/>
        <template #fallback>
          <Card>
            <template #content>
              <Skeleton width="10rem" class="mb-2"></Skeleton>
              <Skeleton width="5rem" class="mb-2"></Skeleton>
              <Skeleton class="mb-2"></Skeleton>
              <Skeleton width="2rem" class="mb-2"></Skeleton>
              <span>
                Loading Access Receipt {{ accessReceiptResource.split("/")[accessReceiptResource.split("/").length - 1] }}
              </span>
            </template>
          </Card>
        </template>
      </Suspense>
    </article>

  </div>
  </section>
</template>

<style scoped>
</style>

<script lang="ts" setup>
import AccessReceipt from "@/components/AccessReceipt.vue";
import AccessRequest from "@/components/AccessRequest.vue";
import {useAuthorizations} from "@shared/composables";
import {useToast} from "primevue/usetoast";
import {computed, ref, watch} from "vue";

const toast = useToast();

const props = defineProps(["inspectedAccessRequestURI", "redirect"]);
const headingTitle = ref('Access Manager')

const {
  reload,

  accessRequestInformationResources,
  accessReceiptInformationResources,

  // Deprecated
  accessAuthzContainer,
  accessAuthzArchiveContainer,
} = useAuthorizations(props.inspectedAccessRequestURI);


// only display not yet handled
const displayAccessRequests = computed(() =>
  accessRequestInformationResources.value.filter(r => !handledAccessRequests.value.map(h => h.split('#')[0]).includes(r))
);
const handledAccessRequests = ref<string[]>([]);


/**
 * when an access receipt states that it is associated to specific access requests
 * @param requests
 */
function addRequestsToHandled(requests: string[]) {
  handledAccessRequests.value = [...handledAccessRequests.value, ...requests];
}

/**
 * refresh view
 */
const reloadFlag = ref(false);
watch(reloadFlag, () => reload());

</script>
