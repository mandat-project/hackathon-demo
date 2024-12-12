<template>
  <div class="session.login-button" @click="isDisplaingIDPs = !isDisplaingIDPs">
    <slot>
      <Button class="p-button-text p-button-rounded">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 20 20"
        >
          <path
            fill="#3B3B3B"
            fill-opacity=".9"
            d="M10 1a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-9-9Z"
          />
          <path
            fill="#fff"
            d="M10 2c4.411 0 8 3.589 8 8s-3.589 8-8 8-8-3.589-8-8 3.589-8 8-8Z"
          />
          <path
            fill="#00451D"
            fill-opacity=".9"
            d="M15.946 15.334C15.684 13.265 14.209 12 11.944 12H8.056c-2.265 0-3.74 1.265-4.001 3.334A7.97 7.97 0 0 0 10 18a7.975 7.975 0 0 0 5.946-2.666ZM10 4c-1.629 0-3 .969-3 3 0 1.155.664 4 3 4 2.143 0 3-2.845 3-4 0-1.906-1.543-3-3-3Z"
          />
          <path
            fill="#7AD200"
            d="M8 7c0-1.74 1.253-2 2-2 .969 0 2 .701 2 2 0 .723-.602 3-2 3-1.652 0-2-2.507-2-3Zm3.944 6H8.056C6.222 13 5 14 5 16v.235A7.954 7.954 0 0 0 10 18a7.954 7.954 0 0 0 5-1.765V16c0-2-1.222-3-3.056-3Z"
          />
        </svg>
      </Button>
    </slot>
  </div>
  <Dialog
    :visible="isDisplaingIDPs"
    position="topright"
    header="Identity Provider"
    :closable="false"
    :draggable="false"
  >
    <div id="idps">
      <div class="idp p-inputgroup">
        <InputText
          placeholder="https://your.idp"
          type="text"
          v-model="idp"
          @keyup.enter="session.login(idp, redirect_uri)"
        />
        <Button severity="secondary" @click="session.login(idp, redirect_uri)">
          ></Button
        >
      </div>
      <Button
        class="idp"
        severity="primary"
        @click="
          idp = 'https://solid.aifb.kit.edu';
          session.login(idp, redirect_uri);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://solid.aifb.kit.edu
      </Button>
      <Button
        class="idp"
        severity="secondary"
        @click="
          idp = 'https://solidcommunity.net';
          session.login(idp, redirect_uri);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://solidcommunity.net
      </Button>
      <Button
        class="idp"
        severity="secondary"
        @click="
          idp = 'https://solidweb.org';
          session.login(idp, redirect_uri);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://solidweb.org
      </Button>
      <Button
        class="idp"
        severity="secondary"
        @click="
          idp = 'https://solidweb.me';
          session.login(idp, redirect_uri);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://solidweb.me
      </Button>
      <Button
        class="idp"
        severity="secondary"
        @click="
          idp = 'https://inrupt.net';
          session.login(idp, redirect_uri);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://inrupt.net
      </Button>
    </div>
    <!-- <template #footer> -->
    <div class="flex justify-content-between my-4">
      <Button label="Get a Pod!" severity="secondary" @click="GetAPod" />
      <Button
        label="close"
        icon="pi pi-times"
        iconPos="right"
        severity="secondary"
        @click="isDisplaingIDPs = !isDisplaingIDPs"
      />
    </div>
    <!-- </template> -->
  </Dialog>
</template>

<script lang="ts">
import { useSolidSession } from "@datev-research/mandat-shared-composables";
import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "session.loginButton",
  setup() {
    const { session } = useSolidSession();
    const isDisplaingIDPs = ref(false);
    const idp = ref("");
    const redirect_uri = window.location.href;
    const GetAPod = () => {
      window
        .open("https://solidproject.org//users/get-a-pod", "_blank")
        ?.focus();
      // window.close();
    };
    return { session, isDisplaingIDPs, idp, redirect_uri, GetAPod };
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#idps {
  display: flex;
  flex-direction: column;
}

.idp {
  margin-top: 5px;
  margin-bottom: 5px;
}
</style>
