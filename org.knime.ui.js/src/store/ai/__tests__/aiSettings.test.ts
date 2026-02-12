import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockStores } from "@/test/utils/mockStores";

describe("aiSettings store", () => {
  const getMockData = () => ({
    userA: "user-a",
    userB: "user-b",
    projectA: "project-a",
    projectB: "project-b",
    actionA: "action-a",
    actionB: "action-b",
    hubA: "hub-a",
    hubB: "hub-b",
    disclaimerText: "Disclaimer text",
  });

  const setupHubUser = (
    stores: ReturnType<typeof mockStores>,
    hubID: string,
    username: string,
  ) => {
    stores.aiAssistantStore.hubID = hubID;
    stores.spaceProvidersStore.spaceProviders = {
      ...stores.spaceProvidersStore.spaceProviders,
      [hubID]: { id: hubID, username } as any,
    };
  };

  const setupActiveProject = (
    stores: ReturnType<typeof mockStores>,
    { projectId, hubID, username } = {
      projectId: "test-project-id",
      hubID: "test-hub-id",
      username: "test-user",
    },
  ) => {
    stores.applicationStore.activeProjectId = projectId;
    stores.applicationStore.openProjects = [
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
    setupHubUser(stores, hubID, username);
  };

  const getStaleDate = () => {
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
    return sevenMonthsAgo;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("sets action permission for a project", async () => {
    const { aiSettingsStore } = mockStores();
    const { userA, projectA, actionA } = getMockData();

    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionA,
      "allow",
    );

    expect(
      aiSettingsStore?._internal?.settings?.[userA]?.permissionsPerProject?.[
        projectA
      ].permissions[actionA],
    ).toBe("allow");
  });

  it("gets action permission", async () => {
    const { aiSettingsStore } = mockStores();
    const { userA, userB, projectA, projectB, actionA, actionB } =
      getMockData();

    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionA,
      "allow",
    );

    expect(
      aiSettingsStore.getPermissionForAction(userA, projectA, actionA),
    ).toBe("allow");
    expect(
      aiSettingsStore.getPermissionForAction(userA, projectA, actionB),
    ).toBeNull();
    expect(
      aiSettingsStore.getPermissionForAction(userB, projectB, actionA),
    ).toBeNull();
  });

  it("revokes action permission", async () => {
    const { aiSettingsStore } = mockStores();
    const { userA, projectA, actionA, actionB } = getMockData();

    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionA,
      "allow",
    );
    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionB,
      "deny",
    );

    await aiSettingsStore.revokePermissionForAction(userA, projectA, actionA);

    expect(
      aiSettingsStore.getPermissionForAction(userA, projectA, actionA),
    ).toBeNull();
    expect(
      aiSettingsStore.getPermissionForAction(userA, projectA, actionB),
    ).toBe("deny");
  });

  it("revokes all project permissions", async () => {
    const { aiSettingsStore } = mockStores();
    const { userA, projectA, actionA, actionB } = getMockData();

    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionA,
      "allow",
    );
    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionB,
      "deny",
    );

    await aiSettingsStore.revokePermissionsForAllActions(userA, projectA);

    expect(
      aiSettingsStore._internal.settings?.[userA]?.permissionsPerProject?.[
        projectA
      ],
    ).toBeUndefined();
  });

  it("keeps separate entries for different projects", async () => {
    const { aiSettingsStore } = mockStores();
    const { userA, projectA, projectB, actionA } = getMockData();

    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionA,
      "allow",
    );
    await aiSettingsStore.setPermissionForAction(
      userA,
      projectB,
      actionA,
      "deny",
    );

    expect(
      aiSettingsStore.getPermissionForAction(userA, projectA, actionA),
    ).toBe("allow");
    expect(
      aiSettingsStore.getPermissionForAction(userA, projectB, actionA),
    ).toBe("deny");
  });

  it("gets all permissions for a project", async () => {
    const { aiSettingsStore } = mockStores();
    const { userA, projectA, actionA, actionB } = getMockData();

    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionA,
      "allow",
    );
    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionB,
      "deny",
    );

    const allPermissions = aiSettingsStore.getPermissionsForAllActions(
      userA,
      projectA,
    );

    expect(allPermissions).not.toBeNull();
    expect(allPermissions?.permissions[actionA]).toBe("allow");
    expect(allPermissions?.permissions[actionB]).toBe("deny");
  });

  it("returns null for non-existent project permissions", () => {
    const { aiSettingsStore } = mockStores();
    const { userA, projectA } = getMockData();

    expect(
      aiSettingsStore.getPermissionsForAllActions(userA, projectA),
    ).toBeNull();
  });

  it("cleans up project entry when last permission is revoked", async () => {
    const { aiSettingsStore } = mockStores();
    const { userA, projectA, actionA } = getMockData();

    await aiSettingsStore.setPermissionForAction(
      userA,
      projectA,
      actionA,
      "allow",
    );

    await aiSettingsStore.revokePermissionForAction(userA, projectA, actionA);

    expect(
      aiSettingsStore._internal.settings?.[userA]?.permissionsPerProject?.[
        projectA
      ],
    ).toBeUndefined();
  });

  it("prunes stale action permissions", async () => {
    const { aiSettingsStore } = mockStores();
    const { userA, projectA, projectB, actionA } = getMockData();
    const staleDate = getStaleDate();

    // Set up a permission with an old timestamp
    aiSettingsStore._internal.settings[userA] = {
      permissionsPerProject: {
        [projectA]: {
          lastUpdated: staleDate.toISOString(),
          permissions: { [actionA]: "allow" },
        },
      },
    };

    // Set up a recent permission
    await aiSettingsStore.setPermissionForAction(
      userA,
      projectB,
      actionA,
      "allow",
    );

    await aiSettingsStore.pruneStaleEntries();

    expect(
      aiSettingsStore._internal.settings?.[userA]?.permissionsPerProject?.[
        projectA
      ],
    ).toBeUndefined();
    expect(
      aiSettingsStore._internal.settings?.[userA]?.permissionsPerProject?.[
        projectB
      ],
    ).toBeDefined();
  });

  it("prunes both stale action permissions and disclaimer dismissals in one call", async () => {
    const stores = mockStores();
    const { userA, projectA, projectB, actionA, hubA, hubB } = getMockData();
    const staleDate = getStaleDate();

    // Stale action permission
    stores.aiSettingsStore._internal.settings[userA] = {
      permissionsPerProject: {
        [projectA]: {
          lastUpdated: staleDate.toISOString(),
          permissions: { [actionA]: "allow" },
        },
      },
    };

    // Recent action permission
    await stores.aiSettingsStore.setPermissionForAction(
      userA,
      projectB,
      actionA,
      "allow",
    );

    // Stale disclaimer dismissal (need hub+user for a key)
    setupHubUser(stores, hubA, userA);
    const staleDisclaimerKey =
      stores.aiSettingsStore._internal.getHashForCurrentHubUser()!;
    stores.aiSettingsStore._internal.settings[staleDisclaimerKey] = {
      ...stores.aiSettingsStore._internal.settings[staleDisclaimerKey],
      disclaimer: {
        disclaimerTextHash: "old-hash",
        lastUpdated: staleDate.toISOString(),
      },
    };

    // Recent disclaimer dismissal (different hub+user so we keep it)
    setupHubUser(stores, hubB, "user-b");
    await stores.aiSettingsStore.dismissDisclaimer("Recent disclaimer");

    await stores.aiSettingsStore.pruneStaleEntries();

    // Stale action permission pruned, recent kept
    expect(
      stores.aiSettingsStore._internal.settings?.[userA]
        ?.permissionsPerProject?.[projectA],
    ).toBeUndefined();
    expect(
      stores.aiSettingsStore._internal.settings?.[userA]
        ?.permissionsPerProject?.[projectB],
    ).toBeDefined();

    // Stale disclaimer pruned, recent kept
    expect(
      stores.aiSettingsStore._internal.settings?.[staleDisclaimerKey]
        ?.disclaimer,
    ).toBeUndefined();
    expect(
      stores.aiSettingsStore.isDisclaimerDismissed("Recent disclaimer"),
    ).toBe(true);
  });

  describe("disclaimer dismissals", () => {
    it("is not dismissed by default", () => {
      const stores = mockStores();
      const { hubA, userA, disclaimerText } = getMockData();
      setupHubUser(stores, hubA, userA);

      expect(stores.aiSettingsStore.isDisclaimerDismissed(disclaimerText)).toBe(
        false,
      );
    });

    it("dismisses for the current hub+user", async () => {
      const stores = mockStores();
      const { hubA, userA, disclaimerText } = getMockData();
      setupHubUser(stores, hubA, userA);

      await stores.aiSettingsStore.dismissDisclaimer(disclaimerText);

      expect(stores.aiSettingsStore.isDisclaimerDismissed(disclaimerText)).toBe(
        true,
      );
    });

    it("re-shows when disclaimer text changes", async () => {
      const stores = mockStores();
      const { hubA, userA } = getMockData();
      setupHubUser(stores, hubA, userA);

      await stores.aiSettingsStore.dismissDisclaimer("Old disclaimer");

      expect(
        stores.aiSettingsStore.isDisclaimerDismissed("New disclaimer"),
      ).toBe(false);
    });

    it("keeps dismissals separate per hub+user", async () => {
      const stores = mockStores();
      const { hubA, hubB, userA, userB, disclaimerText } = getMockData();

      // Dismiss as user-a on hub-a
      setupHubUser(stores, hubA, userA);
      await stores.aiSettingsStore.dismissDisclaimer(disclaimerText);

      // Switch to user-b on hub-b — should not be dismissed
      setupHubUser(stores, hubB, userB);
      expect(stores.aiSettingsStore.isDisclaimerDismissed(disclaimerText)).toBe(
        false,
      );
    });

    it("keeps dismissals separate for same username on different hubs", async () => {
      const stores = mockStores();
      const { hubA, hubB, userA, disclaimerText } = getMockData();

      // Same username, different hubs
      setupHubUser(stores, hubA, userA);
      await stores.aiSettingsStore.dismissDisclaimer(disclaimerText);

      setupHubUser(stores, hubB, userA);
      expect(stores.aiSettingsStore.isDisclaimerDismissed(disclaimerText)).toBe(
        false,
      );
    });

    it("returns false when hub/user context is unavailable", () => {
      const stores = mockStores();
      const { disclaimerText } = getMockData();
      // No hub/user set up

      expect(stores.aiSettingsStore.isDisclaimerDismissed(disclaimerText)).toBe(
        false,
      );
    });

    it("prunes stale disclaimer dismissals", async () => {
      const stores = mockStores();
      const { hubA, userA } = getMockData();
      const staleDate = getStaleDate();
      setupHubUser(stores, hubA, userA);

      const key = stores.aiSettingsStore._internal.getHashForCurrentHubUser()!;
      stores.aiSettingsStore._internal.settings[key] = {
        ...stores.aiSettingsStore._internal.settings[key],
        disclaimer: {
          disclaimerTextHash: "old-hash",
          lastUpdated: staleDate.toISOString(),
        },
      };

      await stores.aiSettingsStore.pruneStaleEntries();

      expect(
        stores.aiSettingsStore._internal.settings?.[key]?.disclaimer,
      ).toBeUndefined();
    });

    it("resets disclaimer dismissal for current user", async () => {
      const stores = mockStores();
      const { hubA, userA, disclaimerText } = getMockData();
      setupHubUser(stores, hubA, userA);

      await stores.aiSettingsStore.dismissDisclaimer(disclaimerText);
      expect(stores.aiSettingsStore.isDisclaimerDismissed(disclaimerText)).toBe(
        true,
      );

      await stores.aiSettingsStore.resetDisclaimerDismissal();

      expect(stores.aiSettingsStore.isDisclaimerDismissed(disclaimerText)).toBe(
        false,
      );
    });
  });

  describe("active project convenience wrappers", () => {
    it("sets and gets permission for active project", async () => {
      const stores = mockStores();
      const { actionA } = getMockData();
      setupActiveProject(stores);

      await stores.aiSettingsStore.setPermissionForActionForActiveProject(
        actionA,
        "allow",
      );

      expect(
        stores.aiSettingsStore.getPermissionForActionForActiveProject(actionA),
      ).toBe("allow");
    });

    it("gets all permissions for active project", async () => {
      const stores = mockStores();
      const { actionA, actionB } = getMockData();
      setupActiveProject(stores);

      await stores.aiSettingsStore.setPermissionForActionForActiveProject(
        actionA,
        "allow",
      );
      await stores.aiSettingsStore.setPermissionForActionForActiveProject(
        actionB,
        "deny",
      );

      const allPermissions =
        stores.aiSettingsStore.getPermissionsForAllActionsForActiveProject();

      expect(allPermissions).not.toBeNull();
      expect(allPermissions?.permissions[actionA]).toBe("allow");
      expect(allPermissions?.permissions[actionB]).toBe("deny");
    });

    it("revokes permission for active project", async () => {
      const stores = mockStores();
      const { actionA } = getMockData();
      setupActiveProject(stores);

      await stores.aiSettingsStore.setPermissionForActionForActiveProject(
        actionA,
        "allow",
      );
      await stores.aiSettingsStore.revokePermissionForActionForActiveProject(
        actionA,
      );

      expect(
        stores.aiSettingsStore.getPermissionForActionForActiveProject(actionA),
      ).toBeNull();
    });

    it("revokes all permissions for active project", async () => {
      const stores = mockStores();
      const { actionA, actionB } = getMockData();
      setupActiveProject(stores);

      await stores.aiSettingsStore.setPermissionForActionForActiveProject(
        actionA,
        "allow",
      );
      await stores.aiSettingsStore.setPermissionForActionForActiveProject(
        actionB,
        "deny",
      );

      await stores.aiSettingsStore.revokePermissionsForAllActionsForActiveProject();

      expect(
        stores.aiSettingsStore.getPermissionsForAllActionsForActiveProject(),
      ).toBeNull();
    });

    it("returns null when no active project", () => {
      const stores = mockStores();
      const { actionA } = getMockData();
      // No active project set up

      expect(
        stores.aiSettingsStore.getPermissionForActionForActiveProject(actionA),
      ).toBeNull();
      expect(
        stores.aiSettingsStore.getPermissionsForAllActionsForActiveProject(),
      ).toBeNull();
    });
  });
});
