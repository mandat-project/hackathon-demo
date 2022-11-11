<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <LDNs v-if="isLoggedIn"/>
    </div>
  </div>
  <div>
    <SpeedDial
        showIcon="pi pi-ellipsis-h"
        :model="speedDialActions"
        type="linear"
        direction="left"
        :tooltipOptions="{ position: 'top' }"
    />
  </div>
</template>

<script lang="ts">
import {useSolidSession} from "@shared/composables";
import router from "../router";

import {defineComponent, toRefs} from "vue";
import {LDNs} from "@shared/components";

export default defineComponent({
  name: "Inbox",
  components: {LDNs},
  setup() {
    const {sessionInfo} = useSolidSession();
    const {isLoggedIn} = toRefs(sessionInfo);

    const speedDialActions = [
      {
        label: "Back.",
        icon: "pi pi-arrow-circle-left",
        command: () => router.push("/"),
      },
    ];
    return {isLoggedIn, speedDialActions};
  },
});
</script>

<style scoped>
.grid {
  margin: 5px;
}
</style>