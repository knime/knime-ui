/* eslint-disable no-undefined */
/* eslint-disable no-use-before-define */
/* eslint-disable func-style */
import { computed, markRaw, ref } from "vue";
import { API } from "@api";
import { merge } from "lodash-es";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";

import { rfcErrors } from "@knime/hub-features";
import {
  CURRENT_STATE_VERSION,
  MOST_RECENT_VERSION,
  VERSION_DEFAULT_LIMIT,
  useVersionsApi,
} from "@knime/hub-features/versions";
import type {
  ItemPermission,
  ItemSavepoint,
  NamedItemVersion,
  WithAvatar,
  WithLabels,
} from "@knime/hub-features/versions";
import TrashIcon from "@knime/styles/img/icons/trash.svg";
import { promise } from "@knime/utils";

import type { SpaceItemVersion } from "@/api/gateway-api/generated-api";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { isBrowser } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import { useWorkflowPreviewSnapshotsStore } from "@/store/application/workflowPreviewSnapshots.ts";
import { getCustomFetchOptionsForBrowser } from "@/store/spaces/common.ts";
import { useApplicationStore } from "../application/application";
import { useDirtyProjectsTrackingStore } from "../application/dirtyProjectsTracking";
import { useSelectionStore } from "../selection";
import { useSpaceProvidersStore } from "../spaces/providers";
import { isHubProvider } from "../spaces/util";

import { useDesktopInteractionsStore } from "./desktopInteractions";
import { useWorkflowStore } from "./workflow";

export type VersionsModeStatus = "active" | "inactive" | "promoteHub";
type ProjectVersionsModeInfo = {
  loadedVersions: Array<NamedItemVersion & WithAvatar & WithLabels>;
  unversionedSavepoint: (ItemSavepoint & WithAvatar & WithLabels) | null;
  permissions: Array<ItemPermission>;
  hasLoadedAll: boolean;
};

const getVersionsApi = () => {
  return useVersionsApi({
    customFetchClientOptions: isBrowser()
      ? getCustomFetchOptionsForBrowser()
      : { baseURL: useSpaceProvidersStore().activeProjectProvider?.hostname },
  });
};

const createInitialProjectVersionsModeInfo = (): ProjectVersionsModeInfo => ({
  loadedVersions: [],
  unversionedSavepoint: null,
  permissions: [],
  hasLoadedAll: false,
});

