import { reactive } from "vue";
import { API } from "@api";
import { defineStore, storeToRefs } from "pinia";

import { useHubAuth } from "@/components/kai/useHubAuth";
import { runInEnvironment } from "@/environment";
import { useApplicationStore } from "@/store/application/application";
import { hashString } from "@/util/hashString";
import { toStableProjectId } from "@/util/projectUtil";

/**
 * Store that manages AP-client-side AI settings. Settings scoped by Hub used for K-AI + username.
 *
 * AI settings currently implemented:
 * - Disclaimer dismissals: per-user per-Hub record of whether the K-AI disclaimer
 *   has been persistently dismissed. Tracks the disclaimer text hash so that a
 *   changed disclaimer is shown again.
 * - Action permissions: per-project (user & Hub-scoped) per-action decision about
 *   whether to "always allow" or "never allow" a certain action by K-AI.
 */

const AI_SETTINGS_KEY = "knime-ai-settings";

/**
 * Entries older than this will be pruned.
 * See lifecycle.ts::initializeApplication
 */
const PRUNE_THRESHOLD_MONTHS = 6;

type DisclaimerDismissal = {
  disclaimerTextHash: string;
  lastUpdated: string;
};

// TODO: define ActionType as well once we know what they will be (e.g. "nodeConfigure")
type ActionPermission = "allow" | "deny";
type ActionPermissionsForProject = {
  lastUpdated: string;
  permissions: Record<string, ActionPermission>;
};

type AIUserSettings = {
  disclaimer?: DisclaimerDismissal;
  permissionsPerProject?: {
    [projectID: string]: ActionPermissionsForProject;
  };
};

type AISettingsState = Record<string, AIUserSettings>;

const defaults: AISettingsState = {};

const loadItem = <T>(key: string, defaultValue: T | null = null): T | null => {
  const item = window?.localStorage?.getItem(key);
  return item === null ? defaultValue : JSON.parse(item);
};

const saveItem = (key: string, value: unknown) => {
  window?.localStorage?.setItem(key, JSON.stringify(value));
};

