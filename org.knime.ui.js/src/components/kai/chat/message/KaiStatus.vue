<script setup lang="ts">
import LoadingIcon from "@knime/styles/img/icons/reload.svg";
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
    <LoadingIcon v-else class="status-icon spinning" />
    {{ props.status }}
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

@keyframes rotate-animation {
  0% {
    transform: rotate(360deg);
  }

  100% {
    transform: rotate(0deg);
  }
}

.status {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-4);
  padding-top: var(--space-12);

  &:first-child {
    padding-top: 0;
  }

  & svg.status-icon {
    @mixin svg-icon-size 14;

    &.spinning {
      animation: rotate-animation 2s linear infinite;
    }
  }
}
</style>
