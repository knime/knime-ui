<script setup lang="ts">
import { computed } from "vue";

import { Button } from "@knime/components";
import LinkIcon from "@knime/styles/img/icons/link-external.svg";

import {
  type AdditionalResource,
  useKaiExtensionPanel,
} from "@/components/kai/useKaiExtensionPanel";

const props = defineProps<AdditionalResource>();

const { openAdditionalResources } = useKaiExtensionPanel();

const handleClick = () => {
  openAdditionalResources(props);
};

const shouldRender = computed(() => {
  return (
    Object.keys(props.references).length ||
    props.workflows.length ||
    props.components.length
  );
});
</script>

<template>
  <div v-if="shouldRender" class="additional-resources">
    <Button class="button" @click="handleClick">
      Additional Resources
      <LinkIcon />
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.additional-resources {
  & .button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 5px 8px 5px 2px;
    text-align: initial;
    font-size: 16px;
    font-weight: 700;
    color: var(--knime-masala);
  }

  & svg {
    @mixin svg-icon-size 20;

    stroke: var(--knime-masala);
    margin-right: 0;
    margin-top: 4px;
  }
}
</style>
