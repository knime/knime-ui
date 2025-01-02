import { type MaybeRefOrGetter, computed, toValue } from "vue";
import { storeToRefs } from "pinia";

import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { useApplicationStore } from "@/store/application/application";

import type { AppHeaderContextMenuItem } from "./types";

type UseRevealProject = {
  projectId: MaybeRefOrGetter<string | null>;
};

export const useRevealProject = (options: UseRevealProject) => {
  const { canRevealItem, revealInSpaceExplorer } = useRevealInSpaceExplorer();

  const { openProjects, isUnknownProject } = storeToRefs(useApplicationStore());

  const canRevealProject = computed(() => {
    const foundProject = openProjects.value.find(
      ({ projectId }) => projectId === toValue(options.projectId),
    );

    // cannot reveal unknown projects (aka no origin, or not related to our current providers)
    if (!foundProject || isUnknownProject.value(foundProject.projectId)) {
      return false;
    }

    return canRevealItem(foundProject.origin!);
  });

  const menuItem: AppHeaderContextMenuItem = {
    text: "Show in explorer",
    metadata: {
      onClick: async () => {
        if (!toValue(options.projectId)) {
          consola.error("Unexpected error. Project ID not provided");
          return;
        }

        const foundProject = openProjects.value.find(
          ({ projectId }) => projectId === toValue(options.projectId),
        );

        if (
          !foundProject?.origin ||
          isUnknownProject.value(foundProject.projectId)
        ) {
          consola.error("Reveal project option not supported", {
            foundProject,
          });
          return;
        }

        await revealInSpaceExplorer(foundProject.origin, foundProject.name);
      },
    },
  };

  const revealProjectMenuOption = computed(() => {
    return canRevealProject.value ? [menuItem] : [];
  });

  return { revealProjectMenuOption };
};
