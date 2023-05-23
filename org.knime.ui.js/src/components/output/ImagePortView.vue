<script>
export default {
  inject: ["getKnimeService"],
  props: {
    initialData: {
      type: String,
      required: true,
    },
  },
  computed: {
    knimeService() {
      return this.getKnimeService();
    },
    getImageUrl() {
      const baseUrl = this.knimeService?.extensionConfig?.resourceInfo?.baseUrl;
      return this.$store.getters["api/uiExtResourceLocation"]({
        resourceInfo: {
          baseUrl,
          path: this.initialData,
        },
      });
    },
  },
};
</script>

<template>
  <div class="scroll-container">
    <img :src="getImageUrl" alt="" />
  </div>
</template>
