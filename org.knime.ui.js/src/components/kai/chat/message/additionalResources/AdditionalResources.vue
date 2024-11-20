<script setup lang="ts">
import { computed } from "vue";

import { FunctionButton } from "@knime/components";
import LinkIcon from "@knime/styles/img/icons/arrow-next-double.svg";

import {
  type AdditionalResource,
  useKaiExtensionPanel,
} from "@/components/kai/useKaiExtensionPanel";

const props = defineProps<AdditionalResource>();

const {
  openAdditionalResources,
  panelMode,
  additionalResources,
  closeKaiExtensionPanel,
} = useKaiExtensionPanel();

const shouldRender = computed(() => {
  return (
    Object.keys(props.references).length ||
    props.workflows.length ||
    props.components.length
  );
});

const isActive = computed(
  () =>
    panelMode.value === "additional_resources" &&
    additionalResources.value === props,
);

const handleClick = () => {
  if (isActive.value) {
    closeKaiExtensionPanel();
  } else {
    openAdditionalResources(props);
  }
};
</script>

<template>
  <div v-if="shouldRender" class="additional-resources">
    Additional Resources
    <FunctionButton :active="isActive" @click="handleClick">
      <LinkIcon />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.additional-resources {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: initial;
  font-size: 16px;
  font-weight: 700;
  color: var(--knime-masala);
  margin-top: var(--space-24);

  & svg {
    @mixin svg-icon-size 20;

    stroke: var(--knime-masala);
  }
}
</style>
