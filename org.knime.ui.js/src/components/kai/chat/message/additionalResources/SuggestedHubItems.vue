<script setup lang="ts">
import { computed } from "vue";

import { Button } from "@knime/components";
import LinkIcon from "@knime/styles/img/icons/link-external.svg";

import type { HubItem } from "@/store/ai/types";

interface Props {
  items: HubItem[];
}

const props = defineProps<Props>();

const openInBrowser = (item: HubItem) => {
  window.open(item.url);
};

const shouldRender = computed(() => props.items.length > 0);
</script>

<template>
  <div v-if="shouldRender" class="hub-items">
    <div class="title">
      <slot name="title" />
    </div>
    <ul>
      <li v-for="item in items" :key="item.id">
        <Button
          class="button"
          title="Open in KNIME Hub"
          @click="openInBrowser(item)"
        >
          <div class="item-title">{{ item.title }}</div>
          <LinkIcon />
        </Button>
      </li>
    </ul>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .hub-items {
  & .title {
    display: flex;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 10px;

    & :slotted(svg) {
      @mixin svg-icon-size 20;

      margin-top: -1px;
      margin-right: 5px;
    }
  }

  & ul {
    list-style-type: none;
    margin: 0;
    padding: 0;

    & li {
      & .button {
        display: flex;
        align-items: center;
        width: 100%;
        padding: var(--space-4) var(--space-8) var(--space-4) var(--space-4);
        text-align: initial;
        border-radius: 0;
        font-size: 11px;
        font-weight: 400;
        color: var(--knime-masala);

        & .item-title {
          flex: 1;
        }

        & svg {
          @mixin svg-icon-size 12;

          stroke: var(--knime-masala);
          margin-right: 0;
          margin-top: 2px;
        }

        &:hover,
        &:focus-visible {
          outline: none;
          background-color: var(--theme-button-function-background-color-hover);

          & svg {
            stroke: var(--theme-button-function-foreground-color-hover);
          }

          & svg path[fill]:not([fill=""], [fill="none"]) {
            fill: var(--theme-button-function-foreground-color-hover);
          }
        }
      }
    }
  }
}
</style>
