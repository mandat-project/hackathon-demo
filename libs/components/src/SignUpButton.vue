<template>
  <div class="signUp-button" @click="signUp">
    <slot>
      <Button>Sign Up for Solid!</Button>
    </slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "SignUpButton",
  setup() {
    const width = 1200;
    const height = 800;

    const signUp = () => {
      window.open(
        "https://solidproject.org//users/get-a-pod",
        "SignUp",
        `
      scrollbars=yes,
      top=${(screen.height - height) / 2}, 
      left=${(screen.width - width) / 2},
      width=${width}, 
      height=${height}
      `
      );
      // window.close();
    };
    return { signUp };
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped></style>
