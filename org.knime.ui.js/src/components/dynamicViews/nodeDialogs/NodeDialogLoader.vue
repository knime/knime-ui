<script lang="ts">
import { API } from "@api";
import { defineComponent, type PropType } from "vue";
import type { KnimeNode } from "@/api/custom-types";

import UIExtension from "pagebuilder/src/components/views/uiExtensions/UIExtension.vue";
import type { UIExtensionAPILayer } from "knime-js-pagebuilder/org.knime.js.pagebuilder/src/components/views/uiExtensions/types/UIExtensionAPILayer";
import type { ExtensionConfig } from "knime-js-pagebuilder/org.knime.js.pagebuilder/src/components/views/uiExtensions/types/ExtensionConfig";

type ComponentData = {
  deactivateDataServicesFn: (() => void) | null;
  apiLayer: null | UIExtensionAPILayer;
  extensionConfig:
    | null
    | (ExtensionConfig & { resourceInfo: { baseUrl: string } });
  configReady: boolean;
};

/**
 * Dynamically loads a component that will render a Node's configuration dialog
 */
export default defineComponent({
  components: {
    UIExtension,
  },

  props: {
    projectId: {
      type: String,
      required: true,
    },
    workflowId: {
      type: String,
      required: true,
    },
    selectedNode: {
      type: Object as PropType<KnimeNode>,
      required: true,
    },
  },

  data(): ComponentData {
    return {
      deactivateDataServicesFn: null,
      apiLayer: null,
      extensionConfig: null,
      configReady: false,
    };
  },

  computed: {
    renderKey(): string {
      if (this.selectedNode?.hasDialog) {
        return [this.projectId, this.workflowId, this.selectedNode.id].join(
          "/",
        );
      }
      return "";
    },
    resourceLocation() {
      const { baseUrl, path } = this.extensionConfig!.resourceInfo;
      return `${baseUrl}${path}`;
    },
  },

  watch: {
    renderKey() {
      this.loadExtensionConfig();
    },
  },

  unmounted() {
    if (this.deactivateDataServicesFn) {
      this.deactivateDataServicesFn();
    }
  },

  async mounted() {
    await this.loadExtensionConfig();
    this.apiLayer = {
      getResourceLocation: (path: string) => {
        const { baseUrl } = this.extensionConfig!.resourceInfo;
        return Promise.resolve(`${baseUrl}${path}`);
      },
      callNodeDataService: async (params) => {
        const { serviceType, dataServiceRequest } = params;
        const data = await API.node.callNodeDataService({
          projectId: this.projectId,
          workflowId: this.workflowId,
          nodeId: this.selectedNode.id,
          extensionType: "dialog",
          serviceType,
          dataServiceRequest,
        });
        return data;
      },
      updateDataPointSelection: () => {
        return Promise.resolve(null);
      },
      publishData: () => {},
      setReportingContent: () => {},
      imageGenerated: () => {},
      registerPushEventService: () => {
        return () => {};
      },
      sendAlert: () => {},
      close: () => {},
    };
    this.configReady = true;
  },

  methods: {
    async viewConfigLoaderFn() {
      try {
        const nodeDialogView = await API.node.getNodeDialog({
          projectId: this.projectId,
          workflowId: this.workflowId,
          nodeId: this.selectedNode.id,
        });

        if (nodeDialogView.deactivationRequired) {
          this.deactivateDataServicesFn = () => {
            API.node.deactivateNodeDataServices({
              projectId: this.projectId,
              workflowId: this.workflowId,
              nodeId: this.selectedNode.id,
              extensionType: "dialog",
            });
          };
        }

        return nodeDialogView;
      } catch (error) {
        throw error;
      }
    },

    async loadExtensionConfig() {
      this.extensionConfig = await this.viewConfigLoaderFn();
    },
  },
});
</script>

<template>
  <UIExtension
    v-if="configReady"
    :extension-config="extensionConfig!"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
