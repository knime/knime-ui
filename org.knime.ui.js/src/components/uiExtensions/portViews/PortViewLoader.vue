<script lang="ts">
import { defineComponent, type PropType } from "vue";

import { API } from "@api";
import type { KnimeNode } from "@/api/custom-types";

import { UIExtension } from "webapps-common/ui/uiExtensions";
import { AlertType, type Alert } from "@knime/ui-extension-service";
import type { CommonViewLoaderData } from "../common/types";

type ComponentData = CommonViewLoaderData & {
  error: unknown | null;
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
      if (!this.extensionConfig) {
        return "";
      }
      const { baseUrl, path } = this.extensionConfig.resourceInfo;
      return this.resourceLocationResolver(path ?? "", baseUrl);
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
        // TODO: impl with NXT-2383 https://knime-com.atlassian.net/browse/NXT-2383
        return Promise.resolve(null);
      },
      publishData: noop,
      setReportingContent: noop,
      imageGenerated: noop,
      registerPushEventService: () => {
        return noop;
      },
      sendAlert: (alert: Alert, closeAlert?: () => void) => {
        consola.warn("Alerts not yet implemented");

        if (alert.type === AlertType.ERROR) {
          this.$emit("stateChange", {
            state: "error",
            message: alert.subtitle,
          });
          // remove button if there is one
          closeAlert?.();
        }
      },
      setSettingsWithCleanModelSettings: noop,
      setDirtyModelSettings: noop,
      onApplied: noop,
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
      this.extensionConfig = portView;
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
  },
});
</script>

<template>
  <UIExtension
    v-if="!error && configReady && !loading"
    :extension-config="extensionConfig!"
    :shadow-app-style="{ height: '100%' }"
    :resource-location="resourceLocation"
    :api-layer="apiLayer!"
  />
</template>
