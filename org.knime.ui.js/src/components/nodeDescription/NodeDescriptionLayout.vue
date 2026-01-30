<script setup lang="ts">
import { NodeFeatureList } from "@knime/components";

import type {
  Link,
  NodeDialogOptionGroup,
  NodeViewDescription,
} from "@/api/gateway-api/generated-api";
import CloseButton from "@/components/common/CloseButton.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import type {
  ExtendedPortType,
  PortGroupDescription,
} from "@/util/dataMappers";
import SidebarPanelLayout from "../common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "../common/side-panel/SidebarPanelScrollContainer.vue";

/*
 * Component that renders a NativeNode or a Component description
 */
type Props = {
  name: string;
  links?: Link[];
  inPorts?: ExtendedPortType[];
  outPorts?: ExtendedPortType[];
  dynInPorts?: PortGroupDescription[];
  dynOutPorts?: PortGroupDescription[];
  views?: NodeViewDescription[];
  options?: NodeDialogOptionGroup[];
  showCloseButton?: boolean;
};

withDefaults(defineProps<Props>(), {
  links: () => [],
  inPorts: () => [],
  outPorts: () => [],
  dynInPorts: () => [],
  dynOutPorts: () => [],
  views: () => [],
  options: () => [],
  isVisible: true,
  showCloseButton: false,
});

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <SidebarPanelLayout class="node-description">
    <template #header>
      <h2>{{ name ?? "" }}</h2>
      <CloseButton
        v-if="showCloseButton"
        class="close-button"
        @close="emit('close')"
      />
    </template>
    <SidebarPanelScrollContainer class="node-info">
      <!-- The v-else should be active if the selected node is not visible, but the nodeDescriptionObject might still
             have some data as the selection is not cleared. -->
      <slot name="description">
        <span class="placeholder">
          There is no description for this node.
        </span>
      </slot>

      <ExternalResourcesList :model-value="links" />

      <NodeFeatureList
        :in-ports="inPorts"
        :dyn-in-ports="dynInPorts"
        :out-ports="outPorts"
        :dyn-out-ports="dynOutPorts"
        :views="views"
        :options="options"
        class="node-feature-list"
      />

      <slot name="extension-info" />
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-description {
  & .placeholder {
    font-size: 13px;
    font-style: italic;
    color: var(--knime-dove-gray);

    &.no-node {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
    }
  }

  & .node-feature-list {
    margin-top: 6px;
    margin-bottom: 40px;

    & :deep(.shadow-wrapper::after),
    & :deep(.shadow-wrapper::before) {
      display: none;
    }

    /* Style refinement for Feature List; Ports, Options, Views  */

    /* options with collapsibles */
    & :deep(h5) {
      font-size: 13px;
      padding-left: 20px;
    }

    /* port names */
    & :deep(h6) {
      font-size: 13px;
      margin-bottom: 0;
    }

    /* view sub headlines */
    & :deep(.name) {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 0;
    }

    & :deep(.description) {
      font-size: 13px;
    }

    /* Style refinement for Options */

    & :deep(.options .panel) {
      padding-left: 10px;
      padding-right: 10px;
      margin-left: 14px;
      line-height: 150%;
      font-size: 13px;

      & .option-field-name {
        font-size: 13px;
      }

      /* Style refinement list in a collapsible */
      & .option-description {
        line-height: 150%;

        & ul {
          padding: 10px 0 10px 20px;
        }
      }

      /* Style refinement list in a collapsible */
      & > .panel {
        margin-left: 3px;

        & ul {
          padding-left: 20px;
        }
      }

      /* Style refinement text outside a collapsible */
      & > div {
        padding-left: 0;
      }
    }

    /* Style refinement for Views */
    & :deep(.views-list) {
      & li {
        padding: 20px;
      }

      & .content {
        margin-top: 5px;
        margin-left: 30px;
      }

      & svg {
        margin-right: 8px;
      }
    }

    /* Style refinement for Ports */
    & :deep(.outports),
    & :deep(.inports) {
      padding: 20px;

      & svg {
        @mixin svg-icon-size 9;

        top: 5px;
      }
    }

    & :deep(.ports-list) {
      & > .wrapper {
        padding: 20px;
      }

      & .content {
        max-width: 100%;

        & ol {
          margin-left: 20px;
          margin-top: 22px;
        }

        & .dyn-ports-description {
          margin-top: 10px;
        }

        & .port-type {
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          font-size: 13px;
        }

        & .port-name,
        & .port-description {
          margin: 5px 0;
          font-size: 13px;
        }

        & svg {
          @mixin svg-icon-size 9;

          top: 5px;
          left: -17px;
        }
      }
    }
  }
}
</style>
