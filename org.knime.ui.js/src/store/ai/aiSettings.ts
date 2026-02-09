import { reactive } from "vue";
import { API } from "@api";
import { defineStore, storeToRefs } from "pinia";

import { useHubAuth } from "@/components/kai/useHubAuth";
import { runInEnvironment } from "@/environment";
import { useApplicationStore } from "@/store/application/application";
import { hashString } from "@/util/hashString";
import { toStableProjectId } from "@/util/projectUtil";

/**
 * Store that manages AP-client-side AI settings.
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

type ActionPermission = "allow" | "deny";

type ProjectActionPermissions = {
  lastUpdated: string;
  permissions: Record<string, ActionPermission>;
};

type DisclaimerDismissal = {
  disclaimerTextHash: string;
  lastUpdated: string;
};

type AISettingsState = {
  disclaimerDismissals: Record<string, DisclaimerDismissal>;
  actionPermissionsByProject: Record<string, ProjectActionPermissions>;
};

const defaults: AISettingsState = {
  disclaimerDismissals: {},
  actionPermissionsByProject: {},
};

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
  const getStableProjectIdForActiveProject = () => {
    const { activeProject } = storeToRefs(useApplicationStore());

    if (!activeProject.value) {
      consola.error(
        "Failed to get user-scoped project ID for AI settings: no active project.",
      );
      return null;
    }

    // username and Hub ID are specific to the Hub configured to be used as K-AI's backend
    const { hubID, username } = useHubAuth();

    return toStableProjectId(
      activeProject.value,
      username.value ?? "local",
      hubID.value || "local",
    );
  };

  const getHashForCurrentHubUser = (): string | null => {
    const { hubID, username } = useHubAuth();
    if (!hubID.value || !username.value) {
      consola.error(
        "Failed to get Hub-scoped user ID for AI settings: user not logged in.",
      );
      return null;
    }
    return hashString(`${hubID.value}:${username.value}`);
  };

  // === DISCLAIMER ===
  // The disclaimer dismissal is scoped per Hub+user so that a desktop AP user
  // connected to multiple Hubs sees the disclaimer at least once per Hub.
  // The disclaimer text hash is stored so that a changed disclaimer is re-shown.

  const isDisclaimerDismissed = (disclaimerText: string): boolean => {
    const key = getHashForCurrentHubUser();
    if (!key) {
      return false;
    }
    const dismissal = settings.disclaimerDismissals[key];
    return dismissal?.disclaimerTextHash === hashString(disclaimerText);
  };

  const dismissDisclaimer = async (disclaimerText: string) => {
    const key = getHashForCurrentHubUser();
    if (!key) {
      return;
    }
    settings.disclaimerDismissals[key] = {
      disclaimerTextHash: hashString(disclaimerText),
      lastUpdated: new Date().toISOString(),
    };
    await updateSettings();
  };

  const pruneStaleDisclaimerDismissals = (thresholdDate: Date) => {
    let didPrune = false;

    for (const [key, entry] of Object.entries(settings.disclaimerDismissals)) {
      if (new Date(entry.lastUpdated) < thresholdDate) {
        consola.debug(
          `Pruning stale disclaimer dismissal ${key} (last updated: ${entry.lastUpdated})`,
        );
        delete settings.disclaimerDismissals[key];
        didPrune = true;
      }
    }

    return didPrune;
  };

  // === ACTION PERMISSIONS ===
  // When allowing or denying K-AI to perform a certain action (e.g. sample data), the user
  // can "Remember for this workflow", which persists the decision for that particular action for the active project.

  // Generic methods that refer to the entry in the settings identified by "userScopedProjectId", an ID
  // identifying a particular project, for a particular user of a particular Hub (see projectUtil.ts::toStableProjectId)
  const getPermissionForAction = (
    userScopedProjectId: string,
    actionId: string,
  ): ActionPermission | null => {
    return (
      settings.actionPermissionsByProject[userScopedProjectId]?.permissions[
        actionId
      ] ?? null
    );
  };

  const setPermissionForAction = async (
    userScopedProjectId: string,
    actionId: string,
    permission: ActionPermission,
  ) => {
    const now = new Date().toISOString();

    if (!settings.actionPermissionsByProject[userScopedProjectId]) {
      settings.actionPermissionsByProject[userScopedProjectId] = {
        lastUpdated: now,
        permissions: {},
      };
    }

    settings.actionPermissionsByProject[userScopedProjectId].permissions[
      actionId
    ] = permission;
    settings.actionPermissionsByProject[userScopedProjectId].lastUpdated = now;

    await updateSettings();
  };

  const getPermissionsForAllActions = (
    userScopedProjectId: string,
  ): ProjectActionPermissions | null => {
    return settings.actionPermissionsByProject[userScopedProjectId] ?? null;
  };

  const revokePermissionForAction = async (
    userScopedProjectId: string,
    actionId: string,
  ) => {
    const projectPermissions =
      settings.actionPermissionsByProject[userScopedProjectId];
    if (!projectPermissions) {
      return;
    }

    delete projectPermissions.permissions[actionId];
    projectPermissions.lastUpdated = new Date().toISOString();

    // Clean up project entry if no permissions remain
    if (Object.keys(projectPermissions.permissions).length === 0) {
      delete settings.actionPermissionsByProject[userScopedProjectId];
    }

    await updateSettings();
  };

  const revokePermissionsForAllActions = async (
    userScopedProjectId: string,
  ) => {
    delete settings.actionPermissionsByProject[userScopedProjectId];
    await updateSettings();
  };

  // Convenience wrappers for the active project
  const getPermissionForActionForActiveProject = (
    actionId: string,
  ): ActionPermission | null => {
    const userScopedProjectId = getStableProjectIdForActiveProject();

    if (!userScopedProjectId) {
      return null;
    }

    return getPermissionForAction(userScopedProjectId, actionId);
  };

  const setPermissionForActionForActiveProject = async (
    actionId: string,
    permission: ActionPermission,
  ) => {
    const userScopedProjectId = getStableProjectIdForActiveProject();

    if (!userScopedProjectId) {
      return;
    }

    await setPermissionForAction(userScopedProjectId, actionId, permission);
  };

  const getPermissionsForAllActionsForActiveProject =
    (): ProjectActionPermissions | null => {
      const userScopedProjectId = getStableProjectIdForActiveProject();

      if (!userScopedProjectId) {
        return null;
      }

      return getPermissionsForAllActions(userScopedProjectId);
    };

  const revokePermissionForActionForActiveProject = async (
    actionId: string,
  ) => {
    const userScopedProjectId = getStableProjectIdForActiveProject();

    if (!userScopedProjectId) {
      return;
    }

    await revokePermissionForAction(userScopedProjectId, actionId);
  };

  const revokePermissionsForAllActionsForActiveProject = async () => {
    const userScopedProjectId = getStableProjectIdForActiveProject();

    if (!userScopedProjectId) {
      return;
    }

    await revokePermissionsForAllActions(userScopedProjectId);
  };

  const pruneStaleActionPermissions = (thresholdDate: Date) => {
    let didPrune = false;

    for (const [userScopedProjectId, entry] of Object.entries(
      settings.actionPermissionsByProject,
    )) {
      if (new Date(entry.lastUpdated) < thresholdDate) {
        consola.debug(
          `Pruning stale AI settings for project ${userScopedProjectId} (last updated: ${entry.lastUpdated})`,
        );
        delete settings.actionPermissionsByProject[userScopedProjectId];
        didPrune = true;
      }
    }

    return didPrune;
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
