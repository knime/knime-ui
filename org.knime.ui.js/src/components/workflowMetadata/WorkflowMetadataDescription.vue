<script>
import Description from "webapps-common/ui/components/Description.vue";
import MetadataPlaceholder from "./MetadataPlaceholder.vue";

export default {
  components: {
    Description,
    MetadataPlaceholder,
  },
  props: {
    description: {
      type: String,
      default: null,
    },
  },
};
</script>

<template>
  <div class="description">
    <Description v-if="description" :text="description" />
    <MetadataPlaceholder v-else padded text="No description has been set yet" />
  </div>
</template>

<style lang="postcss" scoped>
.description {
  margin-bottom: 20px;
  font-size: 16px;
}
</style>
