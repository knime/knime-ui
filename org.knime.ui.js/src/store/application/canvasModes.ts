import { defineStore } from "pinia";

export type CanvasMode = "selection" | "pan" | "annotation";

type CanvasModesState = {
  /**
   * an object that defines the current canvas mode
   */
  canvasMode: CanvasMode;
};

export const useCanvasModesStore = defineStore("canvasModes", {
  state: (): CanvasModesState => ({
    canvasMode: "selection",
  }),
  actions: {
    resetCanvasMode() {
      if (this.canvasMode !== "selection") {
        this.canvasMode = "selection";
      }
    },

    switchCanvasMode(value: CanvasMode) {
      this.canvasMode = value;
    },
  },
  getters: {
    hasAnnotationModeEnabled(state) {
      return state.canvasMode === "annotation";
    },

    hasSelectionModeEnabled(state) {
      return state.canvasMode === "selection";
    },

    hasPanModeEnabled(state) {
      return state.canvasMode === "pan";
    },
  },
});
