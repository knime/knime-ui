<script setup lang="ts">
import { computed, ref } from "vue";

import ExpandTransition from "webapps-common/ui/components/transitions/ExpandTransition.vue";
import BaseButton from "webapps-common/ui/components/BaseButton.vue";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import ArrowIcon from "webapps-common/ui/assets/img/icons/arrow-right.svg";

import type { ExtensionWithNodes } from "./types";

const props = defineProps<ExtensionWithNodes>();

const isExpanded = ref(false);

const extensionUrl = computed(() => {
  const vendor = encodeURI(`${props.featureVendor.toLowerCase()}`);
  return `https://hub.knime.com/${vendor}/extensions/${props.featureSymbolicName}/latest`;
});

const openExtensionInBrowser = () => window.open(extensionUrl.value);
const openNodeInBrowser = (factoryName: string) => {
  const url = `${extensionUrl.value}/${factoryName}`;
  window.open(url);
};
</script>

<template>
  <div class="installable-extension">
    <div class="header">
      <BaseButton
        class="dropdown-button"
        :aria-expanded="String(isExpanded)"
        @click.prevent="isExpanded = !isExpanded"
      >
        <DropdownIcon class="dropdown-icon" :class="{ flip: isExpanded }" />
      </BaseButton>
      <a @click="openExtensionInBrowser()">
        {{ featureName }}
      </a>
    </div>
    <ExpandTransition :is-expanded="isExpanded">
      <div class="body">
        <ul>
          <li v-for="node in nodes" :key="node.factoryName">
            <a @click="openNodeInBrowser(node.factoryName)">
              <ArrowIcon />
              {{ node.title }}
            </a>
          </li>
        </ul>
      </div>
    </ExpandTransition>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.installable-extension {
  background-color: var(--knime-white);
  padding: 0 8px;
  margin-bottom: 8px;

  & .header {
    padding: 8px 0;
    display: flex;
    align-items: center;

    & a {
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }

    & .dropdown-button {
      all: unset;
      margin-right: 8px;
      margin-bottom: -1px;

      & .dropdown-icon {
        @mixin svg-icon-size 18;

        stroke: var(--knime-masala);
        transition: transform 0.4s ease-in-out;

        &.flip {
          transform: scaleY(-1);
        }
      }
    }
  }

  & .body {
    padding-top: 8px;
    padding-bottom: 25px;
    margin-bottom: 5px;

    & ul {
      list-style-type: none;
      margin: 0;
      padding: 0;

      & li {
        padding-left: 2px;

        & a {
          text-decoration: none;
          line-height: 1.5;
          cursor: pointer;

          & svg {
            @mixin svg-icon-size 18;

            stroke: var(--knime-masala);
            margin-right: 12px;
            margin-bottom: -3px;
          }
        }
      }
    }
  }
}
</style>
