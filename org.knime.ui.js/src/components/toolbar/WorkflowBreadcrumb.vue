<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, markRaw } from "vue";
import { storeToRefs } from "pinia";

import { LoadingIcon, type MenuItem, SubMenu } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import HistoryIcon from "@knime/styles/img/icons/history.svg";
import ListIcon from "@knime/styles/img/icons/list-thumbs.svg";

import { SpaceProviderNS, type Workflow } from "@/api/custom-types";
import { SpaceProvider } from "@/api/gateway-api/generated-api";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { useSpaceIcons } from "@/components/spaces/useSpaceIcons";
import { isDesktop } from "@/environment";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { getToastPresets } from "@/toastPresets";
import ToolbarButton from "../common/ToolbarButton.vue";

import ComponentBreadcrumb from "./ComponentBreadcrumb.vue";

type Props = {
  workflow: Workflow;
};
const props = defineProps<Props>();
const { revealItemInSpaceExplorer, canRevealItem } = useRevealInSpaceExplorer();
const { getSpaceProviderIcon } = useSpaceIcons();
const { toastPresets } = getToastPresets();

const { activeProjectOrigin, openProjects, activeProjectId } = storeToRefs(
  useApplicationStore(),
);
const { activeProjectProvider } = storeToRefs(useSpaceProvidersStore());

const getActiveProject = () =>
  openProjects.value.find(
    (project) => project.projectId === activeProjectId.value,
  );

const handleRestoreVersion = () => {
  const activeVersion = props.workflow.info.version;

  if (!activeVersion) {
    return;
  }

  try {
    useWorkflowVersionsStore().restoreVersion(Number(activeVersion));
  } catch (error) {
    toastPresets.api.hubActionError({
      error,
      headline: "Restoring project version failed",
      message: `Error restoring '${getActiveProject()
        ?.name}' to version '${activeVersion}'.`,
    });
  }
};

const dropdownItems = computed(() => {
  const items: Array<MenuItem> = [];
  if (activeProjectProvider.value?.type !== SpaceProviderNS.TypeEnum.SERVER) {
    items.push({
      text: "Version history",
      icon: HistoryIcon,
      disabled: Boolean(!activeProjectProvider.value),
      title: activeProjectProvider.value ? undefined : "Loading...",
      metadata: {
        handler: async () => {
          try {
            await useWorkflowVersionsStore().activateVersionsMode();
          } catch (error) {
            toastPresets.api.hubActionError({
              error,
              headline: "Opening version history failed",
              message: `Error fetching version information for project '${getActiveProject()
                ?.name}'.`,
            });
          }
        },
      },
    });
  }

  if (
    activeProjectOrigin.value &&
    canRevealItem(activeProjectOrigin.value.providerId)
  ) {
    items.push({
      text: "Reveal in space explorer",
      icon: ListIcon,
      metadata: {
        handler: async () => {
          const projectName = openProjects.value.find(
            (project) => project.projectId === activeProjectId.value,
          )!.name;

          await revealItemInSpaceExplorer(
            activeProjectOrigin.value!,
            projectName,
          );
        },
      },
    });
  }

  if (isDesktop()) {
    items.push({
      text: "Close project",
      icon: CloseIcon,
      metadata: {
        handler: () => {
          useDesktopInteractionsStore().closeProject(activeProjectId.value!);
        },
      },
    });
  }

  return items;
});

const isInSublevel = computed(() => {
  return (props.workflow.parents?.length ?? 0) > 0;
});

const providerInfo = computed(() => {
  if (!activeProjectProvider.value) {
    return { icon: markRaw(LoadingIcon), providerText: "" };
  }

  const mapper: Record<SpaceProvider.TypeEnum, string> = {
    [SpaceProvider.TypeEnum.LOCAL]: "Local",
    [SpaceProvider.TypeEnum.HUB]: "Hub",
    [SpaceProvider.TypeEnum.SERVER]: "Server",
  };

  return {
    icon: markRaw(getSpaceProviderIcon(activeProjectProvider.value)),
    providerText: mapper[activeProjectProvider.value.type],
  };
});
</script>

<template>
  <div class="breadcrumb-wrapper">
    <ComponentBreadcrumb v-if="isInSublevel" :workflow />
    <div v-else class="breadcrumb-root">
      <Component :is="providerInfo.icon" class="breadcrumb-icon" />
      <span> {{ `${providerInfo.providerText} — ${workflow.info.name}` }}</span>
      <div class="space-selection-dropdown">
        <SubMenu
          compact
          :teleport-to-body="false"
          :items="dropdownItems"
          button-title="Workflow menu actions"
          orientation="right"
          @item-click="(_: MouseEvent, item) => item.metadata.handler()"
        >
          <template #default>
            <DropdownIcon class="dropdown-icon" />
          </template>
        </SubMenu>
      </div>
      <template v-if="props.workflow.info.version">
        <span
          class="workflow-versions-information"
          :title="activeProjectOrigin?.version?.title"
          >Version: "{{ activeProjectOrigin?.version?.title }}"</span
        >
        <ToolbarButton
          class="toolbar-button"
          :with-text="true"
          title="Restore this version"
          @click="handleRestoreVersion"
        >
          <HistoryIcon />
          Restore this version
        </ToolbarButton>
      </template>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.breadcrumb-wrapper {
  display: flex;
  min-width: 150px;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.breadcrumb-root {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  & span {
    font-size: 13px;
    line-height: 18px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  & .breadcrumb-icon {
    stroke: var(--knime-masala);

    @mixin svg-icon-size 12;
  }

  & .dropdown-icon {
    @mixin svg-icon-size 10;
  }

  & .workflow-versions-information {
    margin: 0 10px;
    max-width: 300px;
  }
}
</style>
