<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, markRaw } from "vue";
import { storeToRefs } from "pinia";

import { type MenuItem, SubMenu } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import HistoryIcon from "@knime/styles/img/icons/history.svg";

import { SpaceProviderNS, type Workflow } from "@/api/custom-types";
import { SpaceProvider } from "@/api/gateway-api/generated-api";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { useSpaceIcons } from "@/components/spaces/useSpaceIcons";
import { isDesktop } from "@/environment";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { findSpaceById } from "@/store/spaces/util";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { getToastPresets } from "@/toastPresets";
import ToolbarButton from "../common/ToolbarButton.vue";

import ComponentBreadcrumb from "./ComponentBreadcrumb.vue";

type Props = {
  workflow: Workflow;
};
const props = defineProps<Props>();
const { revealSingleItem, canRevealItem, revealActionMetadata } =
  useRevealInSpaceExplorer();
const { getSpaceProviderIcon } = useSpaceIcons();
const { toastPresets } = getToastPresets();

const { activeProjectOrigin, openProjects, activeProjectId } = storeToRefs(
  useApplicationStore(),
);
const {
  activeProjectProvider,
  getProviderInfoFromActiveProject,
  spaceProviders,
} = storeToRefs(useSpaceProvidersStore());
const uiControls = useUIControlsStore();

const { getSpaceItemVersion } = useWorkflowVersionsStore();

const handleRestoreVersion = () => {
  const activeVersion = props.workflow.info.version;

  if (!activeVersion) {
    return;
  }

  try {
    useWorkflowVersionsStore().restoreVersion(Number(activeVersion));
  } catch (error) {
    toastPresets.versions.restoreFailed({ error });
  }
};

const dropdownItems = computed(() => {
  const items: Array<MenuItem> = [];
  if (
    activeProjectProvider.value?.type !== SpaceProviderNS.TypeEnum.SERVER &&
    uiControls.canViewVersions
  ) {
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
            toastPresets.versions.activateModeFailed({ error });
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
      text: revealActionMetadata.label,
      icon: revealActionMetadata.icon,
      metadata: {
        handler: async () => {
          const projectName = openProjects.value.find(
            (project) => project.projectId === activeProjectId.value,
          )!.name;

          await revealSingleItem(activeProjectOrigin.value!, projectName);
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

// details on provider state in case of fallback
const logMatchedProviderStatus = (
  provider: SpaceProviderNS.SpaceProvider | null,
) => {
  if (!provider) {
    consola.debug("Couldn't match project to any provider.");
    return;
  }

  const spaceId = activeProjectOrigin.value?.spaceId;
  const foundSpace =
    spaceProviders.value && findSpaceById(spaceProviders.value, spaceId ?? "");
  const spaceIdMismatchMessage =
    provider.connected && !foundSpace
      ? ` Space id ${spaceId} could not be matched.`
      : "";

  consola.debug(
    `Matched project to ${provider.connected ? "" : "un"}connected provider "${
      provider.name
    }" with type ${provider.type}.${spaceIdMismatchMessage}`,
  );
};

const providerText = computed(() => {
  const mapper: Record<SpaceProvider.TypeEnum, string> = {
    [SpaceProvider.TypeEnum.LOCAL]: "Local",
    [SpaceProvider.TypeEnum.HUB]: "Hub",
    [SpaceProvider.TypeEnum.SERVER]: "Server",
  };

  let provider = activeProjectProvider.value;
  if (!provider) {
    provider = getProviderInfoFromActiveProject.value();
    logMatchedProviderStatus(provider);
  }

  const providerType = provider?.type;
  return providerType ? mapper[providerType] : "";
});

const providerIcon = computed(() =>
  markRaw(getSpaceProviderIcon(activeProjectProvider.value)),
);

const breadcrumbText = computed(() => {
  return providerText.value
    ? `${providerText.value} — ${props.workflow.info.name}`
    : props.workflow.info.name;
});

const activeVersionTitle = computed(() => {
  return getSpaceItemVersion(
    props.workflow.projectId,
    props.workflow.info.version,
  )?.title;
});
</script>

<template>
  <div class="breadcrumb-wrapper">
    <ComponentBreadcrumb v-if="isInSublevel" :workflow />
    <div v-else class="breadcrumb-root">
      <Component
        :is="providerIcon"
        v-if="isDesktop()"
        class="breadcrumb-icon"
      />
      <span> {{ breadcrumbText }}</span>
      <SubMenu
        v-if="dropdownItems.length"
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
      <template v-if="props.workflow.info.version">
        <span class="workflow-versions-information" :title="activeVersionTitle"
          >Version: "{{ activeVersionTitle }}"</span
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

   &:deep(span.clickable:hover) {
    color: var(--kds-color-text-and-icon-neutral);
  }

}

.breadcrumb-root {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font: var(--kds-font-base-interactive-small);
  color: var(--kds-color-text-and-icon-subtle);

  & span {
    font: var(--kds-font-base-body-small);
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
  & :deep(.function-button) {
    border-radius: var(
    --kds-legacy-button-border-radius,
    var(--kds-border-radius-container-0-37x)
  );

    &:focus-visible {
      outline: var(--kds-border-action-focused);
      outline-offset: 1px;
      background-color: var(--kds-color-background-neutral-initial);
    }
    &:hover, &.expanded {
      background: var(--kds-color-background-neutral-hover);
      border-color: var(--kds-color-background-neutral-hover);
    }
    &:active {
      background: var(--kds-color-background-neutral-active);
      border-color: var(--kds-border-action-transparent);
    }
    & svg {
      stroke: var(--kds-color-text-and-icon-neutral);
      stroke-width: 3.50px;
      width: 12px;
      height: 12px;
    }
  }
}
</style>
