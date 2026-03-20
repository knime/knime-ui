<script setup lang="ts">
import { computed } from "vue";

import { renderMarkdown } from "./markdown";

interface Props {
  markdown: string;
  allowHyperlinks?: boolean;
}
const props = defineProps<Props>();
const htmlContent = computed(() =>
  renderMarkdown(props.markdown, props.allowHyperlinks),
);
</script>

<template>
  <div class="content" v-html="htmlContent" />
</template>

<style lang="postcss" scoped>
.content :deep() {
  overflow-x: hidden;
  overflow-wrap: break-word;

  & > *:first-child {
    margin-top: 0;
  }

  & > *:last-child {
    margin-bottom: 0;
  }

  & h1 {
    font-size: 1.5em;
  }

  & h2,
  & h3,
  & h4,
  & h5,
  & h6 {
    font-size: 1em;
  }

  & pre {
    padding: var(--space-4);
    border: 1px solid var(--knime-silver-sand);
  }

  & code {
    word-break: break-all;
    white-space: pre-wrap;
  }

  & ol {
    counter-reset: list-counter;

    & li {
      counter-increment: list-counter;

      &::before {
        content: counter(list-counter) ".";
      }
    }
  }

  & ul,
  & ol {
    padding-left: 0;
    list-style: none;

    & li {
      margin-bottom: 0.4em;

      &::before {
        margin-right: 5px;
        font-weight: bold;
      }

      & p:first-child {
        display: inline;
      }
    }

    & ul,
    & ol {
      padding-left: var(--space-16);
      margin-top: 0.4em;
      counter-reset: list-counter;
    }
  }

  & ul {
    & li {
      &::before {
        content: "\2022";
      }
    }
  }
}
</style>
