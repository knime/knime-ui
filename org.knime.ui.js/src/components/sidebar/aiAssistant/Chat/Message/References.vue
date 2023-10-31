<script setup lang="ts">
import { computed } from "vue";

import ExternalLinkIcon from "webapps-common/ui/assets/img/icons/link-external.svg";
import Button from "webapps-common/ui/components/Button.vue";

const props = defineProps<{ references: {} }>();

const openReferences = (urls) => urls.forEach((url) => window.open(url));

const hasReferences = computed(
  () => props.references && Object.keys(props.references).length > 0,
);
</script>

<template>
  <div v-if="hasReferences" class="references">
    <div v-for="(urls, refName) in references" :key="refName">
      <Button class="ref-button" @click="openReferences(urls)"
        >Sources in {{ refName }} <ExternalLinkIcon />
      </Button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .references {
  padding-top: 13px;

  & svg {
    margin-right: 3px;

    @mixin svg-icon-size 10;
  }

  & .ref-button {
    padding: 0;
    font-size: 12px;

    & svg {
      margin-left: 2px;
      margin-bottom: -1px;
    }
  }
}
</style>
