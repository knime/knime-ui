import type { ActionTree, GetterTree, MutationTree } from "vuex";

import type {
  SpaceItemReference,
  WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "../types";

import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "./common";
import type { SpacesState } from "./index";
import type { PathTriplet } from "./types";
import { findSpaceById } from "./util";

interface State {
  workflowGroupCache: Map<string, WorkflowGroupContent>;
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
  workflowGroupCache: new Map(),
  // triplet data to remember current "path" of any SpaceExplorer component
  projectPath: {
    [cachedLocalSpaceProjectId]: localRootProjectPath,
  },
});

export const mutations: MutationTree<SpacesState> = {
  setProjectPath(
    state,
    { projectId, value }: { projectId: string; value: PathTriplet },
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
    { projectId, value }: { projectId: string; value: Partial<PathTriplet> },
  ) {
    const oldValue = state.projectPath[projectId];
    if (!oldValue) {
      consola.warn(
        "updateProjectPath failed project was never added",
        projectId,
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
    {
      projectId,
      content,
    }: { projectId: string; content: WorkflowGroupContent },
  ) {
    const key = state.projectPath[projectId];
    state.workflowGroupCache.set(JSON.stringify(key), content);
  },
};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  syncPathWithOpenProjects(
    { commit, state },
    {
      openProjects,
    }: { openProjects: { projectId: string; origin: SpaceItemReference }[] },
  ) {
    // add
    openProjects.forEach(({ projectId, origin }) => {
      // skip already existing paths
      if (state.projectPath[projectId]) {
        return;
      }

      const isKnownSpace =
        origin &&
        Boolean(findSpaceById(state.spaceProviders ?? {}, origin.spaceId));

      const projectPath = isKnownSpace
        ? {
            spaceId: origin.spaceId,
            spaceProviderId: origin.providerId,
            itemId: origin.ancestorItemIds?.at(0) ?? "root",
          }
        : // Take local root as default in case the workflow does not
          // have an origin or is from an unknown space
          localRootProjectPath;

      commit("setProjectPath", {
        projectId,
        value: projectPath,
      });
    });

    // remove
    const openProjectIds = openProjects.map((project) => project.projectId);
    const unknownProjectIds = Object.keys(state.projectPath).filter(
      (id) => !specialProjectIds.includes(id) && !openProjectIds.includes(id),
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
      const cacheKey = JSON.stringify(pathTriplet);
      if (!state.workflowGroupCache.has(cacheKey)) {
        return null;
      }

      return state.workflowGroupCache.get(cacheKey)!;
    },
};
