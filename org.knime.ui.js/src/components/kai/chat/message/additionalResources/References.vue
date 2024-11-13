<script setup lang="ts">
import { computed } from "vue";

import { Button } from "@knime/components";
import DocumentationIcon from "@knime/styles/img/icons/file-text-stack.svg";
import ForumIcon from "@knime/styles/img/icons/forum.svg";
import LinkIcon from "@knime/styles/img/icons/link-external.svg";

interface Props {
  title: string;
  urls: string[];
}

const props = defineProps<Props>();

const openInBrowser = (url: string) => {
  window.open(url);
};

const shouldRender = computed(() => props.urls.length > 0);
const isDocumentation = computed(() =>
  props.title.toLowerCase().includes("documentation"),
);
const isForum = computed(() => props.title.toLowerCase().includes("forum"));
</script>

<template>
  <div v-if="shouldRender" class="hub-items">
    <div class="title">
      <ForumIcon v-if="isForum" />
      <DocumentationIcon v-else-if="isDocumentation" />
      {{ title }}
    </div>
    <ul>
      <li v-for="(url, index) in urls" :key="index">
        <Button
          class="button"
          title="Open in KNIME Hub"
          @click="openInBrowser(url)"
        >
          <div class="item-title">Link {{ index + 1 }}</div>
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

    & svg {
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
