<script setup lang="ts">
import { computed } from "vue";

import PortIcon from "webapps-common/ui/components/node/PortIcon.vue";

import { useStore } from "@/composables/useStore";
import connectorPath from "@/util/connectorPath";
import Skeleton from "@/components/common/Skeleton.vue";

const store = useStore();

const isLoadingApp = computed(() => store.state.application.isLoadingApp);
const isLoadingWorkflow = computed(
  () => store.state.application.isLoadingWorkflow,
);

const isLoading = computed(() => isLoadingApp.value || isLoadingWorkflow.value);

const isPartial = computed(
  () => isLoadingWorkflow.value && !isLoadingApp.value,
);

const x1 = 150;
const y1 = 80;
const x2 = 550;
const y2 = 200;
const size = 80;
const verticalOffset = 10;

const path = computed(() =>
  connectorPath(x1 + size, y1 + verticalOffset, x2, y2 + verticalOffset),
);
</script>

<template>
  <div
    v-if="isLoading"
    :class="['main-content', 'skeleton', { transparent: isPartial }]"
  >
    <div class="toolbar-skeleton" :class="{ transparent: isPartial }">
      <template v-if="!isPartial">
        <Skeleton class="button-skeleton-small" />
        <Skeleton class="button-skeleton-small" />
        <Skeleton class="button-skeleton-normal" />
        <Skeleton class="button-skeleton-normal" />
      </template>
    </div>

    <div :class="{ transparent: isPartial }" class="sidebar-tabs-skeleton">
      <template v-if="!isPartial">
        <Skeleton class="tab-skeleton" />
        <Skeleton class="tab-skeleton" />
        <Skeleton class="tab-skeleton" />
      </template>
    </div>

    <div class="sidebar-content-skeleton">
      <Skeleton class="text-skeleton" />
      <Skeleton class="text-skeleton" />
      <Skeleton class="text-skeleton" />
      <Skeleton class="text-skeleton" />
    </div>

    <div class="content-skeleton">
      <div class="svg-wrapper">
        <Skeleton
          :color1="$colors.SilverSand"
          :color2="$colors.GrayDarkSemi"
          class="node-skeleton"
        />
        <Skeleton
          :color1="$colors.SilverSand"
          :color2="$colors.GrayDarkSemi"
          class="node-skeleton"
        />
        <svg width="800" height="400">
          <path :d="path" fill="none" class="connector" />
          <g transform="translate(119.6, 45.5)" class="port">
            <PortIcon type="table" :filled="true" />
          </g>
          <g transform="translate(270, 105)" class="port">
            <PortIcon type="table" :filled="true" />
          </g>
        </svg>
      </div>

      <div class="bottom-panel-skeleton">
        <Skeleton class="text-skeleton" />
        <Skeleton class="text-skeleton" />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.transparent {
  background: transparent !important;
}

.main-content {
  grid-area: workflow;
  width: 100vw;
  height: 100vh;
  cursor: progress;

  /* Make sure nothing will be on top of this skeleton */
  z-index: calc(infinity);
}

& .text-skeleton {
  height: 16px;
  border-radius: 9999px;
  width: 100%;
}

.skeleton {
  background: var(--knime-white);
  display: grid;
  grid-template:
    "toolbar toolbar toolbar" min-content
    "tabs sidebar workflow" auto / min-content min-content auto;

  & .toolbar-skeleton {
    grid-area: toolbar;
    background: var(--knime-porcelain);
    border-bottom: 1px solid var(--knime-silver-sand);
    min-height: var(--app-toolbar-height);
    display: flex;
    gap: 10px;
    padding: 10px;
    align-items: center;

    & .button-skeleton-small {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 1px solid var(--knime-silver-sand);
    }

    & .button-skeleton-normal {
      width: 100px;
      height: 100%;
      border-radius: 9999px;
      border: 1px solid var(--knime-silver-sand);
    }
  }

  & .content-skeleton {
    grid-area: workflow;
    display: flex;
    flex-direction: column;
    background: var(--knime-white);

    & .bottom-panel-skeleton {
      margin-top: auto;
      min-height: 28%;
      border-top: 3px solid var(--knime-silver-sand);
      display: flex;
      flex-direction: column;
      gap: 4px;
      justify-content: center;
      align-items: center;

      & .text-skeleton {
        width: 50%;
      }
    }

    & .svg-wrapper {
      position: relative;
      margin: 50% auto auto;
      transform: translateY(-50%);

      & .node-skeleton {
        width: 80px;
        height: 80px;
        border-radius: 4px;
      }

      & .node-skeleton:first-child {
        position: absolute;
        top: 80px;
        left: 151px;
      }

      & .node-skeleton:nth-child(2) {
        position: absolute;
        top: 195px;
        left: 550px;
      }

      & svg {
        & .connector {
          stroke-width: 4;
          stroke: var(--knime-stone-gray);
        }

        & .port {
          scale: 2;
        }
      }
    }
  }

  & .sidebar-tabs-skeleton {
    grid-area: tabs;
    background: var(--knime-black);
    min-width: 40px;
    height: 100vh;
    display: flex;
    flex-direction: column;

    & .tab-skeleton {
      width: 40px;
      height: 50px;
      border: 1px solid var(--knime-silver-sand);
    }
  }

  & .sidebar-content-skeleton {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 370px;
    padding: 20px;
    border-right: 1px solid var(--knime-silver-sand);
    background: var(--sidebar-background-color);

    & .text-skeleton:nth-child(1) {
      width: 70%;
    }

    & .text-skeleton:nth-child(4) {
      width: 30%;
    }
  }
}
</style>
