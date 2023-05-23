<script>
export default {
  props: {
    initialData: {
      type: Object,
      required: true,
    },
  },
};
</script>

<template>
  <iframe :src="initialData.src" :style="initialData.style" />
</template>
