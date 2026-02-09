import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockStores } from "@/test/utils/mockStores";

describe("aiSettings store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("sets action permission for a project", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setPermissionForAction(
      "project-1:user-a",
      "data-sampling",
      "allow",
    );

    expect(
      aiSettingsStore._internal.settings.actionPermissionsByProject[
        "project-1:user-a"
      ],
    ).toBeDefined();
    expect(
      aiSettingsStore._internal.settings.actionPermissionsByProject[
        "project-1:user-a"
      ].permissions["data-sampling"],
    ).toBe("allow");
  });

  it("gets action permission", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setPermissionForAction(
      "project-1:user-a",
      "data-sampling",
      "allow",
    );

    expect(
      aiSettingsStore.getPermissionForAction(
        "project-1:user-a",
        "data-sampling",
      ),
    ).toBe("allow");
    expect(
      aiSettingsStore.getPermissionForAction(
        "project-1:user-a",
        "other-action",
      ),
    ).toBeNull();
    expect(
      aiSettingsStore.getPermissionForAction(
        "project-2:user-b",
        "data-sampling",
      ),
    ).toBeNull();
  });

  it("revokes action permission", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setPermissionForAction(
      "project-1:user-a",
      "data-sampling",
      "allow",
    );
    await aiSettingsStore.setPermissionForAction(
      "project-1:user-a",
      "code-execution",
      "deny",
    );

    await aiSettingsStore.revokePermissionForAction(
      "project-1:user-a",
      "data-sampling",
    );

    expect(
      aiSettingsStore.getPermissionForAction(
        "project-1:user-a",
        "data-sampling",
      ),
    ).toBeNull();
    expect(
      aiSettingsStore.getPermissionForAction(
        "project-1:user-a",
        "code-execution",
      ),
    ).toBe("deny");
  });

  it("revokes all project permissions", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setPermissionForAction(
      "project-1:user-a",
      "data-sampling",
      "allow",
    );
    await aiSettingsStore.setPermissionForAction(
      "project-1:user-a",
      "code-execution",
      "deny",
    );

    await aiSettingsStore.revokePermissionsForAllActions("project-1:user-a");

    expect(
      aiSettingsStore._internal.settings.actionPermissionsByProject[
        "project-1:user-a"
      ],
    ).toBeUndefined();
  });

  it("keeps separate entries for different projects", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setPermissionForAction(
      "project-1:user-a",
      "data-sampling",
      "allow",
    );
    await aiSettingsStore.setPermissionForAction(
      "project-2:user-b",
      "data-sampling",
      "deny",
    );

    expect(
      aiSettingsStore.getPermissionForAction(
        "project-1:user-a",
        "data-sampling",
      ),
    ).toBe("allow");
    expect(
      aiSettingsStore.getPermissionForAction(
        "project-2:user-b",
        "data-sampling",
      ),
    ).toBe("deny");
  });

  it("gets all permissions for a project", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setPermissionForAction(
      "project-1:user-a",
      "data-sampling",
      "allow",
    );
    await aiSettingsStore.setPermissionForAction(
      "project-1:user-a",
      "code-execution",
      "deny",
    );

    const allPermissions =
      aiSettingsStore.getPermissionsForAllActions("project-1:user-a");

    expect(allPermissions).not.toBeNull();
    expect(allPermissions?.permissions["data-sampling"]).toBe("allow");
    expect(allPermissions?.permissions["code-execution"]).toBe("deny");
  });

  it("returns null for non-existent project permissions", () => {
    const { aiSettingsStore } = mockStores();

    expect(
      aiSettingsStore.getPermissionsForAllActions("non-existent"),
    ).toBeNull();
  });

  it("cleans up project entry when last permission is revoked", async () => {
    const { aiSettingsStore } = mockStores();

    await aiSettingsStore.setPermissionForAction(
      "cleanup-test-project",
      "only-action",
      "allow",
    );

    await aiSettingsStore.revokePermissionForAction(
      "cleanup-test-project",
      "only-action",
    );

    expect(
      aiSettingsStore._internal.settings.actionPermissionsByProject[
        "cleanup-test-project"
      ],
    ).toBeUndefined();
  });

  it("prunes stale action permissions", async () => {
    const { aiSettingsStore } = mockStores();

    // Set up a permission with an old timestamp
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    aiSettingsStore._internal.settings.actionPermissionsByProject[
      "old-project"
    ] = {
      lastUpdated: sevenMonthsAgo.toISOString(),
      permissions: { "some-action": "allow" },
    };

    // Set up a recent permission
    await aiSettingsStore.setPermissionForAction(
      "recent-project",
      "some-action",
      "allow",
    );

    await aiSettingsStore.pruneStaleEntries();

    expect(
      aiSettingsStore._internal.settings.actionPermissionsByProject[
        "old-project"
      ],
    ).toBeUndefined();
    expect(
      aiSettingsStore._internal.settings.actionPermissionsByProject[
        "recent-project"
      ],
    ).toBeDefined();
  });

  it("prunes both stale action permissions and disclaimer dismissals in one call", async () => {
    const stores = mockStores();

    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    // Stale action permission
    stores.aiSettingsStore._internal.settings.actionPermissionsByProject[
      "old-project"
    ] = {
      lastUpdated: sevenMonthsAgo.toISOString(),
      permissions: { "some-action": "allow" },
    };

    // Recent action permission
    await stores.aiSettingsStore.setPermissionForAction(
      "recent-project",
      "some-action",
      "allow",
    );

    // Stale disclaimer dismissal (need hub+user for a key)
    stores.aiAssistantStore.hubID = "hub-a";
    stores.spaceProvidersStore.spaceProviders = {
      ...stores.spaceProvidersStore.spaceProviders,
      "hub-a": { id: "hub-a", username: "user-a" } as any,
    };
    const staleDisclaimerKey =
      stores.aiSettingsStore._internal.getHashForCurrentHubUser()!;
    stores.aiSettingsStore._internal.settings.disclaimerDismissals[
      staleDisclaimerKey
    ] = {
      disclaimerTextHash: "old-hash",
      lastUpdated: sevenMonthsAgo.toISOString(),
    };

    // Recent disclaimer dismissal (different hub+user so we keep it)
    stores.aiAssistantStore.hubID = "hub-b";
    stores.spaceProvidersStore.spaceProviders = {
      ...stores.spaceProvidersStore.spaceProviders,
      "hub-b": { id: "hub-b", username: "user-b" } as any,
    };
    await stores.aiSettingsStore.dismissDisclaimer("Recent disclaimer");

    await stores.aiSettingsStore.pruneStaleEntries();

    // Stale action permission pruned, recent kept
    expect(
      stores.aiSettingsStore._internal.settings.actionPermissionsByProject[
        "old-project"
      ],
    ).toBeUndefined();
    expect(
      stores.aiSettingsStore._internal.settings.actionPermissionsByProject[
        "recent-project"
      ],
    ).toBeDefined();

    // Stale disclaimer pruned, recent kept
    expect(
      stores.aiSettingsStore._internal.settings.disclaimerDismissals[
        staleDisclaimerKey
      ],
    ).toBeUndefined();
    expect(
      stores.aiSettingsStore.isDisclaimerDismissed("Recent disclaimer"),
    ).toBe(true);
  });

  describe("disclaimer dismissals", () => {
    const setupHubUser = (
      stores: ReturnType<typeof mockStores>,
      hubID = "test-hub-id",
      username = "test-user",
    ) => {
      stores.aiAssistantStore.hubID = hubID;
      stores.spaceProvidersStore.spaceProviders = {
        ...stores.spaceProvidersStore.spaceProviders,
        [hubID]: { id: hubID, username } as any,
      };
    };

    it("is not dismissed by default", () => {
      const stores = mockStores();
      setupHubUser(stores);

      expect(
        stores.aiSettingsStore.isDisclaimerDismissed("Some disclaimer"),
      ).toBe(false);
    });

    it("dismisses for the current hub+user", async () => {
      const stores = mockStores();
      setupHubUser(stores);

      await stores.aiSettingsStore.dismissDisclaimer("Some disclaimer");

      expect(
        stores.aiSettingsStore.isDisclaimerDismissed("Some disclaimer"),
      ).toBe(true);
    });

    it("re-shows when disclaimer text changes", async () => {
      const stores = mockStores();
      setupHubUser(stores);

      await stores.aiSettingsStore.dismissDisclaimer("Old disclaimer");

      expect(
        stores.aiSettingsStore.isDisclaimerDismissed("New disclaimer"),
      ).toBe(false);
    });

    it("keeps dismissals separate per hub+user", async () => {
      const stores = mockStores();

      // Dismiss as user-a on hub-a
      setupHubUser(stores, "hub-a", "user-a");
      await stores.aiSettingsStore.dismissDisclaimer("Disclaimer text");

      // Switch to user-b on hub-b — should not be dismissed
      setupHubUser(stores, "hub-b", "user-b");
      expect(
        stores.aiSettingsStore.isDisclaimerDismissed("Disclaimer text"),
      ).toBe(false);
    });

    it("keeps dismissals separate for same username on different hubs", async () => {
      const stores = mockStores();

      // Same username, different hubs
      setupHubUser(stores, "hub-a", "john.doe");
      await stores.aiSettingsStore.dismissDisclaimer("Disclaimer text");

      setupHubUser(stores, "hub-b", "john.doe");
      expect(
        stores.aiSettingsStore.isDisclaimerDismissed("Disclaimer text"),
      ).toBe(false);
    });

    it("returns false when hub/user context is unavailable", () => {
      const stores = mockStores();
      // No hub/user set up

      expect(
        stores.aiSettingsStore.isDisclaimerDismissed("Disclaimer text"),
      ).toBe(false);
    });

    it("prunes stale disclaimer dismissals", async () => {
      const stores = mockStores();
      setupHubUser(stores);

      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      const key = stores.aiSettingsStore._internal.getHashForCurrentHubUser()!;
      stores.aiSettingsStore._internal.settings.disclaimerDismissals[key] = {
        disclaimerTextHash: "old-hash",
        lastUpdated: sevenMonthsAgo.toISOString(),
      };

      await stores.aiSettingsStore.pruneStaleEntries();

      expect(
        stores.aiSettingsStore._internal.settings.disclaimerDismissals[key],
      ).toBeUndefined();
    });
  });

  describe("active project convenience wrappers", () => {
    const setupActiveProject = ({
      applicationStore,
      aiAssistantStore,
      spaceProvidersStore,
    }: ReturnType<typeof mockStores>) => {
      const projectId = "test-project-id";
      const hubID = "test-hub-id";
      const username = "test-user";

      applicationStore.activeProjectId = projectId;
      applicationStore.openProjects = [
        {
          projectId,
          name: "Test Project",
          origin: {
            providerId: "origin-provider",
            spaceId: "origin-space",
            itemId: "origin-item",
          },
        },
      ];
      aiAssistantStore.hubID = hubID;
      spaceProvidersStore.spaceProviders = {
        [hubID]: { id: hubID, username } as any,
      };
    };

    it("sets and gets permission for active project", async () => {
      const stores = mockStores();
      setupActiveProject(stores);
      const { aiSettingsStore } = stores;

      await aiSettingsStore.setPermissionForActionForActiveProject(
        "test-action",
        "allow",
      );

      expect(
        aiSettingsStore.getPermissionForActionForActiveProject("test-action"),
      ).toBe("allow");
    });

    it("gets all permissions for active project", async () => {
      const stores = mockStores();
      setupActiveProject(stores);
      const { aiSettingsStore } = stores;

      await aiSettingsStore.setPermissionForActionForActiveProject(
        "action-1",
        "allow",
      );
      await aiSettingsStore.setPermissionForActionForActiveProject(
        "action-2",
        "deny",
      );

      const allPermissions =
        aiSettingsStore.getPermissionsForAllActionsForActiveProject();

      expect(allPermissions).not.toBeNull();
      expect(allPermissions?.permissions["action-1"]).toBe("allow");
      expect(allPermissions?.permissions["action-2"]).toBe("deny");
    });

    it("revokes permission for active project", async () => {
      const stores = mockStores();
      setupActiveProject(stores);
      const { aiSettingsStore } = stores;

      await aiSettingsStore.setPermissionForActionForActiveProject(
        "test-action",
        "allow",
      );
      await aiSettingsStore.revokePermissionForActionForActiveProject(
        "test-action",
      );

      expect(
        aiSettingsStore.getPermissionForActionForActiveProject("test-action"),
      ).toBeNull();
    });

    it("revokes all permissions for active project", async () => {
      const stores = mockStores();
      setupActiveProject(stores);
      const { aiSettingsStore } = stores;

      await aiSettingsStore.setPermissionForActionForActiveProject(
        "action-1",
        "allow",
      );
      await aiSettingsStore.setPermissionForActionForActiveProject(
        "action-2",
        "deny",
      );

      await aiSettingsStore.revokePermissionsForAllActionsForActiveProject();

      expect(
        aiSettingsStore.getPermissionsForAllActionsForActiveProject(),
      ).toBeNull();
    });

    it("returns null when no active project", () => {
      const { aiSettingsStore } = mockStores();
      // No active project set up

      expect(
        aiSettingsStore.getPermissionForActionForActiveProject("test-action"),
      ).toBeNull();
      expect(
        aiSettingsStore.getPermissionsForAllActionsForActiveProject(),
      ).toBeNull();
    });
  });
});
