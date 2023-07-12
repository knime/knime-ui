import type { ActionTree, GetterTree, MutationTree } from "vuex";

import type {
  SpaceItemReference,
  WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";

import type { RootStoreState } from "../types";
import type { SpacesState } from "./index";
import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "./common";
import type { PathTriplet } from "./types";

interface State {
  workflowGroupCache: WeakMap<PathTriplet, WorkflowGroupContent>;
  projectPath: Record<string, PathTriplet>;
}

declare module "./index" {
  interface SpacesState extends State {}
}

export const localRootProjectPath = {
  spaceId: "local",
  spaceProviderId: "local",
  itemId: "root",
};

const specialProjectIds = [
  globalSpaceBrowserProjectId,
  cachedLocalSpaceProjectId,
];

export const state = (): State => ({
  // current content of active browser (files and folders)
  workflowGroupCache: new WeakMap(),
  // triplet data to remember current "path" of any SpaceExplorer component
  projectPath: {
    [cachedLocalSpaceProjectId]: localRootProjectPath,
  },
});

export const mutations: MutationTree<SpacesState> = {
  setProjectPath(
    state,
    { projectId, value }: { projectId: string; value: PathTriplet }
  ) {
    state.projectPath = {
      ...state.projectPath,
      [projectId]: value,
    };
  },

  removeProjectPath(state, projectId: string) {
    // removing the projectPath object will also clear the workflowGroupCache
    // for that path as it is used as key for the WeakMap
    delete state.projectPath[projectId];
  },

  updateProjectPath(
    state,
    { projectId, value }: { projectId: string; value: Partial<PathTriplet> }
  ) {
    const oldValue = state.projectPath[projectId];
    if (!oldValue) {
      consola.warn(
        "updateProjectPath failed project was never added",
        projectId
      );
      return false;
    }

    state.projectPath = {
      ...state.projectPath,
      [projectId]: { ...oldValue, ...value },
    };
    return true;
  },

  setWorkflowGroupContent(
    state,
    { projectId, content }: { projectId: string; content: WorkflowGroupContent }
  ) {
    const key = state.projectPath[projectId];
    state.workflowGroupCache.set(key, content);
  },
};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  syncPathWithOpenProjects(
    { commit, state },
    {
      openProjects,
    }: { openProjects: { projectId: string; origin: SpaceItemReference }[] }
  ) {
    // add
    openProjects.forEach(({ projectId, origin }) => {
      if (!state.projectPath[projectId]) {
        // Take local root as default in case the workflow does not have an origin (ex. was Drag & Dropped from hub)
        let projectPath = localRootProjectPath;
        if (origin) {
          const {
            spaceId,
            providerId: spaceProviderId,
            ancestorItemIds: [itemId = "root"],
          } = origin;
          projectPath = {
            spaceId,
            spaceProviderId,
            itemId,
          };
        }
        commit("setProjectPath", {
          projectId,
          value: projectPath,
        });
      }
    });
    // remove
    const openProjectIds = openProjects.map((project) => project.projectId);
    const unknownProjectIds = Object.keys(state.projectPath).filter(
      (id) => !specialProjectIds.includes(id) && !openProjectIds.includes(id)
    );
    unknownProjectIds.forEach((projectId) => {
      commit("removeProjectPath", projectId);
    });
  },
};

export const getters: GetterTree<SpacesState, RootStoreState> = {
  getWorkflowGroupContent:
    (state) =>
    (projectId: string): WorkflowGroupContent | null => {
      const pathTriplet = state.projectPath[projectId];
      if (!state.workflowGroupCache.has(pathTriplet)) {
        return null;
      }
      return state.workflowGroupCache.get(pathTriplet);
    },
};
