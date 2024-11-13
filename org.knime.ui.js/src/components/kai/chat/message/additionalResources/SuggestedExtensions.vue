<script setup lang="ts">
import { computed } from "vue";

import { Button } from "@knime/components";
import ExtensionIcon from "@knime/styles/img/icons/extension.svg";
import LinkIcon from "@knime/styles/img/icons/link-external.svg";

import type { ExtensionWithNodes, Extensions } from "@/components/kai/types";

interface Props {
  extensions: Extensions;
}

const props = defineProps<Props>();

const hasExtensions = computed(() => Object.keys(props.extensions).length > 0);

const openNodeInBrowser = (
  extension: ExtensionWithNodes,
  factoryName: string,
) => {
  const vendor = encodeURI(`${extension.owner.toLowerCase()}`);
  const extensionUrl = `https://hub.knime.com/${vendor}/extensions/${extension.featureSymbolicName}/latest`;
  const url = `${extensionUrl}/${factoryName}`;
  window.open(url);
};
</script>

<template>
  <div v-if="hasExtensions" class="extensions">
    <div class="header"><ExtensionIcon /> Extensions</div>

    <div
      v-for="(extension, featureSymbolicName) in extensions"
      :key="featureSymbolicName"
      class="extension-collapser"
    >
      <div class="title">{{ extension.featureName }}</div>
      <ul>
        <li v-for="node in extension.nodes" :key="node.factoryName">
          <Button
            class="button"
            title="Open in KNIME Hub"
            @click="openNodeInBrowser(extension, node.factoryName)"
          >
            <div class="node-name">{{ node.title }}</div>
            <LinkIcon />
          </Button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .extensions {
  & .header {
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

  & .extension-collapser {
    & .title {
      font-size: 13px;
      font-weight: 700;
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
          padding: var(--space-4) var(--space-8) var(--space-4) 0;
          text-align: initial;
          border-radius: 0;
          font-size: 11px;
          font-weight: 400;
          color: var(--knime-masala);

          & .node-name {
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
            background-color: var(
              --theme-button-function-background-color-hover
            );

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
}
</style>
