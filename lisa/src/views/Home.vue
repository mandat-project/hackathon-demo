<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <div class="p-inputgroup">
        <InputText placeholder="A URI to do actions on." v-model="uri" @keyup.enter="fetch" />
        <Button @click="fetch"> GET </Button>
      </div>
      <div class="progressbarWrapper">
        <ProgressBar v-if="isLoading" mode="indeterminate" />
      </div>
    </div>
  </div>
  <div class="demands">
    <span>
      <h3> Demands </h3>
      <ol>
        <DemandProcessor :uri="demandURI" v-for="demandURI in demands" :key="demandURI" />
      </ol>
    </span>
  </div>
</template>

<script lang="ts">
import { useToast } from "primevue/usetoast";
import { useSolidSession } from "@/composables/useSolidSession";
import { createResource, getResource, postResource, parseToN3, getLocationHeader, patchResource } from "@/lib/solidRequests";
import { computed, defineComponent, ref, toRefs, watch } from "vue";
import router from "@/router";
import { LDP, CREDIT } from "@/lib/namespaces";
import DemandProcessor from "../components/DemandProcessor.vue";



export default defineComponent({
  name: "Home",
  components: { DemandProcessor },
  setup(props, context) {
    const toast = useToast();
    const { authFetch, sessionInfo } = useSolidSession();
    const { isLoggedIn, webId } = toRefs(sessionInfo);
    const isLoading = ref(false);

    // uri of the information resource
    const uri = ref("");
    uri.value = "https://bank.solid.aifb.kit.edu/credits/demands/";
    // watch(
    //   () => inbox.value,
    //   () => (uri.value = inbox.value),
    //   { immediate: true }
    // );
    const isHTTP = computed(
      () => uri.value.startsWith("http://") || uri.value.startsWith("https://")
    );
    // content of the information resource
    const content = ref("");
    //   content.value =
    //     "This is a demo resource, which you only have access to after you 'unlock' it with a Verifiable Credential issued by the creator of this demo: Alice aka. Christoph aka. uvdsl :)\n\nClick `GET` to access the resource.\n\n    If you get a 401, log in\n                               (button at the top right).\n\n    If you get a 403, unlock the resource\n                               (button at the bottom).";
    // watch(
    //   () => inbox.value,
    //   () => (content.value = inbox.value !== "" ? "<#this> a <#demo>." : ""),
    //   { immediate: true }
    // );
    // get content of information resource
    let demands = ref()
    const fetch = async () => {
      if (!isHTTP.value) {
        return;
      }
      isLoading.value = true;
      await getResource(uri.value, authFetch.value)
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
        .then((resp) => resp.text()).then((txt) => {
          return parseToN3(txt, uri.value)
        }).then((parsedN3) => {
          return parsedN3.store;
        }).then((store) => {
          demands.value = store.getObjects(uri.value, LDP("contains"), null).map((node) => node.value);
        })
        .finally(() => {
          isLoading.value = false;
        })
    };




    return {
      uri,
      fetch,
      content,
      isLoading,
      isLoggedIn,
      demands,

    };
  },
});


</script>

<style  scoped>
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

.demands ol li {
  margin-bottom: 1em;
}
</style>