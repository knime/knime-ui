import { defineStore } from "pinia";

import { useApplicationStore } from "@/store/application/application.ts";

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
        this.dirtyProjectsMap = {
          ...this.dirtyProjectsMap,
          ...dirtyProjectsMap,
        };
      },
    },
    getters: {
      isDirtyActiveProject: (): boolean => {
        const projectId = useApplicationStore().activeProjectId;
        if (!projectId) {
          return false;
        }
        return Boolean(
          useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId],
        );
      },
    },
  },
);
