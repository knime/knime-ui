<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { type MenuItem, SubMenu } from "@knime/components";
import { rfcErrors } from "@knime/hub-features";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import HistoryIcon from "@knime/styles/img/icons/history.svg";
import ListIcon from "@knime/styles/img/icons/list-thumbs.svg";

import { SpaceProviderNS, type Workflow } from "@/api/custom-types";
import { SpaceProvider } from "@/api/gateway-api/generated-api";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { useSpaceIcons } from "@/components/spaces/useSpaceIcons";
import { isDesktop } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";

import ComponentBreadcrumb from "./ComponentBreadcrumb.vue";

type Props = {
  workflow: Workflow;
};
const props = defineProps<Props>();
const { revealInSpaceExplorer, canRevealItem } = useRevealInSpaceExplorer();
const { getSpaceProviderIcon } = useSpaceIcons();

const { activeProjectOrigin, openProjects, activeProjectId } = storeToRefs(
  useApplicationStore(),
);
const { activeProjectProvider } = storeToRefs(useSpaceProvidersStore());

const getActiveProject = () =>
  openProjects.value.find(
    (project) => project.projectId === activeProjectId.value,
  );

const dropdownItems = computed(() => {
  const items: Array<MenuItem> = [];
  if (activeProjectProvider.value?.type !== SpaceProviderNS.TypeEnum.SERVER) {
    items.push({
      text: "Version history",
      icon: HistoryIcon,
      metadata: {
        handler: async () => {
          try {
            await useWorkflowVersionsStore().activateVersionsMode();
          } catch (error) {
            const $toast = getToastsProvider();
            if (error instanceof rfcErrors.RFCError) {
              $toast.show(
                rfcErrors.toToast({
                  headline: "Fetching version history failed",
                  rfcError: error,
                }),
              );
            } else {
              $toast.show({
                type: "error",
                headline: "Showing version history failed",
                message: `Error fetching version information for '${getActiveProject()
                  ?.name}'.`,
              });
            }
          }
        },
      },
    });
  }

  if (activeProjectOrigin.value && canRevealItem(activeProjectOrigin.value)) {
    items.push({
      text: "Reveal in space explorer",
      icon: ListIcon,
      metadata: {
        handler: async () => {
          await revealInSpaceExplorer(
            activeProjectOrigin.value!,
            getActiveProject()!.name,
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
    return { icon: null, providerText: "" };
  }

  const mapper: Record<SpaceProvider.TypeEnum, string> = {
    [SpaceProvider.TypeEnum.LOCAL]: "Local",
    [SpaceProvider.TypeEnum.HUB]: "Hub",
    [SpaceProvider.TypeEnum.SERVER]: "Server",
  };

  return {
    icon: getSpaceProviderIcon(activeProjectProvider.value),
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
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.breadcrumb-wrapper {
  display: flex;
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
  }

  & .breadcrumb-icon {
    stroke: var(--knime-masala);

    @mixin svg-icon-size 12;
  }

  & .dropdown-icon {
    @mixin svg-icon-size 10;
  }
}
</style>
