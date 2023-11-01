<script setup lang="ts">
import { computed } from "vue";
import { isEmpty } from "lodash";

import ExtensionIcon from "webapps-common/ui/assets/img/icons/extension.svg";
import Collapser from "webapps-common/ui/components/Collapser.vue";
import Button from "webapps-common/ui/components/Button.vue";
import LinkIcon from "webapps-common/ui/assets/img/icons/link-external.svg";

import type { ExtensionWithNodes } from "../../types";

const props = defineProps<{
  extensions: { [key: string]: ExtensionWithNodes };
}>();

const hasExtensions = computed(() => !isEmpty(props.extensions));

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
    <div class="title"><ExtensionIcon /> Extensions</div>

    <Collapser
      v-for="(extension, featureSymbolicName) in extensions"
      :key="featureSymbolicName"
      title="{{ extension.featureName }}"
      class="extension-collapser"
    >
      <template #title>
        {{ "extension.featureName" }}
      </template>
      <ul>
        <li v-for="node in extension.nodes" :key="node.factoryName">
          <Button
            class="button"
            @click="openNodeInBrowser(extension, node.factoryName)"
          >
            <div class="node-name">{{ node.title }}</div>
            <LinkIcon />
          </Button>
        </li>
      </ul>
    </Collapser>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .extensions {
  margin-top: 30px;

  & .title {
    display: flex;
    font-size: 16px;
    font-weight: 700;

    & svg {
      @mixin svg-icon-size 20;
      margin-top: -1px;
      margin-right: 5px;
    }
  }

  .extension-collapser {
    background-color: var(--knime-white);

    & ul {
      list-style-type: none;
      margin: 0;
      padding: 0;

      & li {
        & .button {
          display: flex;
          width: 100%;
          padding: 5px 8px 5px 2px;
          text-align: initial;
          border-radius: 0;
          font-size: 11px;
          font-weight: 500;

          & .node-name {
            flex: 1;
          }

          & svg {
            @mixin svg-icon-size 12;

            stroke: var(--knime-masala);
            margin-right: 6px;
            margin-top: 2px;
          }
        }
      }
    }
  }
}
</style>
