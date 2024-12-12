<template>
  <div></div>
  <!-- <Card class="mt-2 mb-2" :class="{ highlight: isSelected }" @click="select">
    <template #content>
      <div class="
          flex
          justify-content-end
          sm:justify-content-between
          align-items-start
        ">
        <div class="hidden sm:inline-block">
          <div class="text-primary uri-text">
            {{ uri }}
          </div>
          <Divider />
        </div>
        <div v-if="isSaveable" class="p-button p-button-outlined p-button-rounded" :class="{
          'p-button-danger': isVerified === false,
          'p-button-warning': isVerified === undefined,
        }" style="cursor: auto">
          <span class="mr-2">Signature</span>
          <i :class="{
            pi: true,
            'pi-thumbs-up': isVerified,
            'pi-thumbs-down': !isVerified,
            'pi-spin': isVerified === undefined,
          }" />
        </div>
      </div>
      <div class="ldn-text">
        <span v-if="!error">
          <pre>{{ displayShort ? ldn : ldnotification }}</pre>
        </span>
        <span v-else style="color: red">
          {{ error }}
        </span>
      </div>
      <div class="flex justify-content-between mt-2">
        <Button v-if="isSaveable" icon="pi  pi-save" class="p-button-outlined p-button-rounded p-button-raised" @click="
          save(JSON.stringify(ldnotification), authFetch).then(() =>
            deleteResource(uri, authFetch)
          )
          " />
        <Button v-else disabled icon="" class="p-button-rounded p-button-text" />

        <Button v-if="displayShort" icon="pi  pi-angle-double-down"
          class="p-button-text p-button-rounded p-button-raised p-button-info" @click="displayShort = false" />
        <Button v-else icon="pi  pi-angle-double-up"
          class="p-button-text p-button-rounded p-button-raised p-button-info" @click="displayShort = true" />

        <Button icon="pi pi-trash" class="p-button-text p-button-rounded p-button-raised p-button-danger"
          @click="deleteResource(uri, authFetch)" />
      </div>
    </template>
  </Card> -->
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "LDN",
  components: {},
  props: {
    uri: { default: "" },
    selectFlag: { default: false },
  },
  emits: ["selected"],
  setup(props, context) {
    /*
    const { authFetch } = useSolidSession();
    const { wallet } = useSolidProfile();

    const displayShort = ref(true);
    const isSaveable = ref(false);

    let ldn = ref("Message loading.");
    let ldnotification = ref("Message loading.");
    let contentType = ref();
    let error = ref();
    const isVerified = ref();

    getResource(props.uri, authFetch.value)
      .then((resp) => {
          const txt = resp.data
          if (
            !(resp.headers instanceof AxiosHeaders && resp.headers.has("Link"))
          ) {
            throw new Error(`Link Header at \`${resp.request.url}\` not set.`);
          }
          contentType.value = resp.headers.get("Content-type");
          switch (contentType.value) {
            case "application/ld+json":
              ldnotification.value = JSON.parse(txt); //["credentialSubject"];
              break;
            case "text/turtle":
              ldnotification.value = txt;
              ldn.value = txt;
              break;
            default:
              ldnotification.value = txt;
              ldn.value = txt;
          }
        })
      .catch((err) => (error.value = err));

    const save = async (
      content: string,
      axiosFetch?: (
        config: AxiosRequestConfig<any>,
        dpopPayload?: any
        ) => Promise<AxiosResponse<any, any>>
    ) => {
      return postResource(wallet.value, content, axiosFetch, {
        "Content-type": contentType.value,
      });
    };

    const isSelected = ref(false);
    watch(
      () => props.selectFlag,
      () => (isSelected.value = props.selectFlag)
    );
    const select = () => {
      isSelected.value = !isSelected.value;
      context.emit("selected", props.uri);
    };

    return {
      ldn,
      ldnotification,
      authFetch,
      deleteResource,
      error,
      save,
      isSelected,
      select,
      displayShort,
    }; */
  },
});
</script>

<style scoped>
.p-card {
  border-radius: 2rem;
}

.uri-text {
  white-space: pre-line;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: "Courier New", Courier, monospace;
}

.ldn-text {
  white-space: pre-line;
  font-family: "Courier New", Courier, monospace;
  word-break: break-word;
}

pre {
  white-space: pre-wrap;
  /* Since CSS 2.1 */
  white-space: -moz-pre-wrap;
  /* Mozilla, since 1999 */
  white-space: pre-wrap;
  /* Opera 4-6 */
  white-space: -o-pre-wrap;
  /* Opera 7 */
  word-wrap: break-word;
  /* Internet Explorer 5.5+ */
}

.highlight {
  box-shadow: 0 0 10px 5px var(--primary-color);
}
</style>
, AxiosRequestConfig, AxiosResponse, AxiosRequestConfig, AxiosResponse
