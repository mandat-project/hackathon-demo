<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <Button
        icon="pi pi-refresh"
        class="p-button-text p-button-rounded p-button-icon-only"
        @click="refreshAccessRequests"
      />
      <span>Your Access requests:</span>
    </div>
    <div class="col lg:col-6 lg:col-offset-3">
      <div class="accordion" id="accessAccordion">
        <Accordion :activeIndex="activeAccordionIndex">
          <AccordionTab
            v-for="accessRequestResource in accessRequestResources"
            :key="accessRequestResource"
            :header="
              accessRequestResource.substring(
                accessRequestResource.lastIndexOf('/') + 1
              )
            "
          >
            <AccessRequest
              :resourceURI="accessRequestResource"
              :redirect="redirect"
            />
          </AccordionTab>
        </Accordion>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import AccessRequest from "../comoponents/AccessRequest.vue";
import { getResource, LDP, parseToN3 } from "@shared/solid";
import { useSolidProfile, useSolidSession } from "@shared/composables";
import { ref, watch } from "vue";
import { useToast } from "primevue/usetoast";

import Accordion from "primevue/accordion";
import AccordionTab from "primevue/accordiontab";

const { authFetch } = useSolidSession();
const { accessInbox } = useSolidProfile();
const toast = useToast();

const props = defineProps(["inspectedAccessRequestURI", "redirect"]);
const activeAccordionIndex = ref(-1);

const accessRequestResources = ref<Array<string>>([]);
watch(
  () => accessInbox.value,
  () =>
    getAccessRequests(accessInbox.value).then((newAccessRequestResources) =>
      accessRequestResources.value.push(...newAccessRequestResources)
    )
);

async function getAccessRequests(accessInbox: string) {
  if (!accessInbox) {
    return [];
  }
  const accessInboxStore = await getResource(accessInbox, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Could not get access inbox!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, accessInbox))
    .then((parsedN3) => parsedN3.store);
  let accessInboxEntries = accessInboxStore.getObjects(
    null,
    LDP("contains"),
    null
  );
  if (props.inspectedAccessRequestURI) {
    activeAccordionIndex.value = 0;
    accessInboxEntries = accessInboxEntries.filter((value) =>
      props.inspectedAccessRequestURI.includes(value.id)
    );
  }
  return accessInboxEntries.map((term) => term.value);
}

async function refreshAccessRequests() {
  const newListOfAccessRequests = await getAccessRequests(accessInbox.value);
  accessRequestResources.value.length = 0;
  accessRequestResources.value.push(...newListOfAccessRequests);
}
</script>
