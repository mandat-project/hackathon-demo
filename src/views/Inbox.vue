<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <LDNs v-if="isLoggedIn" />
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
import LDNs from "@/components/inbox/LDNs.vue";
import { useSolidSession } from "@/composables/useSolidSession";
import router from "@/router";

import { defineComponent, toRefs } from "vue";

export default defineComponent({
  name: "Inbox",
  components: {  },
  setup() {
    const { sessionInfo } = useSolidSession();
    const { isLoggedIn } = toRefs(sessionInfo);

    const speedDialActions = [
      {
        label: "Back.",
        icon: "pi pi-arrow-circle-left",
        command: () => router.push("/"),
      },
    ];
    return { isLoggedIn, speedDialActions };
  },
});
</script>

<style  scoped>
.grid {
  margin: 5px;
}
</style>