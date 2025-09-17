<script setup lang="ts">
import { computed } from "vue";

import { Collapser } from "@knime/components";
import CircleCheckIcon from "@knime/styles/img/icons/circle-check.svg";
import SignWarningIcon from "@knime/styles/img/icons/sign-warning.svg";

const {
  messageHeader,
  messages = {},
  success = false,
} = defineProps<{
  messageHeader: string;
  success?: boolean;
  messages?: Record<string, unknown>;
}>();

const icon = computed(() => (success ? CircleCheckIcon : SignWarningIcon));
</script>

<template>
  <section>
    <div class="grid-container">
      <div class="grid-item-12">
        <div class="header result-content">
          <Component :is="icon" :class="{ icon: true, error: !success }" />
          <h5>{{ messageHeader }}</h5>
        </div>
        <Collapser v-if="messages && Object.keys(messages).length" class="collapser result-content">
          <ul>
            <li v-for="(item, key) in messages" :key="key">
              {{ item }}
            </li>
          </ul>
        </Collapser>
      </div>
    </div>
  </section>
</template>

<style lang="postcss" scoped>
section {
  background-color: var(--knime-gray-ultra-light);
  padding-top: 70px;
  padding-bottom: 70px;

  /* Positioning Block */
  & .result-content:first-child {
    position: absolute;
  }

  & .result-content:last-child {
    position: relative;
    min-height: 32px;
  }

  /* Headline Text Block */
  & .header {
    display: flex;

    & h5 {
      margin: 0;
      align-self: center;
      font-family: var(--theme-headlines-font-family);
      color: var(--theme-headlines-color);
      font-weight: var(--theme-headlines-font-weight);
    }

    & .icon {
      display: block;
      width: 32px;
      height: 32px;
      stroke-width: calc(32px / 32);
      margin-right: 30px;
      stroke: var(--theme-color-success);

      &.error {
        stroke: var(--theme-color-error);
      }
    }
  }

  /* Messages Block */
  & .collapser {
    & :deep(.panel) {
      position: relative;
      top: 35px;

      & ul {
        padding: 0;

        & li {
          list-style: none;
          font-size: 13px;
          line-height: 18px;
        }
      }
    }

    & :deep(.button) {
      color: var(--knime-dove-gray);
      cursor: pointer;
      bottom: 35px;

      & .dropdown {
        padding: 5px;
        border-radius: 50%;
        top: 16px;

        & svg {
          width: 24px;
          height: 24px;
        }
      }

      &:focus,
      &:hover,
      &:active {
        color: var(--knime-masala);

        & .dropdown {
          background-color: var(--knime-porcelain);

          & svg {
            stroke: var(--knime-masala);
          }
        }
      }
    }
  }
}
</style>
