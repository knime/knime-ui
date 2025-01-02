import { defineStore } from "pinia";

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
};

export const useApplicationSettingsStore = defineStore("applicationSettings", {
  state: (): ApplicationSettingsState => ({
    hasClipboardSupport: false,
    hasNodeRecommendationsEnabled: false,
    hasNodeCollectionActive: null,
    activeNodeCollection: "",
    scrollToZoomEnabled: false,
    devMode: false,
    isSubnodeLockingEnabled: false,
    useEmbeddedDialogs: true,
    isKaiEnabled: true,
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

    setIsSubnodeLockingEnabled(isSubnodeLockingEnabled: boolean) {
      this.isSubnodeLockingEnabled = isSubnodeLockingEnabled;
    },

    setUseEmbeddedDialogs(useEmbeddedDialogs: boolean) {
      this.useEmbeddedDialogs = useEmbeddedDialogs;
    },

    setIsKaiEnabled(isKaiEnabled: boolean) {
      this.isKaiEnabled = isKaiEnabled;
    },
  },
});
