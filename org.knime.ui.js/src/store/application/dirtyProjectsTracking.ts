import { defineStore } from "pinia";

type DirtyProjectsTrackingState = {
  /**
   * an object that maps projectIds to the isDirty flag of the workflow
   */
  dirtyProjectsMap: Record<string, boolean>;
};

export const useDirtyProjectsTrackingStore = defineStore(
  "dirtyProjectsTracking",
  {
    state: (): DirtyProjectsTrackingState => ({
      dirtyProjectsMap: {},
    }),
    actions: {
      updateDirtyProjectsMap(dirtyProjectsMap: Record<string, boolean>) {
        const updatedDirtyProjectsMap = {
          ...this.dirtyProjectsMap,
          ...dirtyProjectsMap,
        };
        this.dirtyProjectsMap = updatedDirtyProjectsMap;
      },
    },
  },
);
