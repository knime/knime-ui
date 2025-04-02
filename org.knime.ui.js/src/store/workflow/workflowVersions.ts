/* eslint-disable no-undefined */
/* eslint-disable no-use-before-define */
/* eslint-disable func-style */
import { computed, markRaw, ref } from "vue";
import { merge } from "lodash-es";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";

import {
  CURRENT_STATE_VERSION,
  VERSION_DEFAULT_LIMIT,
  useVersionsApi,
} from "@knime/hub-features/versions";
import type {
  ItemSavepoint,
  NamedItemVersion,
  WithAvatar,
  WithLabels,
} from "@knime/hub-features/versions";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import type { SpaceProviderNS } from "@/api/custom-types";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { isBrowser } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "../application/application";
import { useDirtyProjectsTrackingStore } from "../application/dirtyProjectsTracking";
import { useSelectionStore } from "../selection";
import { useSpaceProvidersStore } from "../spaces/providers";
import { isHubProvider } from "../spaces/util";

import { useDesktopInteractionsStore } from "./desktopInteractions";
import { useWorkflowStore } from "./workflow";

export type VersionsModeStatus = "active" | "inactive" | "promoteHub";

const getHubBaseUrl = (provider?: SpaceProviderNS.SpaceProvider | null) => {
  if (isBrowser()) {
    return "/_/api";
  }

  return provider?.hostname;
};

const confirmationButtons = [
  {
    type: "cancel" as const,
    label: "Cancel",
  },
  {
    type: "cancel" as const,
    label: "No",
    flushRight: true,
  },
  {
    type: "confirm" as const,
    label: "Yes",
    flushRight: true,
  },
];

