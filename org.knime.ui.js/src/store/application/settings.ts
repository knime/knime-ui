import { defineStore } from "pinia";

import {
  type CanvasRendererType,
  useCanvasRendererUtils,
} from "@/components/workflowEditor/util/canvasRenderer";
import { useSettingsStore } from "@/store/settings";

type ApplicationSettingsState = {
  /**
   * Indicates whether the browser has support (enabled) for the Clipboard API or not
   */
  hasClipboardSupport: boolean;
  /**
   * Indicates whether node recommendations are available or not
   */
  hasNodeRecommendationsEnabled: boolean;
  /*
   * If true, a node collection is configured on the preference page. The node search will show the nodes of the
   * collection first and the tag groups and node recommendations will only show nodes from the collection.
   */
  hasNodeCollectionActive: boolean | null;
  /**
   * Name of the currently active node collection.
   * @type {string}
   * @memberof AppState
   */
  activeNodeCollection: string;
  /**
   * If true, the mouse wheel should be used for zooming instead of scrolling
   */
  scrollToZoomEnabled: boolean;
  /*
   * If true, dev mode specifics buttons will be shown.
   */
  devMode: boolean;
/*
   * If false, the dev tools floating bar is hidden (only relevant when devMode is true).
   */
  showDevToolsBar: boolean;
  /*
   * Controls how a node configuration dialog is opened:
   * - "current"   : click on a node opens the floating config panel (default)
   * - "actionbar" : only the configure button in the node action bar opens
   *                 the panel; single click merely selects the node
   * - "modal"     : the config dialog is always opened as a modal (large mode)
   * - "dock"      : panel docks to the right edge; single click on a node
   *                 switches the docked config; cog icon hidden while docked
   */
  nodeConfigOpenMode: "current" | "actionbar" | "modal" | "dock";
  /*
   * Controls how the node output/port view is displayed relative to the config panel:
   * - "side-by-side" : node output occupies the left 2/3 of the config panel
   * - "bottom"       : node output shown in a separate resizable panel below the config panel
   */
  nodeOutputLayout: "bottom" | "side-by-side" | "right";
  /*
   * Whether the advanced options section in node configuration dialogs is expanded
   */
  showDialogAdvancedOptions: boolean;
  /*
   * Controls how jump mark navigation works in node configuration dialogs:
   * - "scrolling" : clicking a jump mark smooth-scrolls to that section
   * - "tabs"      : clicking a jump mark shows only that section (fake tab behaviour)
   */
  jumpMarksMode: "scrolling" | "tabs" | "horizontal-tabs" | "disabled";
  /*
   * Whether to enable the locking of metanodes and components
   */
  isSubnodeLockingEnabled: boolean;
  /*
   * Whether to use embedded node configuration dialogs
   */
  useEmbeddedDialogs: boolean;
  /*
   * Whether all K-AI-related features are enabled
   */
  isKaiEnabled: boolean;
  activeCanvasRenderer: CanvasRendererType;
  /*
   * When false, all view nodes render as compact pills regardless of execution state.
   * Inline view overlays are also hidden.
   */
  inlineViewsEnabled: boolean;
  /*
   * When false, the app header bar is hidden to maximise canvas space.
   * Toggled via Cmd+Shift+P.
   */
  showAppHeader: boolean;
};

export const useApplicationSettingsStore = defineStore("applicationSettings", {
  state: (): ApplicationSettingsState => ({
    hasClipboardSupport: false,
    hasNodeRecommendationsEnabled: false,
    hasNodeCollectionActive: null,
    activeNodeCollection: "",
    scrollToZoomEnabled: false,
    devMode: false,
    showDevToolsBar: true,
    nodeConfigOpenMode: "current",
    nodeOutputLayout: "side-by-side",
    inlineViewsEnabled: true,
    showDialogAdvancedOptions: false,
    jumpMarksMode: "scrolling",
    isSubnodeLockingEnabled: false,
    useEmbeddedDialogs: true,
    isKaiEnabled: true,
    activeCanvasRenderer: "SVG",
    showAppHeader: true,
  }),
  actions: {
    setHasClipboardSupport(hasClipboardSupport: boolean) {
      this.hasClipboardSupport = hasClipboardSupport;
    },

    setHasNodeRecommendationsEnabled(hasNodeRecommendationsEnabled: boolean) {
      this.hasNodeRecommendationsEnabled = hasNodeRecommendationsEnabled;
    },

    setScrollToZoomEnabled(scrollToZoomEnabled: boolean) {
      this.scrollToZoomEnabled = scrollToZoomEnabled;
    },

    setHasNodeCollectionActive(hasNodeCollectionActive: boolean | null) {
      this.hasNodeCollectionActive = hasNodeCollectionActive;
    },

    setActiveNodeCollection(activeNodeCollection: string) {
      this.activeNodeCollection = activeNodeCollection;
    },

    setDevMode(devMode: boolean) {
      this.devMode = devMode;
    },

    toggleDevToolsBar() {
      this.showDevToolsBar = !this.showDevToolsBar;
    },

    setNodeConfigOpenMode(mode: "current" | "actionbar" | "modal" | "dock") {
      this.nodeConfigOpenMode = mode;
      useSettingsStore().updateSetting({ key: "nodeConfigOpenMode", value: mode });
    },

    setNodeOutputLayout(layout: "bottom" | "side-by-side" | "right") {
      this.nodeOutputLayout = layout;
      useSettingsStore().updateSetting({ key: "nodeOutputLayout", value: layout });
    },

    setShowDialogAdvancedOptions(show: boolean) {
      this.showDialogAdvancedOptions = show;
      useSettingsStore().updateSetting({ key: "showDialogAdvancedOptions", value: show });
    },

    setJumpMarksMode(mode: "scrolling" | "tabs" | "horizontal-tabs" | "disabled") {
      this.jumpMarksMode = mode;
      useSettingsStore().updateSetting({ key: "jumpMarksMode", value: mode });
    },

    setIsSubnodeLockingEnabled(isSubnodeLockingEnabled: boolean) {
      this.isSubnodeLockingEnabled = isSubnodeLockingEnabled;
    },

    setUseEmbeddedDialogs(useEmbeddedDialogs: boolean) {
      this.useEmbeddedDialogs = useEmbeddedDialogs;
    },

    setIsKaiEnabled(isKaiEnabled: boolean) {
      this.isKaiEnabled = isKaiEnabled;
    },

    setActiveCanvasRenderer(renderer: CanvasRendererType) {
      this.activeCanvasRenderer = renderer;
      useCanvasRendererUtils().currentRenderer.value = renderer;
    },

    toggleAppHeader() {
      this.showAppHeader = !this.showAppHeader;
    },
  },
});
