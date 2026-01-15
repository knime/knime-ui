import { reactive } from "vue";
import { API } from "@api";
import { defineStore } from "pinia";

import { runInEnvironment } from "@/environment";

/**
 * Store that manages AP-client-side AI settings.
 *
 * AI settings currently implemented:
 * - Action permissions: per-workflow per-action decision about whether to "always allow" or "never allow" a certain action by K-AI.
 */

const AI_SETTINGS_KEY = "knime-ai-settings";

/**
 * Workflow entries older than this will be pruned.
 * See lifecycle.ts::initializeApplication
 */
const PRUNE_THRESHOLD_MONTHS = 6;

export type ActionPermission = "allow" | "deny";

export interface WorkflowActionPermissions {
  lastUpdated: string;
  permissions: Record<string, ActionPermission>;
}

export interface AISettingsState {
  actionPermissions: Record<string, WorkflowActionPermissions>;
}

const loadItem = <T>(key: string, defaultValue: T | null = null): T | null => {
  const item = window?.localStorage?.getItem(key);
  return item === null ? defaultValue : JSON.parse(item);
};

const saveItem = (key: string, value: unknown) => {
  window?.localStorage?.setItem(key, JSON.stringify(value));
};

export const useAISettingsStore = defineStore("aiSettings", () => {
  const actionPermissions = reactive<Record<string, WorkflowActionPermissions>>(
    {},
  );

  /**
   * Get the stored permission for an action within a specific workflow.
   * Returns null if no permission is stored (i.e., should ask the user).
   */
  const getActionPermission = (
    workflowId: string,
    actionId: string,
  ): ActionPermission | null => {
    return actionPermissions[workflowId]?.permissions[actionId] ?? null;
  };

  /**
   * Get all permissions for a specific workflow.
   */
  const getWorkflowPermissions = (
    workflowId: string,
  ): WorkflowActionPermissions | null => {
    return actionPermissions[workflowId] ?? null;
  };

  const persistSettings = async () => {
    const data: AISettingsState = {
      actionPermissions,
    };

    try {
      await runInEnvironment({
        DESKTOP: () => {
          API.desktop.setUserProfilePart({
            key: AI_SETTINGS_KEY,
            data,
          });
        },
        BROWSER: () => saveItem(AI_SETTINGS_KEY, data),
      });
    } catch (error) {
      consola.error("Failed to persist AI settings to user profile:", error);
    }
  };

  const fetchAISettings = async () => {
    try {
      const settings = await runInEnvironment({
        DESKTOP: () => API.desktop.getUserProfilePart({ key: AI_SETTINGS_KEY }),
        BROWSER: () => Promise.resolve(loadItem(AI_SETTINGS_KEY)),
      });

      const loaded = settings as AISettingsState | null;

      Object.keys(actionPermissions).forEach(
        (key) => delete actionPermissions[key],
      );
      Object.assign(actionPermissions, loaded?.actionPermissions ?? {});
    } catch (error) {
      consola.error("Failed to get AI settings from user profile", error);
    }
  };

  /**
   * Prune workflow entries that haven't been updated in the last N months.
   */
  const pruneStaleActionPermissions = async () => {
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setMonth(thresholdDate.getMonth() - PRUNE_THRESHOLD_MONTHS);

    let didPrune = false;

    for (const [workflowId, entry] of Object.entries(actionPermissions)) {
      if (new Date(entry.lastUpdated) < thresholdDate) {
        consola.debug(
          `Pruning stale AI settings for workflow ${workflowId} (last updated: ${entry.lastUpdated})`,
        );
        delete actionPermissions[workflowId];
        didPrune = true;
      }
    }

    if (didPrune) {
      await persistSettings();
    }
  };

  /**
   * Set the permission for an action within a workflow and persist to storage.
   */
  const setActionPermission = async (
    workflowId: string,
    actionId: string,
    permission: ActionPermission,
  ) => {
    const now = new Date().toISOString();

    if (!actionPermissions[workflowId]) {
      actionPermissions[workflowId] = {
        lastUpdated: now,
        permissions: {},
      };
    }

    actionPermissions[workflowId].permissions[actionId] = permission;
    actionPermissions[workflowId].lastUpdated = now;

    await persistSettings();
  };

  /**
   * Revoke the stored permission for an action within a workflow,
   * returning it to "ask" state.
   */
  const revokeActionPermission = async (
    workflowId: string,
    actionId: string,
  ) => {
    const workflowPermissions = actionPermissions[workflowId];
    if (!workflowPermissions) {
      return;
    }

    delete workflowPermissions.permissions[actionId];
    workflowPermissions.lastUpdated = new Date().toISOString();

    // Clean up workflow entry if no permissions remain
    if (Object.keys(workflowPermissions.permissions).length === 0) {
      delete actionPermissions[workflowId];
    }

    await persistSettings();
  };

  /**
   * Revoke all permissions for a specific workflow.
   */
  const revokeWorkflowPermissions = async (workflowId: string) => {
    delete actionPermissions[workflowId];
    await persistSettings();
  };

  return {
    actionPermissions,
    getActionPermission,
    getWorkflowPermissions,
    fetchAISettings,
    pruneStaleActionPermissions,
    persistSettings,
    setActionPermission,
    revokeActionPermission,
    revokeWorkflowPermissions,
  };
});
