import { describe, expect, it } from "vitest";

import type { Project } from "@/api/gateway-api/generated-api";
import { toStableProjectId } from "../projectUtil";

describe("projectUtil", () => {
  describe("toStableProjectId", () => {
    const createProject = (
      origin?: { providerId: string; spaceId: string; itemId: string } | null,
    ): Project =>
      ({
        projectId: "test-project",
        name: "Test Project",
        origin: origin ?? undefined,
      }) as Project;

    it("returns null when project has no origin", () => {
      const project = createProject(null);

      const result = toStableProjectId(project, "username", "provider-id");

      expect(result).toBeNull();
    });

    it("returns an id when project has valid origin", () => {
      const project = createProject({
        providerId: "hub-1",
        spaceId: "space-1",
        itemId: "item-1",
      });

      const result = toStableProjectId(project, "username", "provider-id");

      expect(result).not.toBeNull();
      expect(result).toHaveLength(8);
      expect(result).toMatch(/^[0-9a-f]{8}$/);
    });

    it("produces same output for same inputs", () => {
      const project = createProject({
        providerId: "hub-1",
        spaceId: "space-1",
        itemId: "item-1",
      });

      const result1 = toStableProjectId(project, "username", "provider-id");
      const result2 = toStableProjectId(project, "username", "provider-id");

      expect(result1).toBe(result2);
    });

    it("produces different id for different usernames", () => {
      const project = createProject({
        providerId: "hub-1",
        spaceId: "space-1",
        itemId: "item-1",
      });

      const resultUserA = toStableProjectId(project, "user-a", "provider-id");
      const resultUserB = toStableProjectId(project, "user-b", "provider-id");

      expect(resultUserA).not.toBe(resultUserB);
    });

    it("produces different id for different provider IDs", () => {
      const project = createProject({
        providerId: "hub-1",
        spaceId: "space-1",
        itemId: "item-1",
      });

      const resultProviderA = toStableProjectId(
        project,
        "username",
        "provider-a",
      );
      const resultProviderB = toStableProjectId(
        project,
        "username",
        "provider-b",
      );

      expect(resultProviderA).not.toBe(resultProviderB);
    });

    it("produces different id for different project origins", () => {
      const project1 = createProject({
        providerId: "hub-1",
        spaceId: "space-1",
        itemId: "item-1",
      });
      const project2 = createProject({
        providerId: "hub-1",
        spaceId: "space-1",
        itemId: "item-2",
      });

      const result1 = toStableProjectId(project1, "username", "provider-id");
      const result2 = toStableProjectId(project2, "username", "provider-id");

      expect(result1).not.toBe(result2);
    });

    it("produces same id for same origin regardless of other project properties", () => {
      const sameOrigin = {
        providerId: "hub-1",
        spaceId: "space-1",
        itemId: "item-1",
      };

      const projectA = { ...createProject(sameOrigin), name: "Project A" };
      const projectB = { ...createProject(sameOrigin), name: "Project B" };

      const resultA = toStableProjectId(projectA, "username", "provider-id");
      const resultB = toStableProjectId(projectB, "username", "provider-id");

      expect(resultA).toBe(resultB);
    });
  });
});
