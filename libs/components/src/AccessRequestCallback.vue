<template>
    <div>
        Access Request has been handled. You are being redirected. Hang on.
    </div>
</template>

<script setup lang="ts">
const props = defineProps({ uri: String, result: String, onResult: Function }); // access request URI and decision result
if (props.onResult !== undefined) props.onResult(props.uri, props.result);
</script>
