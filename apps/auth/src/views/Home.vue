<template>
  <section>
    <header class="w-full md:w-11 lg:w-10 xl:w-9 mx-auto mt-7">
      <h1 class="flex align-items-center gap-2">
        {{ headingTitle }}
        <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
                @click="reloadFlag = !reloadFlag" />
      </h1>
    </header>

  <div class="flex flex-column gap-5 w-full md:w-11 xl:w-9 mx-auto my-5">
    <article v-for="accessRequestResource in accessRequests" :key="accessRequestResource + reloadFlag">
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
        <AccessReceipt :informationResourceURI="accessReceiptResource"
                       :redirect="redirect"/>
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
import AccessReceipt from "@/components/receipts/AccessReceipt";
import AccessRequest from "@/components/requests/AccessRequest";
import {useAuthorizations} from "@shared/composables";
import {useToast} from "primevue/usetoast";
import {ref, watch} from "vue";

const toast = useToast();

const props = defineProps(["inspectedAccessRequestURI", "redirect"]);
const headingTitle = ref('Access Manager')

const {
  reload,

  accessReceiptInformationResources,
  accessRequests,

} = useAuthorizations(props.inspectedAccessRequestURI);



/**
 * refresh view
 */
const reloadFlag = ref(false);
watch(reloadFlag, () => reload());

</script>
