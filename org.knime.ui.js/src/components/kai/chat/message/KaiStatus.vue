<script setup lang="ts">
import { KdsLoadingSpinner } from "@knime/kds-components";
import UserIcon from "@knime/styles/img/icons/user.svg";

interface Props {
  status?: string;
  variant?: "loading" | "waiting";
}

const props = withDefaults(defineProps<Props>(), {
  status: "",
  variant: "loading",
});
</script>

<template>
  <div v-if="props.status" class="status">
    <UserIcon v-if="variant === 'waiting'" class="status-icon" />
    <KdsLoadingSpinner v-else />
    {{ props.status }}
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.status {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--kds-spacing-container-0-25x);
  padding-top: var(--kds-spacing-container-0-75x);

  &:first-child {
    padding-top: 0;
  }

  & svg.status-icon {
    @mixin svg-icon-size 14;
  }
}
</style>
