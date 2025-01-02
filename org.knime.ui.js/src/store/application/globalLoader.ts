import { defineStore } from "pinia";

export type GlobalLoaderConfig = {
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Text displayed below or besides the animated loading icon
   */
  text?: string;
  /**
   * determines the loader's appearance
   */
  displayMode?: "fullscreen" | "floating";
  /**
   * whether to use standard load without delay, or a staggered loader
   */
  loadingMode?: "stagger" | "normal";
  /**
   * number of stages to stagger for.
   */
  staggerStageCount?: 1 | 2;
};

export type GlobalLoaderState = {
  globalLoader: GlobalLoaderConfig;
};

export const useGlobalLoaderStore = defineStore("globalLoader", {
  state: (): GlobalLoaderState => ({
    globalLoader: {
      loading: false,
    },
  }),
  actions: {
    updateGlobalLoader(config: GlobalLoaderConfig) {
      this.globalLoader = { ...config };
    },
  },
});
