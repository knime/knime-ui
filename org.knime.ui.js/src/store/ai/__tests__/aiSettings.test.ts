import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockStores } from "@/test/utils/mockStores";

describe("aiSettings store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("sets action permission for a workflow", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setActionPermission(
      "workflow-1",
      "data-sampling",
      "allow",
    );

    expect(aiSettingsStore.actionPermissions["workflow-1"]).toBeDefined();
    expect(
      aiSettingsStore.actionPermissions["workflow-1"].permissions[
        "data-sampling"
      ],
    ).toBe("allow");
  });

  it("gets action permission", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setActionPermission(
      "workflow-1",
      "data-sampling",
      "allow",
    );

    expect(
      aiSettingsStore.getActionPermission("workflow-1", "data-sampling"),
    ).toBe("allow");
    expect(
      aiSettingsStore.getActionPermission("workflow-1", "other-action"),
    ).toBeNull();
    expect(
      aiSettingsStore.getActionPermission("non-existent", "data-sampling"),
    ).toBeNull();
  });

  it("revokes action permission", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setActionPermission(
      "workflow-1",
      "data-sampling",
      "allow",
    );
    await aiSettingsStore.setActionPermission(
      "workflow-1",
      "code-execution",
      "deny",
    );

    await aiSettingsStore.revokeActionPermission("workflow-1", "data-sampling");

    expect(
      aiSettingsStore.getActionPermission("workflow-1", "data-sampling"),
    ).toBeNull();
    expect(
      aiSettingsStore.getActionPermission("workflow-1", "code-execution"),
    ).toBe("deny");
  });

  it("revokes all workflow permissions", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setActionPermission(
      "workflow-1",
      "data-sampling",
      "allow",
    );
    await aiSettingsStore.setActionPermission(
      "workflow-1",
      "code-execution",
      "deny",
    );

    await aiSettingsStore.revokeWorkflowPermissions("workflow-1");

    expect(aiSettingsStore.actionPermissions["workflow-1"]).toBeUndefined();
  });

  it("keeps separate entries for different workflows", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setActionPermission(
      "workflow-1",
      "data-sampling",
      "allow",
    );
    await aiSettingsStore.setActionPermission(
      "workflow-2",
      "data-sampling",
      "deny",
    );

    expect(
      aiSettingsStore.getActionPermission("workflow-1", "data-sampling"),
    ).toBe("allow");
    expect(
      aiSettingsStore.getActionPermission("workflow-2", "data-sampling"),
    ).toBe("deny");
  });
});
