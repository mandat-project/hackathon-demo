<template>
  <div></div>
  <!-- <transition-group name="list" tag="md-list">
    <LDN
        :uri="ldn"
        :updateFlag="updateFlag"
        v-for="ldn in ldns"
        :key="ldn"
        class="list-item"
        @selected="select"
        :selectFlag="ldn === selectedLDN"
    />
  </transition-group> -->
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "LDNs",
  // components: {
  //   LDN,
  // },
  setup(props) {
    /*
    const {ldns} = useSolidInbox();
    const updateFlag = ref(false);

    watch(
        () => ldns.value,
        () => (updateFlag.value = !updateFlag.value)
    );

    const selectedLDN = ref();
    const select = (ldn: string) => {
      selectedLDN.value = ldn;
    };

    return {
      ldns,
      select,
      selectedLDN,
      updateFlag,
    };*/
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.list-item {
  transition: all 1s;
  display: inline-block;
  width: 100%;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(80%);
}

.list-leave-active {
  position: fixed;
}

.list-move {
  transition: all 1s;
}
</style>
