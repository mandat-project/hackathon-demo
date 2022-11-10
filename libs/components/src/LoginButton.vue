<template>
  <div class="login-button" @click="isDisplaingIDPs = !isDisplaingIDPs">
    <slot>
      <Button icon="pi pi-sign-in" class="p-button-rounded"/>
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
            @keyup.enter="login(idp)"
        />
        <Button @click="login(idp)"> ></Button>
      </div>
      <Button
          class="idp"
          @click="
          idp = 'https://solid.aifb.kit.edu/';
          login(idp);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://solid.aifb.kit.edu
      </Button>
      <Button
          class="idp"
          @click="
          idp = 'https://solidcommunity.net';
          login(idp);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://solidcommunity.net
      </Button>
      <Button
          class="idp"
          @click="
          idp = 'https://solidweb.org';
          login(idp);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://solidweb.org
      </Button>
      <Button
          class="idp"
          @click="
          idp = 'https://solidweb.me';
          login(idp);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://solidweb.me
      </Button>
      <Button
          class="idp"
          @click="
          idp = 'https://inrupt.net';
          login(idp);
          isDisplaingIDPs = !isDisplaingIDPs;
        "
      >
        https://inrupt.net
      </Button>
    </div>
    <!-- <template #footer> -->
    <div class="flex justify-content-between mt-4">
      <Button
          label="Get a Pod!"
          class="p-button-outlined p-button-rounded"
          @click="GetAPod"
      />
      <Button
          label="close"
          icon="pi pi-times"
          iconPos="right"
          class="p-button-outlined p-button-rounded"
          @click="isDisplaingIDPs = !isDisplaingIDPs"
      />
    </div>
    <!-- </template> -->
  </Dialog>
</template>

<script lang="ts">
import {defineComponent, ref} from "vue";
import {useSolidSession} from "@shared/composables";

export default defineComponent({
  name: "LoginButton",
  setup() {
    const {login} = useSolidSession();
    const isDisplaingIDPs = ref(false);
    const idp = ref("");
    const GetAPod = () => {
      window
          .open("https://solidproject.org//users/get-a-pod", "_blank")
          ?.focus();
      // window.close();
    };
    return {login, isDisplaingIDPs, idp, GetAPod};
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
