<script lang="ts">
import { defineComponent, type PropType } from "vue";

import { API } from "@api";
import type { KnimeNode } from "@/api/custom-types";

import UIExtension from "pagebuilder/src/components/views/uiExtensions/UIExtension.vue";
import type { UIExtensionAPILayer } from "pagebuilder/src/components/views/uiExtensions/types/UIExtensionAPILayer";
import type { ExtensionConfig } from "pagebuilder/src/components/views/uiExtensions/types/ExtensionConfig";
import type { Alert } from "@knime/ui-extension-service";

type ComponentData = {
  error: unknown | null;
  deactivateDataServicesFn: (() => void) | null;
  apiLayer: null | UIExtensionAPILayer;
  extensionConfig:
    | null
    | (ExtensionConfig & { resourceInfo: { baseUrl: string } });
  configReady: boolean;
  loading: boolean;
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
      type: String as PropType<string>,
      required: true,
    },
    workflowId: {
      type: String as PropType<string>,
      required: true,
    },
    selectedNode: {
      type: Object as PropType<KnimeNode>,
      required: true,
    },
    selectedPortIndex: {
      type: Number as PropType<number>,
      required: true,
    },
    selectedViewIndex: {
      type: Number as PropType<number>,
      required: true,
    },
    uniquePortKey: {
      type: String as PropType<string>,
      required: true,
    },
  },

  emits: ["stateChange"],

  data(): ComponentData {
    return {
      error: null,
      deactivateDataServicesFn: null,
      apiLayer: null,
      extensionConfig: null,
      configReady: false,
      loading: false,
    };
  },

  computed: {
    resourceLocation() {
      const { baseUrl, path } = this.extensionConfig!.resourceInfo;
      return `${baseUrl}${path}`;
    },
  },

  watch: {
    uniquePortKey: {
      async handler() {
        this.error = null;
        this.loading = true;
        this.$emit("stateChange", {
          state: "loading",
          portKey: this.uniquePortKey,
        });
        await this.loadExtensionConfig();
        this.$emit("stateChange", {
          state: "ready",
          portKey: this.uniquePortKey,
        });
        this.loading = false;
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
        return Promise.resolve(`${baseUrl}${path}`);
      },
      callNodeDataService: async (params) => {
        const { serviceType, dataServiceRequest } = params;
        const result = await API.port.callPortDataService({
          projectId: this.projectId,
          workflowId: this.workflowId,
          nodeId: this.selectedNode.id,
          portIdx: this.selectedPortIndex,
          viewIdx: this.selectedViewIndex,
          serviceType: serviceType as "initial_data" | "data",
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
      sendAlert: (alert: Alert, closeAlert?: () => void) => {
        consola.warn("Notifications not yet implemented");

        this.$emit("stateChange", {
          state: "error",
          message: alert.subtitle,
        });

        // remove button if there is one
        closeAlert?.();
      },
      close: () => {},
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
  },
});
</script>

<template>
  <UIExtension
    v-if="!error && configReady && !loading"
    :extension-config="extensionConfig!"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
