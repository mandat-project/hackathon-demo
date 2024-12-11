<template>
  <div class="logout-button" @click="session.logout()">
    <slot>
      <Button class="p-button-text p-button-rounded ml-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 20 20"
        >
          <path
            fill="#003D66"
            fill-opacity=".9"
            d="M13 5v3H5v4h8v3l5.25-5L13 5Z"
          />
          <path
            fill="#61C7F2"
            d="M14 7.333 16.8 10 14 12.667V11H6V9h8V7.333Z"
          />
          <path fill="#3B3B3B" fill-opacity=".9" d="M2 3V1H1v18h1V3Z" />
        </svg>
      </Button>
    </slot>
  </div>
</template>

<script lang="ts">
import { useSolidSession } from "@datev-research/mandat-shared-composables";
import { defineComponent } from "vue";

export default defineComponent({
  name: "LoginButton",
  setup() {
    const { session } = useSolidSession();
    return { session };
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
