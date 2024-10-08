<script>
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    to: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      isMounted: false,
    };
  },
  mounted() {
    this.isMounted = true;
  },
});
</script>

<template>
  <Teleport v-if="isMounted" :to="`#${to}`">
    <slot />
  </Teleport>
</template>