export const useWorkflowVersionsStore = defineStore("workflowVersions", () => {
  const $router = useRouter();
  const { show: showConfirmDialog } = useConfirmDialog();

  /** State: */
  const status = ref<Map<string, VersionsModeStatus>>(new Map());
  const versionsModeInfo = ref<Map<string, ProjectVersionsModeInfo>>(new Map());
  const loading = ref(false);

  /** Getters: */
  const activeProjectVersionsModeStatus = computed(() => {
    const { activeProjectId } = useApplicationStore();

    if (!activeProjectId) {
      return "inactive";
    }

    return status.value.get(activeProjectId) ?? "inactive";
  });

  const activeProjectVersionsModeInfo = computed(
    (): ProjectVersionsModeInfo | undefined => {
      const { activeProjectId } = useApplicationStore();

      if (!activeProjectId) {
        return undefined;
      }

      return versionsModeInfo.value.get(activeProjectId);
    },
  );

  /**
   * @param projectId
   * @param versionId
   * @returns The 'SpaceItemVersion' if it could be found, 'undefined' for the current state
   */
  const getSpaceItemVersion = (
    projectId: string,
    versionId: string | undefined,
  ): SpaceItemVersion | undefined => {
    const projectVersionsModeInfo = versionsModeInfo.value.get(projectId);
    if (!projectVersionsModeInfo) {
      return undefined;
    }

    const foundVersion = projectVersionsModeInfo.loadedVersions.find(
      (namedItemVersion) => namedItemVersion.version.toString() === versionId,
    );
    if (
      !foundVersion ||
      foundVersion.version === CURRENT_STATE_VERSION ||
      foundVersion.version === MOST_RECENT_VERSION
    ) {
      return undefined;
    }

    return { ...foundVersion, version: foundVersion.version };
  };

  const activeProjectHasUnversionedChanges = computed(() => {
    return Boolean(activeProjectVersionsModeInfo.value?.unversionedSavepoint);
  });

  const isSidepanelOpen = computed(() => {
    const { activeProjectId } = useApplicationStore();
    return Boolean(
      activeProjectId &&
        ["active", "promoteHub"].includes(
          status.value.get(activeProjectId) ?? "",
        ),
    );
  });

  const activeProjectCurrentVersion = computed(() => {
    const versionInfo = useWorkflowStore().activeWorkflow?.info.version;
    return versionInfo ? Number(versionInfo) : CURRENT_STATE_VERSION;
  });

  /** Actions: */
  function setVersionsModeStatus(
    projectId: string,
    newStatus: VersionsModeStatus,
  ) {
    status.value.set(projectId, newStatus);
  }

  async function createVersion({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) {
    const { activeProjectId, activeProjectOrigin } = useApplicationStore();

    if (
      !(
        activeProjectId &&
        status.value.get(activeProjectId) === "active" &&
        activeProjectVersionsModeInfo.value
      )
    ) {
      consola.error(
        "WorkflowVersionsStore::createVersion -> Prerequisite failed",
      );
      return;
    }
    const versionsApi = getVersionsApi();

    const workflowPreviewSvg =
      (await useWorkflowPreviewSnapshotsStore().getActiveWorkflowSnapshot()) ??
      "";
    const isDirty =
      useDirtyProjectsTrackingStore().dirtyProjectsMap[activeProjectId];
    type NextAction = "cancel" | "discard" | "apply";
    let nextAction: NextAction = "cancel";
    const getNextAction = (): NextAction => nextAction;
    if (isDirty) {
      if (isBrowser()) {
        nextAction = "apply";
        // TODO: NXT-3634 Use the returned task ID to subscribe to 'task events' and show progress
        await API.workflow.saveProject({
          projectId: activeProjectId,
          workflowPreviewSvg,
        });
      } else {
        // TODO: This dialog with three possible return values is hacky. Can we do better?
        //       Perhaps we need a 'useConfirmOrDiscardDialog()' composable?
        const { show } = useConfirmDialog();
        await show({
          title: "Unsaved changes",
          message:
            "This workflow has unsaved changes. Would you like to save them, discard them and proceed, or cancel this action?",
          buttons: [
            {
              type: "cancel",
              label: "Cancel",
              customHandler: ({ cancel }) => {
                nextAction = "cancel";
                cancel();
              },
            },
            {
              type: "cancel",
              label: "Discard changes",
              flushRight: true,
              customHandler: ({ cancel }) => {
                nextAction = "discard";
                cancel();
              },
            },
            {
              type: "confirm",
              label: "Save changes",
              flushRight: true,
              customHandler: ({ confirm }) => {
                nextAction = "apply";
                confirm();
              },
            },
          ],
        });

        if (getNextAction() === "cancel") {
          // Do not create a version
          return;
        }

        if (getNextAction() === "apply") {
          // Save and upload
          await API.desktop.saveProject({
            projectId: activeProjectId,
            workflowPreviewSvg,
            allowOverwritePrompt: false,
          });
        }
      }
    }

    // Create version based on state on Hub side
    const newVersion = await versionsApi.createVersion({
      itemId: activeProjectOrigin!.itemId,
      title: name,
      description,
    });

    if (!newVersion) {
      consola.error(
        "WorkflowVersionsStore::createVersion -> No new version returned",
      );
      return;
    }

    if (isDirty && getNextAction() === "discard") {
      await API.workflow.disposeVersion({
        projectId: activeProjectId,
        version: CURRENT_STATE_VERSION,
      });

      // Reload the current state from hub side
      await $router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: activeProjectId },
        query: {
          version: CURRENT_STATE_VERSION,
        },
      });
    }

    consola.info(
      `WorkflowVersionsStore::createVersion -> New project version '${newVersion.version}' created`,
    );

    activeProjectVersionsModeInfo.value.loadedVersions.unshift({
      ...newVersion,
      labels: [],
      avatar: await versionsApi.getAvatar({
        accountName: newVersion.author,
      }),
    });

    activeProjectVersionsModeInfo.value.unversionedSavepoint = null;
  }

  async function deleteVersion(version: NamedItemVersion["version"]) {
    const { activeProjectId } = useApplicationStore();
    const { activeProjectProvider } = useSpaceProvidersStore();
    if (!activeProjectId || !activeProjectProvider) {
      consola.error(
        "WorkflowVersionsStore::deleteVersion -> Prerequisite failed",
        { activeProjectId, activeProjectProvider },
      );
      return;
    }

    const { confirmed } = await showConfirmDialog({
      title: "Delete version",
      titleIcon: markRaw(TrashIcon),
      message: "Do you want to delete the workflow version?",
      buttons: [
        {
          type: "cancel",
          label: "Cancel",
        },
        {
          type: "cancel",
          label: "No",
          flushRight: true,
        },
        {
          type: "confirm",
          label: "Yes",
          flushRight: true,
        },
      ],
    });

    if (!confirmed) {
      return;
    }

    await getVersionsApi().deleteVersion({
      itemId: useApplicationStore().activeProjectOrigin!.itemId,
      version,
    });
    await API.workflow.disposeVersion({
      projectId: activeProjectId,
      version: version.toString(),
    });
    if (version === activeProjectCurrentVersion.value) {
      switchVersion(CURRENT_STATE_VERSION);
    }
    await refreshData();
  }

  async function restoreVersion(version: NamedItemVersion["version"]) {
    const { show: showConfirmDialog } = useConfirmDialog();
    const { confirmed } = await showConfirmDialog({
      title: "Confirm version restore",
      message:
        "Restoring a version will overwrite the current workflow. Unversioned changes will be lost.",
      buttons: [
        { type: "cancel", label: "Cancel" },
        { type: "confirm", label: "Confirm", flushRight: true },
      ],
    });
    if (!confirmed) {
      return;
    }

    const { activeProjectId, activeProjectOrigin } = useApplicationStore();
    const { activeProjectProvider } = useSpaceProvidersStore();
    if (!activeProjectId || !activeProjectProvider || !activeProjectOrigin) {
      consola.error(
        "WorkflowVersionsStore::restoreVersion -> Prerequisite failed",
        { activeProjectId, activeProjectProvider, activeProjectOrigin },
      );
      return;
    }
    await getVersionsApi().restoreVersion({
      itemId: activeProjectOrigin.itemId,
      version,
    });

    await Promise.all([
      API.workflow.disposeVersion({
        projectId: activeProjectId,
        version: CURRENT_STATE_VERSION,
      }),
      refreshData(),
    ]);

    await $router.push({
      name: APP_ROUTES.WorkflowPage,
      params: { projectId: activeProjectId },
      query: {
        version: null,
      },
      force: true,
    });

    // any unsaved changes before the restore have been overwritten, so the project is clean
    useDirtyProjectsTrackingStore().updateDirtyProjectsMap({
      [activeProjectId]: false,
    });
  }

  async function discardUnversionedChanges() {
    const { show: showConfirmDialog } = useConfirmDialog();
    const { confirmed } = await showConfirmDialog({
      title: "Confirm discarding changes",
      message:
        "Any changes to the workflow since the last created version will be deleted.",
      buttons: [
        { type: "cancel", label: "Cancel" },
        { type: "confirm", label: "Confirm", flushRight: true },
      ],
    });
    if (!confirmed) {
      return;
    }

    const { activeProjectId, activeProjectOrigin } = useApplicationStore();
    const { activeProjectProvider } = useSpaceProvidersStore();

    if (!activeProjectId || !activeProjectOrigin || !activeProjectProvider) {
      consola.error(
        "WorkflowVersionsStore::discardUnversionedChanges -> Prerequisite failed",
        { activeProjectId, activeProjectProvider, activeProjectOrigin },
      );
      return;
    }

    await getVersionsApi().discardUnversionedChanges({
      itemId: activeProjectOrigin.itemId,
    });

    await Promise.all([
      API.workflow.disposeVersion({
        projectId: activeProjectId,
        version: CURRENT_STATE_VERSION,
      }),
      refreshData(),
    ]);

    if (activeProjectCurrentVersion.value === CURRENT_STATE_VERSION) {
      // refresh the project current-state
      await $router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: activeProjectId },
        query: {
          version: null,
        },
        force: true,
      });
      // project is clean after reload
      useDirtyProjectsTrackingStore().updateDirtyProjectsMap({
        [activeProjectId]: false,
      });
    }
  }

  async function switchVersion(version: NamedItemVersion["version"]) {
    const { activeProjectId } = useApplicationStore();
    if (!activeProjectId) {
      return;
    }

    let canSetNewRoute: boolean | null = true;
    if (
      activeProjectCurrentVersion.value === CURRENT_STATE_VERSION &&
      useDirtyProjectsTrackingStore().dirtyProjectsMap[activeProjectId]
    ) {
      try {
        canSetNewRoute = await useDesktopInteractionsStore().saveProject();
      } catch (error) {
        const errorMessage = typeof error === "string" ? error : "unknown"; // desktop-api.ts returns reject(DesktopAPIFunctionResultPayload.error)
        canSetNewRoute = false;
        getToastsProvider().show({
          type: "warning",
          deduplicationKey:
            "workflowVersion.ts::saveVersion::ProjectWasNotSaved",
          headline: "Could not save workflow",
          message: `Saving project failed. Cause: ${errorMessage}`,
          autoRemove: true,
        });
      }
    }

    if (canSetNewRoute) {
      await $router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: activeProjectId },
        query: {
          version: version === CURRENT_STATE_VERSION ? null : String(version),
        },
      });
    }
  }

  async function refreshData(
    { loadAll }: { loadAll: boolean } = { loadAll: false },
  ) {
    const itemId = useApplicationStore().activeProjectOrigin?.itemId;
    const { activeProjectId } = useApplicationStore();

    if (!itemId || !activeProjectId) {
      consola.error(
        "WorkflowVersionsStore::refreshData -> Prerequisite failed",
        { itemId, activeProjectId },
      );
      return;
    }

    loading.value = true;
    const versionsApi = getVersionsApi();

    const doLoadData = async () => {
      const newData: ProjectVersionsModeInfo =
        createInitialProjectVersionsModeInfo();

      newData.permissions = await versionsApi.fetchPermissions({
        itemId,
      });

      const itemSavepointsInfo = await versionsApi.fetchItemSavepoints({
        itemId,
        limit: loadAll ? -1 : undefined,
      });

      if (!itemSavepointsInfo.savepoints[0]?.version) {
        const lastSavepoint = itemSavepointsInfo.savepoints[0];

        newData.unversionedSavepoint = merge(
          {},
          lastSavepoint,
          await versionsApi.loadSavepointMetadata(lastSavepoint),
        );
      }

      newData.loadedVersions = await Promise.all(
        itemSavepointsInfo.savepoints
          .filter((savepoint) => savepoint.version)
          .map(async (savepoint) => {
            const savepointMetadata = await promise.retryPromise({
              fn: () => versionsApi.loadSavepointMetadata(savepoint),
              retryCount: 1,
            });

            return { ...savepoint.version!, ...savepointMetadata };
          }),
      );

      newData.hasLoadedAll =
        loadAll || itemSavepointsInfo.totalCount < VERSION_DEFAULT_LIMIT;

      return newData;
    };

    try {
      const newData = await promise.retryPromise({
        fn: doLoadData,
        retryCount: 1,
      });

      // Atomically apply new data
      versionsModeInfo.value.set(activeProjectId, newData);
    } catch (error) {
      if (!(error instanceof rfcErrors.RFCError)) {
        consola.error("refreshData:: Unexpected error", {
          error,
        });
      }
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function activateVersionsMode() {
    const { activeProjectId } = useApplicationStore();

    if (!activeProjectId) {
      consola.error(
        "WorkflowVersionsStore::activateVersionsMode -> Prerequisite failed: activeProjectId",
      );
      return;
    }

    const { wasAborted } = await useSelectionStore().deselectAllObjects();
    if (wasAborted) {
      return;
    }

    // Reset cached state
    versionsModeInfo.value.set(
      activeProjectId,
      createInitialProjectVersionsModeInfo(),
    );

    const provider = useSpaceProvidersStore().activeProjectProvider;

    if (!(provider && isHubProvider(provider))) {
      setVersionsModeStatus(activeProjectId, "promoteHub");
      return;
    }

    const project = useApplicationStore().openProjects.find(
      (p) => p.projectId === activeProjectId,
    );

    if (!(provider.hostname && project?.origin?.itemId)) {
      consola.error(
        "WorkflowVersionsStore::activateVersionsMode -> Prerequisite failed: Origin metadata",
      );
      return;
    }

    setVersionsModeStatus(activeProjectId, "active");
    try {
      await refreshData();
    } catch (error) {
      setVersionsModeStatus(activeProjectId, "inactive");
      throw error;
    }
  }

  async function deactivateVersionsMode() {
    const { activeProjectId } = useApplicationStore();
    if (!activeProjectId) {
      return;
    }

    await $router.push({
      name: APP_ROUTES.WorkflowPage,
      params: { projectId: activeProjectId },
      query: { version: null },
    });
    setVersionsModeStatus(activeProjectId, "inactive");
  }

  return {
    // state:
    status,
    versionsModeInfo,
    loading,
    // getters:
    activeProjectVersionsModeStatus,
    activeProjectVersionsModeInfo,
    activeProjectHasUnversionedChanges,
    isSidepanelOpen,
    activeProjectCurrentVersion,
    getSpaceItemVersion,
    // actions:
    setVersionsModeStatus,
    createVersion,
    deleteVersion,
    restoreVersion,
    discardUnversionedChanges,
    switchVersion,
    activateVersionsMode,
    deactivateVersionsMode,
    refreshData,
  };
});
