<template>
  <Card
    class="mt-6"
    style="
      width: 50%;
      margin-top: 2rem;
      display: block;
      margin-left: auto;
      margin-right: auto;
    "
  >
    <template #content>
      <p style="text-align: center">
        401 Unauthenticated : Click
        <span class="redirect" @click="redirectToLogin()">here</span> to login
        or use the button in the top-right corner!
      </p>
    </template>
  </Card>
</template>
<style scoped>
.redirect {
  color: #007577;
  cursor: pointer;
  font-style: italic;
}
</style>
<script setup lang="ts">
import { useSolidSession } from "@datev-research/mandat-shared-composables";
const { session } = useSolidSession();
const redirect_uri = window.location.href;

function redirectToLogin() {
  const idp = "https://solid.aifb.kit.edu";
  session.login(idp, redirect_uri);
}
</script>
