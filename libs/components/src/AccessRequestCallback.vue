<template>
    <div>
        Access Request has been handled. You are being redirected. Hang on.
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ uri: string, result: string, onResult: (uri: string, result: string) => void }>(); // access request URI and decision result
if (typeof props.onResult === 'function') {
  props.onResult(props.uri, props.result);
}
</script>
