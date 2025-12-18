<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";

import { NodeFeatureList } from "@knime/components";
import { sanitization } from "@knime/utils";

import type { ComponentNodeDescription } from "@/api/custom-types";
import { type NodeFactoryKey } from "@/api/gateway-api/generated-api";
import CloseButton from "@/components/common/CloseButton.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import { useNodeDescriptionStore } from "@/store/nodeDescription/nodeDescription";
import type {
  ComponentNodeDescriptionWithExtendedPorts,
  NativeNodeDescriptionWithExtendedPorts,
} from "@/util/dataMappers";
import SidebarPanelLayout from "../common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "../common/side-panel/SidebarPanelScrollContainer.vue";

import NodeDescriptionContent from "./NodeDescriptionContent.vue";
import NodeDescriptionExtensionInfo from "./NodeDescriptionExtensionInfo.vue";

type Params = {
  id: string;
  name: string;
  nodeFactory?: NodeFactoryKey;
};

/*
 * Component that renders a NativeNode or a Component description
 */
type Props = {
  params?: Params | null;
  showCloseButton?: boolean;
  isVisible?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  params: null,
  isVisible: true,
  showCloseButton: false,
});

const nodeDescriptionStore = useNodeDescriptionStore();
const isLoading = ref(false);
const emit = defineEmits<(e: "close") => void>();

const { params, isVisible } = toRefs(props);

const descriptionData = ref<
  | NativeNodeDescriptionWithExtendedPorts
  | ComponentNodeDescriptionWithExtendedPorts
  | null
>(null);

const isNativeNode = computed(() =>
  Boolean(params.value && params.value.nodeFactory),
);

const isNativeNodeDescription = (
  data:
    | NativeNodeDescriptionWithExtendedPorts
    | ComponentNodeDescriptionWithExtendedPorts,
): data is NativeNodeDescriptionWithExtendedPorts => {
  return isNativeNode.value;
};

const title = computed(() => params.value?.name ?? "");

const loadNativeNodeDescription = async () => {
  if (!params.value) {
    return;
  }

  isLoading.value = true;

  try {
    descriptionData.value = await nodeDescriptionStore.getNativeNodeDescription(
      {
        factoryId: params.value.id,
        nodeFactory: params.value.nodeFactory!,
      },
    );
  } catch (error) {
    consola.error("NodeDescription::Problem fetching NativeNode description", {
      params,
      error,
    });
  } finally {
    isLoading.value = false;
  }
};

const sanitizeComponentDescription = (
  unsafeDescription: ComponentNodeDescription,
): ComponentNodeDescriptionWithExtendedPorts => {
  const cleaned: ComponentNodeDescription = {
    ...unsafeDescription,
    inPorts: (unsafeDescription.inPorts ?? []).map((port) => ({
      ...port,
      description: sanitization.stripHTML(port.description ?? ""),
    })),
    outPorts: (unsafeDescription.outPorts ?? []).map((port) => ({
      ...port,
      description: sanitization.stripHTML(port.description ?? ""),
    })),
  };

  return cleaned as unknown as ComponentNodeDescriptionWithExtendedPorts;
};

const loadComponentDescription = async () => {
  if (!params.value) {
    return;
  }

  isLoading.value = true;

  try {
    const unsafeNodeDescription =
      await nodeDescriptionStore.getComponentDescription({
        nodeId: params.value.id,
      });
    descriptionData.value = sanitizeComponentDescription(unsafeNodeDescription);
  } catch (error) {
    consola.error("NodeDescription::Problem fetching Component description", {
      params,
      error,
    });
  } finally {
    isLoading.value = false;
  }
};

watch(
  [params, isVisible],
  async () => {
    if (!isVisible.value) {
      return;
    }

    // reset data
    if (params.value === null) {
      return;
    }

    if (isNativeNode.value) {
      await loadNativeNodeDescription();
      return;
    }

    await loadComponentDescription();
  },
  { immediate: true },
);
</script>

<template>
  <SidebarPanelLayout class="node-description">
    <template #header>
      <h2>{{ title }}</h2>
      <CloseButton
        v-if="showCloseButton"
        class="close-button"
        @close="emit('close')"
      />
    </template>
    <SidebarPanelScrollContainer class="node-info">
      <!-- The v-else should be active if the selected node is not visible, but the nodeDescriptionObject might still
             have some data as the selection is not cleared. -->
      <template v-if="params">
        <template v-if="descriptionData && !isLoading">
          <template v-if="descriptionData.description">
            <NodeDescriptionContent
              :description-data="descriptionData"
              :is-component="!isNativeNode"
            />
          </template>

          <span v-else class="placeholder">
            There is no description for this node.
          </span>

          <ExternalResourcesList
            v-if="descriptionData.links"
            :model-value="descriptionData.links"
          />

          <NodeFeatureList
            :in-ports="descriptionData.inPorts"
            :dyn-in-ports="
              isNativeNodeDescription(descriptionData)
                ? descriptionData.dynInPorts
                : []
            "
            :out-ports="descriptionData.outPorts"
            :dyn-out-ports="
              isNativeNodeDescription(descriptionData)
                ? descriptionData.dynOutPorts
                : []
            "
            :views="descriptionData.views"
            :options="descriptionData.options"
            class="node-feature-list"
          />

          <NodeDescriptionExtensionInfo
            v-if="isNativeNodeDescription(descriptionData)"
            :description-data="descriptionData"
          />
        </template>
      </template>
      <div v-else class="placeholder no-node">Select a node</div>
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
