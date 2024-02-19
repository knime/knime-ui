<script setup lang="ts">
import { toRefs, ref, computed, watch, nextTick } from "vue";

import KNIMETriangleIcon from "webapps-common/ui/assets/img/KNIME_Triangle.svg";
import ExtensionIcon from "webapps-common/ui/assets/img/icons/extension.svg";
import Description from "webapps-common/ui/components/Description.vue";
import NodeFeatureList from "webapps-common/ui/components/node/NodeFeatureList.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import CloseButton from "@/components/common/CloseButton.vue";

import { API } from "@api";
import { useStore } from "@/composables/useStore";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";
import { runInEnvironment } from "@/environment";
import MetadataDescription from "@/components/workflowMetadata/MetadataDescription.vue";
import type { NativeNodeDescriptionWithExtendedPorts } from "@/util/portDataMapper";

type SelectedNode = Partial<Pick<NodeTemplate, "nodeFactory">> & {
  id: string;
  name: string;
};

/*
 * Base component for the NodeDescriptionOverlay for the nodeRepo, also used in the ContextAwareDescription for nodes
 * of the workflow
 */
type Props = {
  selectedNode: SelectedNode | null;
  showCloseButton?: boolean;
  isComponent: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  selectedNode: null,
});

const store = useStore();

const emit = defineEmits<(e: "close") => void>();

const { selectedNode, isComponent } = toRefs(props);

const descriptionData = ref<NativeNodeDescriptionWithExtendedPorts | null>(
  null,
);

const title = computed(() => {
  if (!selectedNode.value) {
    return "";
  }

  return selectedNode.value.name;
});

const loadNodeDescription = async () => {
  descriptionData.value = await store.dispatch(
    "nodeRepository/getNodeDescription",
    { selectedNode: selectedNode.value },
  );
};

const loadComponentDescription = async () => {
  const data = await store.dispatch("nodeRepository/getComponentDescription", {
    nodeId: selectedNode.value?.id,
  });

  descriptionData.value = {
    ...data,
    description: data.description.value,
  };
};

const redirectLinks = async (redirect: (params: { url: string }) => void) => {
  await nextTick();
  const descriptionEl = document.querySelector("#node-description-html");
  const linksList = document.querySelector("#node-resources-list");

  if (!descriptionEl && !linksList) {
    return;
  }

  descriptionEl?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      redirect({ url: link.href });
      return false;
    });
  });

  linksList?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      redirect({ url: link.href });
      return false;
    });
  });
};

watch(
  selectedNode,
  async () => {
    // reset data
    if (selectedNode.value === null) {
      return;
    }

    if (isComponent.value) {
      await loadComponentDescription();
      runInEnvironment({
        DESKTOP: () => {
          redirectLinks(API.desktop.openUrlInExternalBrowser);
        },
      });
      return;
    }

    await loadNodeDescription();
  },
  { immediate: true },
);
</script>

<template>
  <div class="node-description">
    <div class="node-header">
      <div class="header-content">
        <h2>{{ title }}</h2>
        <!-- <slot name="header-action" /> -->
        <CloseButton
          v-if="showCloseButton"
          class="close-button"
          @close="emit('close')"
        />
      </div>
      <hr />
    </div>
    <div class="node-info">
      <!-- The v-else should be active if the selected node is not visible, but the nodeDescriptionObject might still
             have some data as the selection is not cleared. -->
      <template v-if="selectedNode">
        <template v-if="descriptionData">
          <template v-if="descriptionData.description">
            <!-- use the same component as in project metadata to avoid different rendering -->
            <MetadataDescription
              v-if="isComponent"
              :original-description="descriptionData.description"
              :model-value="descriptionData.description"
            />
            <Description
              v-else
              id="node-description-html"
              :text="descriptionData.description"
              render-as-html
            />
          </template>

          <span v-else class="placeholder">
            There is no description for this node.
          </span>

          <ExternalResourcesList
            v-if="descriptionData.links"
            id="node-resources-list"
            :model-value="descriptionData.links"
          />

          <NodeFeatureList
            :in-ports="descriptionData.inPorts"
            :dyn-in-ports="descriptionData.dynInPorts"
            :out-ports="descriptionData.outPorts"
            :dyn-out-ports="descriptionData.dynOutPorts"
            :views="descriptionData.views"
            :options="descriptionData.options"
            class="node-feature-list"
          />

          <div
            v-if="descriptionData.extension && descriptionData.extension.vendor"
            class="extension-info"
          >
            <div class="header">
              <ExtensionIcon class="icon" />
              <span>Extension</span>
            </div>
            <div class="extension-name">
              {{ descriptionData.extension.name }}
            </div>
            <div class="extension-vendor">
              provided by {{ descriptionData.extension.vendor.name }}
              <KNIMETriangleIcon
                v-if="descriptionData.extension.vendor.isKNIME"
                class="knime-icon"
              />
            </div>
          </div>
        </template>
      </template>
      <div v-else class="placeholder no-node">Please select a node</div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-description {
  height: 100%;
  padding-right: 8px;
  padding-bottom: 8px;
  overflow: hidden auto;

  & > .node-header {
    position: sticky;
    z-index: 1;
    top: 0;
    background-color: inherit;

    & .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px 20px 5px;

      & h2 {
        margin: 0;
        font-weight: 400;
        font-size: 18px;
        line-height: 36px;
      }
    }
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0 20px;
  }

  & .node-info {
    padding: 10px 20px;
    display: flex;
    flex-direction: column;
  }

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

  & .close-button {
    margin-top: 2px;
    margin-right: -15px;
  }

  & .description {
    font-size: 13px;
    line-height: 150%;
    width: 310px;

    & :deep(h3) {
      font-size: 13px;
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

    & :deep(h5) {
      font-size: 13px;
      font-weight: 600;
      padding-left: 20px;
    }

    & :deep(h6) {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 0;
    }

    & :deep(.name) {
      font-size: 13px;
      font-weight: 600;
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

  /* Style refinement for Code */
  & :deep(tt),
  & :deep(pre),
  & :deep(code),
  & :deep(samp) {
    font-size: 11px;
    line-height: 150%;
  }

  /* Style refinement for Tables */
  & :deep(table) {
    width: 100%;
    font-size: 11px;
    border-spacing: 3px 0;
    margin-left: 10px;

    & th,
    & td {
      padding: 2px 0;
    }
  }

  & .extension-info {
    & > .header {
      display: flex;
      align-items: center;
      font-size: 16px;
      line-height: 150%;
      font-weight: 700;
      margin-bottom: 10px;

      & span {
        margin-left: 5px;
      }

      & .icon {
        @mixin svg-icon-size 18;
      }
    }

    & .extension-name,
    & .extension-vendor {
      font-size: 13px;
      line-height: 150%;

      & .knime-icon {
        @mixin svg-icon-size 18;

        fill: var(--knime-dove-gray);
      }
    }

    & .extension-name {
      font-weight: 700;
    }
  }
}
</style>
