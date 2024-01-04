<script setup lang="ts">
/**
 * Dynamically loads and renders a component for a view in the workflow. This could be a port view
 * or a dialog view
 */
import { ref, watch, toRefs, onMounted, onUnmounted } from "vue";
import type { KnimeService } from "@knime/ui-extension-service";

// At the moment this component has to be directly provided because no dynamic counterparts
// that can be loaded exists. Eventually this view will also be loaded dynamically
import IFramePortView from "../portViews/IFramePortView.vue";
import type { ViewConfig, ResourceInfo } from "@/api/custom-types";
import { useDynamicImport } from "./useDynamicImport";

export type ViewStateChangeEvent = {
  state: "loading" | "ready" | "error";
  message?: string;
  portKey: string;
};

type ResourceLocationResolverFn = ({
  resourceInfo,
}: {
  resourceInfo: ResourceInfo;
}) => string;
type InitKnimeServiceFn = (viewConfig: ViewConfig) => KnimeService;
type ViewLoaderConfigFn = () => Promise<ViewConfig>;

// Keep track of the most recently loaded view key. Since views are loaded asynchronously,
// and only 1 view can be displayed at a time, if we get a response from a load
// request that's outdated because another view has
// been loaded, then we can ignore this outdated response by means of this key
let mostRecentlyLoadedViewKey = null;

type Props = {
  renderKey: string;
  viewConfigLoaderFn: ViewLoaderConfigFn;
  initKnimeService: InitKnimeServiceFn;
  resourceLocationResolver: ResourceLocationResolverFn;
  loadOnMount?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  loadOnMount: true,
});

type Emits = {
  (e: "stateChange", payload: ViewStateChangeEvent): void;
};

const emit = defineEmits<Emits>();

const activeDynamicView = ref<{ teardown: () => void } | null>(null);
const initialData = ref<unknown | null>(null);
const useIframe = ref(false);
const container = ref<HTMLElement | null>(null);
const { renderKey } = toRefs(props);

const { dynamicImport } = useDynamicImport();

/*
 * Renders a view dynamically by fetching the component library script over the network.
 */
const renderDynamicView = async (viewConfig: ViewConfig) => {
  // create knime service and update provide/inject
  const knimeService = props.initKnimeService(viewConfig);

  // set initial data and component
  const initialData = viewConfig.initialData
    ? JSON.parse(viewConfig.initialData).result
    : null;

  // get location of the script (es module)
  const resourceLocation = props.resourceLocationResolver({
    resourceInfo: viewConfig.resourceInfo,
  });

  // TODO: NXT-2291 This is a hack as we only have one type right now
  const shadowRootLibLocation = resourceLocation.replace(".umd.js", ".js");

  // load the dynamic view (es module) if its not already loaded
  const dynamicView = await dynamicImport(shadowRootLibLocation);

  // create dynamic view in shadow root
  // teardown active view if we have one
  if (activeDynamicView.value) {
    activeDynamicView.value?.teardown();
  }

  // create or reuse shadow root
  const shadowRoot = container.value!.shadowRoot
    ? container.value!.shadowRoot
    : container.value!.attachShadow({ mode: "open" });

  // call module default exported function to load the view
  activeDynamicView.value = dynamicView.default(
    shadowRoot,
    knimeService,
    initialData,
    (resourceInfo: ResourceInfo) =>
      props.resourceLocationResolver({ resourceInfo }),
  );
};

const loadView = async () => {
  let portKey = renderKey.value; // value at the time of dispatch
  mostRecentlyLoadedViewKey = portKey;
  emit("stateChange", { state: "loading", portKey });
  initialData.value = null;
  useIframe.value = false;

  try {
    const viewConfig = await props.viewConfigLoaderFn();
    if (portKey !== mostRecentlyLoadedViewKey) {
      return;
    }

    const resourceType = viewConfig.resourceInfo.type;
    if (resourceType === "HTML") {
      initialData.value = {
        src: props.resourceLocationResolver(viewConfig),
        style: viewConfig.iframeStyle,
      };
      useIframe.value = true;
    } else if (resourceType === "VUE_COMPONENT_LIB") {
      // suggestion: ES_SHADOW_ROOT_DYNAMIC_VIEW_LIB
      await renderDynamicView(viewConfig);
    } else {
      throw new Error("unknown resource type");
    }
    emit("stateChange", { state: "ready", portKey });
  } catch (e) {
    // @ts-expect-error
    emit("stateChange", { state: "error", message: e, portKey });
  }
};

watch(renderKey, async () => {
  await loadView();
});

onMounted(async () => {
  if (props.loadOnMount) {
    await loadView();
  }
});

onUnmounted(() => {
  mostRecentlyLoadedViewKey = null;
  activeDynamicView.value?.teardown();
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
