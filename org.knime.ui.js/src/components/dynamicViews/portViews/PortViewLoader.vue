<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { type ExtensionConfig } from "@knime/ui-extension-service";

import { API } from "@api";
import type { KnimeNode, ResourceInfo } from "@/api/custom-types";

import UIExtension from "pagebuilder/src/components/views/uiExtensions/UIExtension.vue";
import type { UIExtensionAPILayer } from "pagebuilder/src/components/views/uiExtensions/types/UIExtensionAPILayer";

type ComponentData = {
  error: unknown | null;
  deactivateDataServicesFn: (() => void) | null;
  apiLayer: null | UIExtensionAPILayer;
  extensionConfig:
    | null
    | (Omit<ExtensionConfig, "resourceInfo"> & {
        resourceInfo: ResourceInfo;
      });
  configReady: boolean;
};

/**
 * Dynamically loads a component that will render a Port's output view
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
    selectedPortIndex: {
      type: Number,
      required: true,
    },
    selectedViewIndex: {
      type: Number,
      required: true,
    },
    uniquePortKey: {
      type: String,
      required: true,
    },
  },

  emits: ["stateChange", "registerPushEventService"],

  data(): ComponentData {
    return {
      error: null,
      deactivateDataServicesFn: null,
      apiLayer: null,
      extensionConfig: null,
      configReady: false,
    };
  },

  computed: {
    resourceLocation() {
      const { baseUrl, path } = this.extensionConfig!.resourceInfo;
      return this.resourceLocationResolver(path, baseUrl);
    },
  },

  watch: {
    uniquePortKey: {
      async handler() {
        this.error = null;
        this.configReady = false;
        this.$emit("stateChange", {
          state: "loading",
          portKey: this.uniquePortKey,
        });
        await this.loadExtensionConfig();
        this.configReady = true;
        this.$emit("stateChange", {
          state: "ready",
          portKey: this.uniquePortKey,
        });
      },
    },
  },

  async mounted() {
    this.$emit("stateChange", {
      state: "loading",
      portKey: this.uniquePortKey,
    });
    await this.loadExtensionConfig();
    this.apiLayer = {
      getResourceLocation: (path: string) => {
        const { baseUrl } = this.extensionConfig!.resourceInfo;
        return this.resourceLocationResolver(path, baseUrl);
      },
      callNodeDataService: async (params) => {
        const { nodeId, workflowId, serviceType, dataServiceRequest } = params;
        // TODO: investigate consola.log("proj", params.projectId, this.projectId);
        const response = await API.port.callPortDataService({
          projectId: this.projectId,
          workflowId,
          nodeId,
          portIdx: this.selectedPortIndex,
          viewIdx: this.selectedViewIndex,
          serviceType: serviceType as "initial_data" | "data",
          dataServiceRequest,
        });

        return { result: JSON.parse(response) };
      },
      updateDataPointSelection: (params) => {
        consola.log("updateDataPointSelection", params);
      },
      publishData: (data) => {
        consola.log("configReady", data);
      },
      setReportingContent: (reportingContent) => {
        consola.log("setReportingContent", reportingContent);
      },
      imageGenerated: (generatedImage) => {
        consola.log("imageGenerated", generatedImage);
      },
      registerPushEventService: ({ dispatchPushEvent }) => {
        const service = {
          onServiceEvent: dispatchPushEvent,
          serviceId: "serviceID", // ?
        };
        consola.log("registerPushEventService", service);

        this.$emit("registerPushEventService", dispatchPushEvent);
        return () => {
          /* deregister */
        };
      },
      sendAlert: (alert: Alert, closeAlert?: () => void) => {
        consola.log("sendAlert", alert, closeAlert);
      },
      close(isMetaKeyPressed: boolean) {
        consola.log("close", isMetaKeyPressed);
      },
    };
    this.configReady = true;
    this.$emit("stateChange", { state: "ready", portKey: this.uniquePortKey });
  },

  unmounted() {
    if (this.deactivateDataServicesFn) {
      this.deactivateDataServicesFn();
    }
  },

  methods: {
    async viewConfigLoaderFn() {
      const portView = await API.port.getPortView({
        projectId: this.projectId,
        workflowId: this.workflowId,
        nodeId: this.selectedNode.id,
        portIdx: this.selectedPortIndex,
        viewIdx: this.selectedViewIndex,
      });
      this.modifyPortViewSettings(portView);
      if (portView.deactivationRequired) {
        this.deactivateDataServicesFn = () => {
          API.port.deactivatePortDataServices({
            projectId: this.projectId,
            workflowId: this.workflowId,
            nodeId: this.selectedNode.id,
            portIdx: this.selectedPortIndex,
            viewIdx: this.selectedViewIndex,
          });
        };
      }
      return portView;
    },

    modifyPortViewSettings(portView: unknown) {
      // Introduced with NXT-2044 because selection is enabled for the detached
      // table port view (via the table port view settings) but not yet
      // supported by the _embedded_ (this) table port view. Hence, we modify
      // the table port view settings to _not_ show the selection checkboxes.
      // Workaround to be removed with NXT-2042.

      if (
        typeof portView !== "object" ||
        portView === null ||
        (typeof portView === "object" && !("initialData" in portView))
      ) {
        return;
      }

      if (!portView.initialData || typeof portView.initialData !== "string") {
        return;
      }

      const initialData = JSON.parse(portView.initialData);
      const settings = initialData?.result?.settings;
      if (settings?.selectionMode === "EDIT") {
        settings.selectionMode = "OFF";
        portView.initialData = JSON.stringify(initialData);
      }
    },

    async loadExtensionConfig() {
      this.extensionConfig = await this.viewConfigLoaderFn();
    },

    resourceLocationResolver(path: string, baseUrl?: string): string {
      // TODO: NXT-1295. Originally caused NXT-1217
      // Remove this unnecessary store getter once the issue in the ticket
      // can be solved in a better way. It is necessary at the moment because the TableView is accessing
      // this store module internally, so if not provided then it would error out in the application
      return this.$store.getters["api/uiExtResourceLocation"]({
        resourceInfo: { path, baseUrl },
      });
    },
  },
});
</script>

<template>
  <UIExtension
    v-if="!error && configReady"
    :extension-config="extensionConfig!"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