export const useWorkflowVersionsStore = defineStore("workflowVersions", () => {
  const $router = useRouter();
  const { show: showConfirmDialog } = useConfirmDialog();

  /** State: */
  const status = ref<Map<string, VersionsModeStatus>>(new Map());
  const versionsModeInfo = ref<
    Map<
      string,
      {
        loadedVersions: Array<NamedItemVersion & WithAvatar & WithLabels>;
        unversionedSavepoint: (ItemSavepoint & WithAvatar & WithLabels) | null;
        hasLoadedAll: boolean;
      }
    >
  >(new Map());
  const loading = ref(false);

  /** Getters: */
  const activeProjectVersionsModeStatus = computed(() => {
    const { activeProjectId } = useApplicationStore();

    if (!activeProjectId) {
      return "inactive";
    }

    return status.value.get(activeProjectId) ?? "inactive";
  });

  const activeProjectVersionsModeInfo = computed(() => {
    const { activeProjectId } = useApplicationStore();

    if (!activeProjectId) {
      return undefined;
    }

    return versionsModeInfo.value.get(activeProjectId);
  });
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
    const { activeProjectProvider } = useSpaceProvidersStore();
    const hubApi = useVersionsApi({
      baseUrl: getHubBaseUrl(activeProjectProvider),
    });

    const newVersion = await hubApi.createVersion({
      projectItemId: activeProjectOrigin!.itemId!,
      title: name,
      description,
    });

    if (!newVersion) {
      consola.error(
        "WorkflowVersionsStore::createVersion -> No new version returned",
      );
      return;
    }

    consola.info(
      `WorkflowVersionsStore::createVersion -> New project version '${newVersion.version}' created`,
    );

    activeProjectVersionsModeInfo.value.loadedVersions.unshift({
      ...newVersion,
      labels: [],
      avatar: await hubApi.getAvatar({
        accountName: newVersion.author,
      }),
    });

    activeProjectVersionsModeInfo.value.unversionedSavepoint = null;
  }

  async function deleteVersion(version: NamedItemVersion["version"]) {
    const { activeProjectProvider } = useSpaceProvidersStore();
    if (!activeProjectProvider) {
      consola.error(
        "WorkflowVersionsStore::deleteVersion -> Prerequisite failed",
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

    const hubApi = useVersionsApi({
      baseUrl: getHubBaseUrl(activeProjectProvider),
    });
    await hubApi?.deleteVersion({
      projectItemId: useApplicationStore().activeProjectOrigin?.itemId!,
      version,
    });

    if (version === activeProjectCurrentVersion.value) {
      switchVersion(CURRENT_STATE_VERSION);
    }

    await refreshData();
  }

  function restoreVersion(version: NamedItemVersion["version"]) {
    getToastsProvider().show({
      type: "error",
      deduplicationKey:
        "workflowVersions.ts::restoreVersion::NotYetImplemented",
      headline: "Error restoring version",
      message: "Operation is not implemented yet.",
      meta: {
        version, // so the param isn't unused while this placeholder is in place.
      },
    });
  }

  async function switchVersion(version: NamedItemVersion["version"]) {
    const { activeProjectId } = useApplicationStore();

    if (!activeProjectId) {
      return;
    }

    if (
      activeProjectCurrentVersion.value === CURRENT_STATE_VERSION &&
      useDirtyProjectsTrackingStore().dirtyProjectsMap[activeProjectId]
    ) {
      const { confirmed } = await showConfirmDialog({
        title: "Unsaved changes",
        message: "This workflow has unsaved changes. Save to proceed?",
        buttons: confirmationButtons,
      });

      if (!confirmed) {
        return;
      }

      await useDesktopInteractionsStore().saveProject(); // TODO: NXT-3362 Check result?
    }
    $router.push({
      name: APP_ROUTES.WorkflowPage,
      params: { projectId: activeProjectId },
      query: {
        version: version === CURRENT_STATE_VERSION ? null : String(version),
      },
    });
  }

  async function refreshData(
    { loadAll }: { loadAll: boolean } = { loadAll: false },
  ) {
    const projectItemId = useApplicationStore().activeProjectOrigin?.itemId;
    const hubApiBaseUrl = getHubBaseUrl(
      useSpaceProvidersStore().activeProjectProvider,
    );

    if (
      !(projectItemId && hubApiBaseUrl && activeProjectVersionsModeInfo.value)
    ) {
      consola.error(
        "WorkflowVersionsStore::refreshData -> Prerequisite failed",
      );
      return;
    }

    loading.value = true;
    const hubApi = useVersionsApi({
      baseUrl: hubApiBaseUrl,
    });

    const itemSavepointsInfo = await hubApi.fetchItemSavepoints({
      itemId: projectItemId,
      limit: loadAll ? -1 : undefined,
    });

    if (!itemSavepointsInfo.savepoints[0]?.version) {
      const lastSavepoint = itemSavepointsInfo.savepoints[0];

      activeProjectVersionsModeInfo.value.unversionedSavepoint = merge(
        {},
        lastSavepoint,
        await hubApi.loadSavepointMetadata(lastSavepoint),
      );
    }
    activeProjectVersionsModeInfo.value.loadedVersions = await Promise.all(
      itemSavepointsInfo.savepoints
        .filter((savepoint) => savepoint.version)
        .map(async (savepoint) => ({
          ...savepoint.version!,
          ...(await hubApi.loadSavepointMetadata(savepoint)),
        })),
    );

    activeProjectVersionsModeInfo.value.hasLoadedAll =
      loadAll || itemSavepointsInfo.totalCount < VERSION_DEFAULT_LIMIT;
    loading.value = false;
  }

  async function activateVersionsMode() {
    const { activeProjectId } = useApplicationStore();

    if (!activeProjectId) {
      consola.error(
        "WorkflowVersionsStore::activatesionsMode -> Prerequisite failed: activeProjectId",
      );
      return;
    }

    // Reset cached state
    versionsModeInfo.value.set(activeProjectId, {
      loadedVersions: [],
      unversionedSavepoint: null,
      hasLoadedAll: false,
    });
    useSelectionStore().deselectAllObjects();

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
    await refreshData();
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
    // actions:
    setVersionsModeStatus,
    createVersion,
    deleteVersion,
    restoreVersion,
    switchVersion,
    activateVersionsMode,
    deactivateVersionsMode,
    refreshData,
  };
});
