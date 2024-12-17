<template>
  <div class="card mb-4">
    <div class="border-round border-1 surface-border p-4 surface-card">
      <div class="grid mb-3">
        <div class="col-6">
          <Skeleton width="5rem" class="mb-2"></Skeleton>
          <Skeleton width="10rem" class="mb-2"></Skeleton>
        </div>
        <div class="col-6">
          <Skeleton width="5rem" class="mb-2"></Skeleton>
          <Skeleton width="10rem" class="mb-2"></Skeleton>
        </div>
      </div>
      <Skeleton width="100%" height="150px"></Skeleton>
      <div class="flex justify-content-between mt-3">
        <Skeleton width="4rem" height="2rem"></Skeleton>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
</script>