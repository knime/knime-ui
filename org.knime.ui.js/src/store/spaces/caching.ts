import { defineStore } from "pinia";

import type {
  Project,
  WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "../application/application";

import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "./common";
import { useSpaceProvidersStore } from "./providers";
import { findSpaceById } from "./util";

export const localRootProjectPath = {
  spaceId: "local",
  spaceProviderId: "local",
  itemId: "root",
};

const specialProjectIds = [
  globalSpaceBrowserProjectId,
  cachedLocalSpaceProjectId,
];

export interface PathTriplet {
  spaceId: string;
  spaceProviderId: string;
  itemId: string;
}

type CachingState = {
  workflowGroupCache: Map<string, WorkflowGroupContent>;
  projectPath: Record<string, PathTriplet>;
};

export const useSpaceCachingStore = defineStore("space.caching", {
  state: (): CachingState => ({
    // current content of active browser (files and folders)
    workflowGroupCache: new Map(),
    // triplet data to remember current "path" of any SpaceExplorer component
    projectPath: {
      [cachedLocalSpaceProjectId]: localRootProjectPath,
    },
  }),
  actions: {
    setProjectPath({
      projectId,
      value,
    }: {
      projectId: string;
      value: PathTriplet;
    }) {
      this.projectPath = {
        ...this.projectPath,
        [projectId]: value,
      };
    },

    removeProjectPath(projectId: string) {
      // removing the projectPath object will also clear the workflowGroupCache
      // for that path as it is used as key for the WeakMap
      delete this.projectPath[projectId];
    },

    updateProjectPath({
      projectId,
      value,
    }: {
      projectId: string;
      value: Partial<PathTriplet>;
    }) {
      const oldValue = this.projectPath[projectId];
      if (!oldValue) {
        consola.warn(
          "updateProjectPath failed project was never added",
          projectId,
        );
        return false;
      }

      this.projectPath = {
        ...this.projectPath,
        [projectId]: { ...oldValue, ...value },
      };
      return true;
    },

    setWorkflowGroupContent({
      projectId,
      content,
    }: {
      projectId: string;
      content: WorkflowGroupContent;
    }) {
      const key = this.projectPath[projectId];
      this.workflowGroupCache.set(JSON.stringify(key), content);
    },

    syncPathWithOpenProjects({ openProjects }: { openProjects: Project[] }) {
      // add
      openProjects.forEach(({ projectId, origin }) => {
        // skip already existing paths
        if (this.projectPath[projectId]) {
          return;
        }

        const isKnownSpace =
          origin &&
          Boolean(
            findSpaceById(
              useSpaceProvidersStore().spaceProviders ?? {},
              origin.spaceId,
            ),
          );

        const projectPath = isKnownSpace
          ? {
              spaceId: origin.spaceId,
              spaceProviderId: origin.providerId,
              itemId: origin.ancestorItemIds?.at(0) ?? "root",
            }
          : // Take local root as default in case the workflow does not
            // have an origin or is from an unknown space
            localRootProjectPath;

        this.setProjectPath({
          projectId,
          value: projectPath,
        });
      });

      // remove
      const openProjectIds = openProjects.map((project) => project.projectId);
      const unknownProjectIds = Object.keys(this.projectPath).filter(
        (id) => !specialProjectIds.includes(id) && !openProjectIds.includes(id),
      );

      unknownProjectIds.forEach((projectId) => {
        this.removeProjectPath(projectId);
      });
    },
  },
  getters: {
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

    activeProjectPath: (state) => {
      const { activeProjectId } = useApplicationStore();

      if (!activeProjectId) {
        return null;
      }

      return state.projectPath[activeProjectId];
    },
  },
});
