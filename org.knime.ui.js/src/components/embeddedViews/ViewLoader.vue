<script lang="ts">
/* eslint-disable valid-jsdoc */
import { defineComponent, type PropType } from "vue";
import type { KnimeService } from "@knime/ui-extension-service";

// At the moment this component has to be directly provided because no dynamic counterparts
// that can be loaded exists. Eventually this view will also be loaded dynamically
import IFramePortView from "@/components/output/IFramePortView.vue";
import type { ViewConfig, ResourceInfo } from "@/api/custom-types";

export type ViewStateChangeEvent = {
  state: "loading" | "ready" | "error";
  message?: string;
  portKey: string;
};

type ResourceLocationResolverFn = (params: {
  resourceInfo: ResourceInfo;
}) => string;
type InitKnimeServiceFn = (viewConfig: ViewConfig) => KnimeService;
type ViewLoaderConfigFn = () => Promise<ViewConfig>;

// Keep track of the most recently loaded view key. Since views are loaded asynchronously,
// and only 1 view can be displayed at a time, if we get a response from a load
// request that's outdated because another view has
// been loaded, then we can ignore this outdated response by means of this key
let mostRecentlyLoadedViewKey = null;

// cache the imported dynamic views
let dynamicViewImportCache = {};

/**
 * Dynamically loads and renders a component for a view in the workflow. This could be a port view
 * or a dialog view
 */
export default defineComponent({
  components: {
    IFramePortView,
  },

  props: {
    /**
     * A unique key that will be tracked for the loading / re-loading of the view.
     * Every time it changes the view will reload
     */
    renderKey: {
      type: String,
      required: true,
    },
    /**
     * A function to fetch the view's configuration object
     */
    viewConfigLoaderFn: {
      type: Function as PropType<ViewLoaderConfigFn>,
      required: true,
    },
    /**
     * A function to initialize the KnimeService. Will return the instance of the
     * KnimeService to inject into the loaded view
     */
    initKnimeService: {
      type: Function as PropType<InitKnimeServiceFn>,
      required: true,
    },
    /**
     * A function to resolve the url where to fetch the view from
     */
    resourceLocationResolver: {
      type: Function as PropType<ResourceLocationResolverFn>,
      required: true,
    },
    /**
     * Whether the view should be loaded as soon as the component is mounted
     */
    loadOnMount: {
      type: Boolean,
      default: true,
    },
  },

  emits: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stateChange: (_payload: ViewStateChangeEvent) => true,
  },

  data() {
    return {
      activeDynamicView: null,
      initialData: null,
      useIframe: false,
    };
  },

  watch: {
    async renderKey() {
      await this.loadView();
    },
  },

  async mounted() {
    if (this.loadOnMount) {
      await this.loadView();
    }
  },

  unmounted() {
    mostRecentlyLoadedViewKey = null;
    this.activeDynamicView?.teardown();
  },

  methods: {
    async loadView() {
      let portKey = this.renderKey; // value at the time of dispatch
      mostRecentlyLoadedViewKey = portKey;
      this.$emit("stateChange", { state: "loading", portKey });
      this.initialData = null;
      this.useIframe = false;

      try {
        const viewConfig = await this.viewConfigLoaderFn();
        if (portKey !== mostRecentlyLoadedViewKey) {
          return;
        }

        const resourceType = viewConfig.resourceInfo.type;
        if (resourceType === "HTML") {
          this.initialData = {
            src: this.resourceLocationResolver(viewConfig),
            style: viewConfig.iframeStyle,
          };
          this.useIframe = true;
        } else if (resourceType === "VUE_COMPONENT_LIB") {
          await this.renderDynamicView(viewConfig);
        } else {
          throw new Error("unknown resource type");
        }
        this.$emit("stateChange", { state: "ready", portKey });
      } catch (e) {
        this.$emit("stateChange", { state: "error", message: e, portKey });
      }
    },

    /*
     * Renders a view dynamically by fetching the component library script over the network.
     */
    async renderDynamicView(viewConfig: ViewConfig) {
      // create knime service and update provide/inject
      const knimeService = this.initKnimeService(viewConfig);

      // set initial data and component
      const initialData = viewConfig.initialData
        ? JSON.parse(viewConfig.initialData).result
        : null;

      // get location of the script (es module)
      const { resourceInfo } = viewConfig;
      const resourceLocation = this.resourceLocationResolver({ resourceInfo });

      // load the dynamic view (es module) if its not already loaded
      if (!dynamicViewImportCache[resourceLocation]) {
        dynamicViewImportCache[resourceLocation] = await import(
          /* @vite-ignore */ resourceLocation
        );
      }

      // create dynamic view in shadow root
      const container = this.$refs.container as HTMLElement;
      // teardown active view if we have one
      if (this.activeDynamicView) {
        this.activeDynamicView?.teardown();
      }

      // create or reuse shadow root
      const shadowRoot = container.shadowRoot
        ? container.shadowRoot
        : container.attachShadow({ mode: "open" });

      // call module default exported function to load the view
      const loadDynamicView = dynamicViewImportCache[resourceLocation].default;
      this.activeDynamicView = loadDynamicView(
        shadowRoot,
        knimeService,
        initialData,
        (resourceInfo: { baseUrl: string; path: string }) =>
          this.$store.getters["api/uiExtResourceLocation"]({ resourceInfo }),
      );
    },
  },
});
</script>

<template>
  <IFramePortView v-if="useIframe" :initial-data="initialData" />
  <div v-else ref="container" class="view-loader-container" />
</template>

<style lang="postcss" scoped>
.view-loader-container {
  /** required for the table view */
  height: 100%;
}
</style>
