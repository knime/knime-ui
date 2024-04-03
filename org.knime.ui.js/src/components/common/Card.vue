<script lang="ts" setup>
interface Props {
  link?: boolean;
  href?: string;
}

withDefaults(defineProps<Props>(), {
  link: false,
  href: "",
});

const routerLink = "router-link";

defineEmits<{
  (e: "click"): void;
}>();
</script>

<template>
  <Component :is="routerLink" v-if="link" :to="href" class="card" tabindex="0">
    <slot />
  </Component>
  <button v-else class="card" @click.prevent="$emit('click')">
    <slot />
  </button>
</template>

<style lang="postcss" scoped>
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
    outline: revert;
  }

  &:hover {
    box-shadow: var(--shadow-elevation-2);
    cursor: pointer;
  }
}
</style>
