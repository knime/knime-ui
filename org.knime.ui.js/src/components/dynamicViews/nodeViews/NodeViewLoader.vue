<script lang="ts">
import { mapGetters, mapState } from "vuex";
import { API } from "@api";

import UIExtension from "pagebuilder/src/components/views/uiExtensions/UIExtension.vue";
import type { UIExtensionAPILayer } from "knime-js-pagebuilder/org.knime.js.pagebuilder/src/components/views/uiExtensions/types/UIExtensionAPILayer";
import type { ExtensionConfig } from "knime-js-pagebuilder/org.knime.js.pagebuilder/src/components/views/uiExtensions/types/ExtensionConfig";
import { defineComponent } from "vue";

type ComponentData = {
  deactivateDataServicesFn: (() => void) | null;
  apiLayer: null | UIExtensionAPILayer;
  extensionConfig:
    | null
    | (ExtensionConfig & { resourceInfo: { baseUrl: string } });
  isReady: boolean;
};
/**
 * Renders a node view via the PageBuilder component
 */
export default defineComponent({
  components: {
    UIExtension,
  },

  emits: ["stateChange"],

  data(): ComponentData {
    return {
      isReady: false,
      deactivateDataServicesFn: null,
      apiLayer: null,
      extensionConfig: null,
    };
  },

  computed: {
    ...mapState("application", { projectId: "activeProjectId" }),
    ...mapState("workflow", {
      workflowId: (state: any) => state.activeWorkflow.info.containerId,
    }),
    ...mapGetters("selection", { selectedNode: "singleSelectedNode" }),

    hasView() {
      return Boolean(this.selectedNode?.hasView);
    },

    resourceLocation() {
      const { baseUrl, path } = this.extensionConfig!.resourceInfo;
      return `${baseUrl}${path}`;
    },
  },

  watch: {
    selectedNode: {
      handler(newNode) {
        // if (!this.showDialog && newNode === null && oldNode.hasView) {
        //     // TODO remove selection event listener if
        //     // * node views are shown (instead of dialogs)
        //     // * no other node is selected
        //     // * the previous node had a view
        // }

        if (newNode?.hasView) {
          this.loadContent();
        }
      },
    },
  },

  unmounted() {
    if (this.deactivateDataServicesFn) {
      this.deactivateDataServicesFn();
    }
  },

  async created() {
    try {
      this.$emit("stateChange", { state: "loading", message: "Loading view" });

      this.apiLayer = {
        getResourceLocation: (path: string) => {
          const { baseUrl } = this.extensionConfig!.resourceInfo;
          return Promise.resolve(`${baseUrl}${path}`);
        },
        callNodeDataService: async (params) => {
          const { serviceType, dataServiceRequest } = params;
          const result = await API.node.callNodeDataService({
            projectId: this.projectId,
            workflowId: this.workflowId,
            nodeId: this.selectedNode.id,
            extensionType: "view",
            serviceType,
            dataServiceRequest,
          });
          return { result };
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

      await this.loadContent();

      this.isReady = true;
      this.$emit("stateChange", { state: "ready" });
    } catch (error) {
      this.$emit("stateChange", { state: "error", message: error });
    }
  },

  methods: {
    async loadContent() {
      try {
        if (!this.selectedNode) {
          return;
        }

        const nodeId = this.selectedNode.id;

        const nodeView = await API.node.getNodeView({
          projectId: this.projectId,
          workflowId: this.workflowId,
          nodeId,
        });

        if (nodeView.deactivationRequired) {
          this.deactivateDataServicesFn = () => {
            API.node.deactivateNodeDataServices({
              projectId: this.projectId,
              workflowId: this.workflowId,
              nodeId,
              extensionType: "view",
            });
          };
        }

        this.extensionConfig = nodeView;
      } catch (error) {
        consola.log("Error loading view content", error);
        throw error;
      }
    },
  },
});
</script>

<template>
  <UIExtension
    v-if="isReady"
    :extension-config="extensionConfig!"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
