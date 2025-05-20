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
  lastTaskProgress?: number;
  lastTaskMessage?: string;
};

export const useGlobalLoaderStore = defineStore("globalLoader", {
  state: (): GlobalLoaderState => ({
    globalLoader: {
      loading: false,
    },
    lastTaskProgress: undefined,
    lastTaskMessage: undefined,
  }),
  actions: {
    updateGlobalLoader(config: GlobalLoaderConfig) {
      this.globalLoader = { ...config };
    },
    updateTaskStatus({
      progress,
      message,
      error,
    }: {
      progress?: number;
      message?: string;
      error?: string;
    }) {
      // Store the latest progress and message
      if (progress !== undefined) {
        this.lastTaskProgress = progress;
      }
      if (message !== undefined) {
        this.lastTaskMessage = message;
      }

      // TODO show error
      // TODO allow cancellation

      // If error or both progress and message are undefined, the task is complete
      if (
        error !== undefined ||
        (progress === undefined && message === undefined)
      ) {
        this.globalLoader = { loading: false };
        this.lastTaskProgress = undefined;
        this.lastTaskMessage = undefined;
        return;
      }

      // Create display text using both the latest progress and message if available
      let displayText: string | undefined;
      if (this.lastTaskMessage !== undefined) {
        displayText = this.lastTaskMessage;
        if (this.lastTaskProgress !== undefined) {
          displayText += ` (${Math.round(this.lastTaskProgress * 100)}%)`;
        }
      } else if (this.lastTaskProgress !== undefined) {
        displayText = `${Math.round(this.lastTaskProgress * 100)}%`;
      }

      this.globalLoader = {
        loading: true,
        displayMode: "floating",
        loadingMode: "normal",
        text: displayText,
      };
    },
  },
});
