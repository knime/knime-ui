<script setup lang="ts">
import { computed } from "vue";

import type { SpaceProviderNS } from "@/api/custom-types";
import { SpaceProvider } from "@/api/gateway-api/generated-api";
import { useSpaceIcons } from "../spaces/useSpaceIcons";

const { getSpaceProviderIcon } = useSpaceIcons();

interface Props {
  provider: SpaceProviderNS.SpaceProvider;
}

const props = defineProps<Props>();

const icon = computed(() => getSpaceProviderIcon(props.provider));

const providerText = computed(() => {
  const mapper: Record<SpaceProvider.TypeEnum, string> = {
    [SpaceProvider.TypeEnum.LOCAL]: "Local",
    [SpaceProvider.TypeEnum.HUB]: "Hub",
    [SpaceProvider.TypeEnum.SERVER]: "Server",
  };
  return mapper[props.provider.type];
});
</script>

<template>
  <div class="status-pill-container">
    <Component :is="icon" class="status-pill" />
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
