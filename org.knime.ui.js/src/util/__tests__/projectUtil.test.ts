import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockStores } from "@/test/utils/mockStores";
import { getProjectIdScopedByUserAndProvider } from "../projectUtil";

describe("projectUtil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProjectIdScopedByUserAndProvider", () => {
    const createProjectWithOrigin = (
      projectId: string,
      origin: { providerId: string; spaceId: string; itemId: string },
    ) => ({
      projectId,
      name: `Project ${projectId}`,
      origin,
    });

    it("returns null when project is not found in open projects", () => {
      const { applicationStore } = mockStores();
      applicationStore.openProjects = [];

      const result = getProjectIdScopedByUserAndProvider(
        "non-existent-project",
        "username",
        "provider-id",
      );

      expect(result).toBeNull();
    });

    it("returns null when project has no origin", () => {
      const { applicationStore } = mockStores();
      applicationStore.openProjects = [
        {
          projectId: "project-1",
          name: "Project 1",
        },
      ];

      const result = getProjectIdScopedByUserAndProvider(
        "project-1",
        "username",
        "provider-id",
      );

      expect(result).toBeNull();
    });

    it("returns a hash when project has valid origin", () => {
      const { applicationStore } = mockStores();
      applicationStore.openProjects = [
        createProjectWithOrigin("project-1", {
          providerId: "hub-1",
          spaceId: "space-1",
          itemId: "item-1",
        }),
      ];

      const result = getProjectIdScopedByUserAndProvider(
        "project-1",
        "username",
        "provider-id",
      );

      expect(result).not.toBeNull();
      expect(result).toHaveLength(8);
      expect(result).toMatch(/^[0-9a-f]{8}$/);
    });

    it("produces same output for same inputs", () => {
      const { applicationStore } = mockStores();
      applicationStore.openProjects = [
        createProjectWithOrigin("project-1", {
          providerId: "hub-1",
          spaceId: "space-1",
          itemId: "item-1",
        }),
      ];

      const result1 = getProjectIdScopedByUserAndProvider(
        "project-1",
        "username",
        "provider-id",
      );
      const result2 = getProjectIdScopedByUserAndProvider(
        "project-1",
        "username",
        "provider-id",
      );

      expect(result1).toBe(result2);
    });

    it("produces different hash for different usernames", () => {
      const { applicationStore } = mockStores();
      applicationStore.openProjects = [
        createProjectWithOrigin("project-1", {
          providerId: "hub-1",
          spaceId: "space-1",
          itemId: "item-1",
        }),
      ];

      const resultUserA = getProjectIdScopedByUserAndProvider(
        "project-1",
        "user-a",
        "provider-id",
      );
      const resultUserB = getProjectIdScopedByUserAndProvider(
        "project-1",
        "user-b",
        "provider-id",
      );

      expect(resultUserA).not.toBe(resultUserB);
    });

    it("produces different hash for different provider IDs", () => {
      const { applicationStore } = mockStores();
      applicationStore.openProjects = [
        createProjectWithOrigin("project-1", {
          providerId: "hub-1",
          spaceId: "space-1",
          itemId: "item-1",
        }),
      ];

      const resultProviderA = getProjectIdScopedByUserAndProvider(
        "project-1",
        "username",
        "provider-a",
      );
      const resultProviderB = getProjectIdScopedByUserAndProvider(
        "project-1",
        "username",
        "provider-b",
      );

      expect(resultProviderA).not.toBe(resultProviderB);
    });

    it("produces different hash for different project origins", () => {
      const { applicationStore } = mockStores();
      applicationStore.openProjects = [
        createProjectWithOrigin("project-1", {
          providerId: "hub-1",
          spaceId: "space-1",
          itemId: "item-1",
        }),
        createProjectWithOrigin("project-2", {
          providerId: "hub-1",
          spaceId: "space-1",
          itemId: "item-2",
        }),
      ];

      const resultProject1 = getProjectIdScopedByUserAndProvider(
        "project-1",
        "username",
        "provider-id",
      );
      const resultProject2 = getProjectIdScopedByUserAndProvider(
        "project-2",
        "username",
        "provider-id",
      );

      expect(resultProject1).not.toBe(resultProject2);
    });

    it("same user on same provider with same project origin produces same hash regardless of projectId", () => {
      // This tests that the hash is based on origin, not on the ephemeral projectId
      const { applicationStore } = mockStores();
      const sameOrigin = {
        providerId: "hub-1",
        spaceId: "space-1",
        itemId: "item-1",
      };

      // First "session" with project-id-A
      applicationStore.openProjects = [
        createProjectWithOrigin("project-id-A", sameOrigin),
      ];
      const resultA = getProjectIdScopedByUserAndProvider(
        "project-id-A",
        "username",
        "provider-id",
      );

      // Second "session" with project-id-B but same origin
      applicationStore.openProjects = [
        createProjectWithOrigin("project-id-B", sameOrigin),
      ];
      const resultB = getProjectIdScopedByUserAndProvider(
        "project-id-B",
        "username",
        "provider-id",
      );

      expect(resultA).toBe(resultB);
    });
  });
});
