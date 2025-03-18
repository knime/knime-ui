import { describe, expect, it } from "vitest";

import { loadStore } from "@/store/application/__tests__/loadStore";

describe("dirty projects tracking", () => {
  it("dirty tracking map is updated", () => {
    const { dirtyProjectsTrackingStore } = loadStore();

    dirtyProjectsTrackingStore.updateDirtyProjectsMap({ projectId1: true });
    dirtyProjectsTrackingStore.updateDirtyProjectsMap({ projectId2: false });

    expect(dirtyProjectsTrackingStore.dirtyProjectsMap.projectId1).toBe(true);
    expect(dirtyProjectsTrackingStore.dirtyProjectsMap.projectId2).toBe(false);
  });

  describe("gets dirty state for active project", () => {
    it("if projectId is in dirtyProjectsMap", () => {
      const { applicationStore, dirtyProjectsTrackingStore } = loadStore();
      dirtyProjectsTrackingStore.updateDirtyProjectsMap({ projectId1: true });
      dirtyProjectsTrackingStore.updateDirtyProjectsMap({ projectId2: false });

      applicationStore.setActiveProjectId("projectId1");
      expect(dirtyProjectsTrackingStore.isDirtyActiveProject).toBe(true);

      applicationStore.setActiveProjectId("projectId2");
      expect(dirtyProjectsTrackingStore.isDirtyActiveProject).toBe(false);
    });

    it("if projectId is not in dirtyProjectsMap", () => {
      const { applicationStore, dirtyProjectsTrackingStore } = loadStore();

      applicationStore.setActiveProjectId("unknownProjectId");
      expect(dirtyProjectsTrackingStore.isDirtyActiveProject).toBe(false);
    });

    it("if there is no active projectId in application store", () => {
      const { dirtyProjectsTrackingStore } = loadStore();

      expect(dirtyProjectsTrackingStore.isDirtyActiveProject).toBe(false);
    });
  });
});
