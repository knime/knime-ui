<script lang="ts">
import { API } from "@api";
import { defineComponent, type PropType } from "vue";
import type { KnimeNode } from "@/api/custom-types";
import type { CommonViewLoaderData } from "../common/types";
import UIExtension from "webapps-common/ui/uiExtensions/UIExtension.vue";

type ComponentData = CommonViewLoaderData & {
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
      if (!this.extensionConfig) {
        return "";
      }
      const { baseUrl, path } = this.extensionConfig.resourceInfo;
      return this.resourceLocationResolver(path ?? "", baseUrl);
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
          extensionType: "dialog",
          serviceType,
          dataServiceRequest,
        });
        return { result };
      },
      updateDataPointSelection: () => {
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
      setSettingsWithCleanModelSettings: noop,
      setDirtyModelSettings: noop,
      onApplied: noop,
    };
    this.configReady = true;
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
    async loadExtensionConfig() {
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

        this.extensionConfig = nodeDialogView;
      } catch (error) {
        throw error;
      }
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
