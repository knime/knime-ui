<script lang="ts" setup>
interface Props {
  link?: boolean;
  href?: string;
}

withDefaults(defineProps<Props>(), {
  link: false,
  href: "",
});

defineEmits<{
  (e: "click"): void;
}>();
</script>

<template>
  <RouterLink v-if="link" :to="href" class="card" tabindex="0">
    <slot />
  </RouterLink>
  <button v-else class="card" @click.prevent="$emit('click')">
    <slot />
  </button>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.card {
  display: block;
  text-decoration: none;
  min-width: 300px;
  min-height: 150px;
  padding: 0;
  background-color: var(--knime-white);
  border: 0;
  box-shadow: var(--shadow-elevation-1);
  transition: all 150ms ease-out;
  height: 100%;

  &:focus-visible {
    @mixin focus-style;
  }

  &:hover {
    box-shadow: var(--shadow-elevation-2);
    cursor: pointer;
  }
}
</style>