export const useAISettingsStore = defineStore("aiSettings", () => {
  const settings = reactive<AISettingsState>({ ...defaults });

  // Read and write settings
  const updateSettings = async () => {
    try {
      await runInEnvironment({
        DESKTOP: () => {
          API.desktop.setUserProfilePart({
            key: AI_SETTINGS_KEY,
            data: settings,
          });
        },
        BROWSER: () => saveItem(AI_SETTINGS_KEY, settings),
      });
    } catch (error) {
      consola.error("Failed to persist AI settings to user profile:", error);
    }
  };

  const fetchAISettings = async () => {
    try {
      const loaded = (await runInEnvironment({
        DESKTOP: () => API.desktop.getUserProfilePart({ key: AI_SETTINGS_KEY }),
        BROWSER: () => Promise.resolve(loadItem(AI_SETTINGS_KEY)),
      })) as AISettingsState;

      Object.assign(settings, {
        ...defaults,
        ...(loaded ?? {}),
      });
    } catch (error) {
      consola.error("Failed to get AI settings from user profile", error);
    }
  };

  // Helpers
  const getHashForCurrentHubUser = () => {
    const { hubID, username } = useHubAuth();
    if (!hubID.value || !username.value) {
      return null;
    }
    return hashString(`${hubID.value}:${username.value}`);
  };

  const getStableProjectIdForActiveProject = () => {
    const { activeProject } = storeToRefs(useApplicationStore());

    if (!activeProject.value) {
      consola.error(
        "Failed to get user-scoped project ID for AI settings: no active project.",
      );
      return null;
    }

    return toStableProjectId(activeProject.value);
  };

  const getActiveContext = () => {
    const userIdHash = getHashForCurrentHubUser();
    const stableProjectId = getStableProjectIdForActiveProject();

    if (!userIdHash || !stableProjectId) {
      return null;
    }

    return { userIdHash, stableProjectId };
  };

  // === DISCLAIMER ===
  // The disclaimer dismissal is scoped per Hub+user so that a desktop AP user
  // connected to multiple Hubs sees the disclaimer at least once per Hub.
  // The disclaimer text hash is stored so that a changed disclaimer is re-shown.

  const isDisclaimerDismissed = (disclaimerText: string): boolean => {
    const userIdHash = getHashForCurrentHubUser();
    if (!userIdHash) {
      return false;
    }

    const dismissal = settings[userIdHash]?.disclaimer;
    return dismissal?.disclaimerTextHash === hashString(disclaimerText);
  };

  const dismissDisclaimer = async (disclaimerText: string) => {
    const userIdHash = getHashForCurrentHubUser();
    if (!userIdHash) {
      return false;
    }

    if (!settings[userIdHash]) {
      settings[userIdHash] = {};
    }

    settings[userIdHash].disclaimer = {
      disclaimerTextHash: hashString(disclaimerText),
      lastUpdated: new Date().toISOString(),
    };
    await updateSettings();
  };

  const pruneStaleDisclaimerDismissals = (thresholdDate: Date) => {
    let didPrune = false;

    for (const [userIdHash, userSettings] of Object.entries(settings)) {
      if (!userSettings.disclaimer) {
        continue;
      }

      if (new Date(userSettings.disclaimer.lastUpdated) < thresholdDate) {
        consola.debug(
          `Pruning stale disclaimer dismissal ${userIdHash} (last updated: ${userSettings.disclaimer.lastUpdated})`,
        );
        delete settings[userIdHash].disclaimer;
        didPrune = true;
      }
    }

    return didPrune;
  };

  const resetDisclaimerDismissal = async () => {
    const userIdHash = getHashForCurrentHubUser();
    if (!userIdHash) {
      return;
    }

    if (!settings[userIdHash]?.disclaimer) {
      return;
    }

    delete settings[userIdHash].disclaimer;
    await updateSettings();
  };

  // === ACTION PERMISSIONS ===
  // When allowing or denying K-AI to perform a certain action (e.g. sample data), the user
  // can "Remember for this workflow", which persists the decision for that particular action for the active project.

  // Generic methods that refer to the entry in the settings identified by
  const getPermissionForAction = (
    userIdHash: string,
    stableProjectId: string,
    actionId: string,
  ): ActionPermission | null => {
    return (
      settings[userIdHash]?.permissionsPerProject?.[stableProjectId]
        ?.permissions[actionId] ?? null
    );
  };

  const setPermissionForAction = async (
    userIdHash: string,
    stableProjectId: string,
    actionId: string,
    permission: ActionPermission,
  ) => {
    const now = new Date().toISOString();

    if (!settings[userIdHash]) {
      settings[userIdHash] = {};
    }
    const userSettings = settings[userIdHash];

    if (!userSettings.permissionsPerProject) {
      userSettings.permissionsPerProject = {};
    }
    const projects = userSettings.permissionsPerProject;

    if (!projects[stableProjectId]) {
      projects[stableProjectId] = {
        lastUpdated: now,
        permissions: {},
      };
    }
    const projectPermissions = projects[stableProjectId];

    projectPermissions.lastUpdated = now;
    projectPermissions.permissions[actionId] = permission;

    await updateSettings();
  };

  const getPermissionsForAllActions = (
    userIdHash: string,
    stableProjectId: string,
  ): ActionPermissionsForProject | null => {
    return (
      settings[userIdHash]?.permissionsPerProject?.[stableProjectId] ?? null
    );
  };

  const revokePermissionForAction = async (
    userIdHash: string,
    stableProjectId: string,
    actionId: string,
  ) => {
    if (!settings[userIdHash]) {
      return;
    }
    const userSettings = settings[userIdHash];

    if (!userSettings.permissionsPerProject) {
      return;
    }
    const projects = userSettings.permissionsPerProject;

    if (!projects[stableProjectId]) {
      return;
    }
    const projectPermissions = projects[stableProjectId];

    delete projectPermissions.permissions[actionId];
    projectPermissions.lastUpdated = new Date().toISOString();

    // Clean up project entry if no permissions remain
    if (Object.keys(projectPermissions.permissions).length === 0) {
      delete projects[stableProjectId];
    }

    await updateSettings();
  };

  const revokePermissionsForAllActions = async (
    userIdHash: string,
    stableProjectId: string,
  ) => {
    if (!settings[userIdHash]) {
      return;
    }
    const userSettings = settings[userIdHash];

    if (!userSettings.permissionsPerProject) {
      return;
    }
    const projects = userSettings.permissionsPerProject;

    if (!projects[stableProjectId]) {
      return;
    }

    delete projects[stableProjectId];
    await updateSettings();
  };

  // Convenience wrappers for the active project
  const getPermissionForActionForActiveProject = (
    actionId: string,
  ): ActionPermission | null => {
    const ctx = getActiveContext();
    if (!ctx) {
      return null;
    }

    return getPermissionForAction(
      ctx.userIdHash,
      ctx.stableProjectId,
      actionId,
    );
  };

  const setPermissionForActionForActiveProject = async (
    actionId: string,
    permission: ActionPermission,
  ) => {
    const ctx = getActiveContext();
    if (!ctx) {
      return;
    }

    await setPermissionForAction(
      ctx.userIdHash,
      ctx.stableProjectId,
      actionId,
      permission,
    );
  };

  const getPermissionsForAllActionsForActiveProject =
    (): ActionPermissionsForProject | null => {
      const ctx = getActiveContext();
      if (!ctx) {
        return null;
      }

      return getPermissionsForAllActions(ctx.userIdHash, ctx.stableProjectId);
    };

  const revokePermissionForActionForActiveProject = async (
    actionId: string,
  ) => {
    const ctx = getActiveContext();
    if (!ctx) {
      return;
    }

    await revokePermissionForAction(
      ctx.userIdHash,
      ctx.stableProjectId,
      actionId,
    );
  };

  const revokePermissionsForAllActionsForActiveProject = async () => {
    const ctx = getActiveContext();
    if (!ctx) {
      return;
    }

    await revokePermissionsForAllActions(ctx.userIdHash, ctx.stableProjectId);
  };

  const pruneStaleActionPermissions = (thresholdDate: Date) => {
    let didPrune = false;

    for (const [userIdHash, userSettings] of Object.entries(settings)) {
      if (!userSettings.permissionsPerProject) {
        continue;
      }

      for (const [stableProjectId, permissions] of Object.entries(
        userSettings.permissionsPerProject,
      )) {
        if (new Date(permissions.lastUpdated) < thresholdDate) {
          consola.debug(
            `Pruning stale action permissions for user ${userIdHash}, project ${stableProjectId} (last updated: ${permissions.lastUpdated})`,
          );
          delete userSettings.permissionsPerProject[stableProjectId];
          didPrune = true;
        }
      }

      // Clean up empty permissionsPerProject container
      if (Object.keys(userSettings.permissionsPerProject).length === 0) {
        delete userSettings.permissionsPerProject;
      }
    }

    return didPrune;
  };

  const cleanupEmptyUserEntries = () => {
    for (const [userIdHash, userSettings] of Object.entries(settings)) {
      const hasDisclaimer = Boolean(userSettings.disclaimer);
      const hasPermissions =
        userSettings.permissionsPerProject &&
        Object.keys(userSettings.permissionsPerProject).length > 0;

      if (!hasDisclaimer && !hasPermissions) {
        delete settings[userIdHash];
      }
    }
  };

  /**
   * Prune all stale entries (action permissions, disclaimer dismissals, etc.)
   * that haven't been updated in the last N months.
   */
  const pruneStaleEntries = async () => {
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setMonth(thresholdDate.getMonth() - PRUNE_THRESHOLD_MONTHS);

    const prunedPermissions = pruneStaleActionPermissions(thresholdDate);
    const prunedDisclaimers = pruneStaleDisclaimerDismissals(thresholdDate);

    const didPrune = prunedPermissions || prunedDisclaimers;

    if (didPrune) {
      cleanupEmptyUserEntries();
      await updateSettings();
    }
  };

  return {
    _internal: {
      settings,
      updateSettings,
      getStableProjectIdForActiveProject,
      getHashForCurrentHubUser,
      pruneStaleActionPermissions,
      pruneStaleDisclaimerDismissals,
    },

    // K-AI Disclaimer
    isDisclaimerDismissed,
    dismissDisclaimer,
    resetDisclaimerDismissal,

    // Permissions for K-AI to execute specific actions (e.g. sample data)
    // Generic API (operates on any project by stable ID)
    getPermissionForAction,
    setPermissionForAction,
    getPermissionsForAllActions,
    revokePermissionForAction,
    revokePermissionsForAllActions,

    // Active project API (convenience wrappers)
    getPermissionForActionForActiveProject,
    setPermissionForActionForActiveProject,
    getPermissionsForAllActionsForActiveProject,
    revokePermissionForActionForActiveProject,
    revokePermissionsForAllActionsForActiveProject,

    fetchAISettings,
    pruneStaleEntries,
  };
});
