<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <a href="/demand">Create Demand</a>
    </div>
  </div>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <Textarea v-model="content" class="sizing" v-if="content" />
      <!-- Instead of textarea, Button where user can request VC from me for demo -->
      <Button v-else-if="isLoggedIn" label="Request Demo" />
      <span v-else> 401 Unauthenticated : Login using the button in the top-right corner! </span>
    </div>
  </div>
</template>

<script lang="ts">
import { useToast } from "primevue/usetoast";
import { useSolidSession } from "@/composables/useSolidSession";
import { createResource, getResource, postResource } from "@/lib/solidRequests";
import { computed, defineComponent, ref, toRefs, watch } from "vue";
import router from "@/router";

export default defineComponent({
  name: "Home",
  components: { },
  setup(props, context) {
    const toast = useToast();
    const { authFetch, sessionInfo } = useSolidSession();
    const { isLoggedIn, webId } = toRefs(sessionInfo);
    const isLoading = ref(false);

    // uri of the information resource
    const uri = ref("");
    uri.value = "https://ik1533.solidweb.org/conf/semantics/demo";
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
    const fetch = async () => {
      if (!isHTTP.value) {
        return;
      }
      isLoading.value = true;
      const txt = await getResource(uri.value, authFetch.value)
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
        .then((resp) => resp.text()); //;
      // //   const parsedN3 =
      // await parseToN3(txt, uri.value)
      //   .catch((err) => {
      //     toast.add({
      //       severity: "error",
      //       summary: "Parsing Error!",
      //       detail: err,
      //       life: 5000,
      //     });
      //     //   throw new Error(err);
      //   })
      // .finally(() => {
      content.value = txt;
      isLoading.value = false;
      // });
    };

    return {
      uri,
      fetch,
      content,
      isLoading,
      isLoggedIn
      
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
</style>