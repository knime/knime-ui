<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { KnimeService } from "@knime/ui-extension-service";

import { API } from "@api";
import type { KnimeNode, ResourceInfo, ViewConfig } from "@/api/custom-types";
import ViewLoader from "../common/ViewLoader.vue";

type ComponentData = {
  error: unknown | null;
  deactivateDataServicesFn: (() => void) | null;
};

/**
 * Dynamically loads a component that will render a Port's output view
 */
export default defineComponent({
  components: {
    ViewLoader,
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

  emits: ["stateChange"],

  data(): ComponentData {
    return { error: null, deactivateDataServicesFn: null };
  },

  watch: {
    uniquePortKey() {
      this.error = null;
    },
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

    resourceLocationResolver({
      resourceInfo,
    }: {
      resourceInfo: ResourceInfo;
    }): string {
      // TODO: NXT-1295. Originally caused NXT-1217
      // Remove this unnecessary store getter once the issue in the ticket
      // can be solved in a better way. It is necessary at the moment because the TableView is accessing
      // this store module internally, so if not provided then it would error out in the application
      return this.$store.getters["api/uiExtResourceLocation"]({ resourceInfo });
    },

    onStateChange(newState: { portKey: string }) {
      if (this.uniquePortKey !== newState.portKey) {
        // We are not interested in this state change since it corresponds to a port key
        // we are not currently displaying.
        return;
      }
      this.$emit("stateChange", newState);
    },

    /* Required by dynamically loaded view components */
    initKnimeService(config: ViewConfig) {
      return new KnimeService(
        // @ts-expect-error -- Because types are not generated from the API atm (UIEXT-932)
        config,

        // Data Service Callback
        async (_, serviceType, dataServiceRequest) => {
          const response = await API.port.callPortDataService({
            projectId: this.projectId,
            workflowId: this.workflowId,
            nodeId: this.selectedNode.id,
            portIdx: this.selectedPortIndex,
            viewIdx: this.selectedViewIndex,
            serviceType,
            dataServiceRequest,
          });

          return { result: JSON.parse(response) };
        },

        // Notification Callback
        (pushEvent) => {
          // TODO: NXT-1211 implement follow-up ticket for selection/hightlighting in the knime-ui-table
          consola.warn("Notifications not yet implemented");
          this.error = pushEvent.alert.subtitle;

          this.$emit("stateChange", {
            state: "error",
            message: this.error,
          });
          return Promise.resolve("");
        },
      );
    },
  },
});
</script>

<template>
  <ViewLoader
    v-if="!error"
    :render-key="uniquePortKey"
    :init-knime-service="initKnimeService"
    :view-config-loader-fn="viewConfigLoaderFn"
    :resource-location-resolver="resourceLocationResolver"
    @state-change="onStateChange"
  />
</template>
