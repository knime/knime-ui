<script setup lang="ts">
import { type FunctionalComponent, computed } from "vue";

import HubIcon from "@knime/styles/img/icons/cloud-knime.svg";
import LocalSpaceIcon from "@knime/styles/img/icons/local-space.svg";
import ServerIcon from "@knime/styles/img/icons/server-racks.svg";

import { SpaceProvider } from "@/api/gateway-api/generated-api";

interface Props {
  providerType: SpaceProvider.TypeEnum;
}

const props = defineProps<Props>();

const getIcon = computed(() => {
  const mapper: Record<SpaceProvider.TypeEnum, FunctionalComponent> = {
    [SpaceProvider.TypeEnum.LOCAL]: LocalSpaceIcon,
    [SpaceProvider.TypeEnum.HUB]: HubIcon,
    [SpaceProvider.TypeEnum.SERVER]: ServerIcon,
  };
  return mapper[props.providerType];
});

const providerText = computed(() => {
  const mapper: Record<SpaceProvider.TypeEnum, string> = {
    [SpaceProvider.TypeEnum.LOCAL]: "Local",
    [SpaceProvider.TypeEnum.HUB]: "Hub",
    [SpaceProvider.TypeEnum.SERVER]: "Server",
  };
  return mapper[props.providerType];
});
</script>

<template>
  <div class="status-pill-container">
    <Component :is="getIcon" class="status-pill" />
    <span>{{ providerText }}</span>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.status-pill-container {
  background-color: color-mix(
    in hsl,
    var(--theme-color-running) 10%,
    transparent
  );
  color: var(--theme-color-running);
  padding: 0 10px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;

  & span {
    line-height: 18px;
    font-weight: 500;
    font-size: 13px;
  }

  & svg {
    min-width: 13px;
    stroke: var(--theme-color-running);
    margin-right: 4px;

    @mixin svg-icon-size 12;
  }
}

.status-pill {
  margin-right: 5px;
}
</style>
