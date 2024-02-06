<script lang="ts">
import { mapGetters, mapState } from "vuex";
import { API } from "@api";

import UIExtension from "pagebuilder/src/components/views/uiExtensions/UIExtension.vue";
import { defineComponent } from "vue";
import type { CommonViewLoaderData } from "../common/types";

type ComponentData = CommonViewLoaderData & {
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
      if (!this.extensionConfig) {
        return "";
      }
      const { baseUrl, path } = this.extensionConfig.resourceInfo;
      return this.resourceLocationResolver(path ?? "", baseUrl);
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

      const noop = () => {};

      this.apiLayer = {
        getResourceLocation: (path: string) => {
          return Promise.resolve(
            this.resourceLocationResolver(
              path,
              this.extensionConfig?.resourceInfo?.baseUrl,
            ),
          );
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
          // TODO: impl with NXT-2383 https://knime-com.atlassian.net/browse/NXT-2383
          return Promise.resolve(null);
        },
        publishData: noop,
        setReportingContent: noop,
        imageGenerated: noop,
        registerPushEventService: () => {
          return noop;
        },
        sendAlert: noop,
        close: noop,
      };

      await this.loadContent();

      this.isReady = true;
      this.$emit("stateChange", { state: "ready" });
    } catch (error) {
      this.$emit("stateChange", { state: "error", message: error });
    }
  },

  methods: {
    resourceLocationResolver(path: string, baseUrl?: string) {
      // TODO: NXT-1295. Originally caused NXT-1217
      // Remove this unnecessary store getter once the issue in the ticket
      // can be solved in a better way. It is necessary at the moment because the TableView is accessing
      // this store module internally, so if not provided then it would error out in the application
      return this.$store.getters["api/uiExtResourceLocation"]({
        resourceInfo: { path, baseUrl },
      });
    },

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
