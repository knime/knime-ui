import { computed, type Ref } from "vue";

import { API } from "@api";
import { useStore } from "@/composables/useStore";

type UseMovingItemsOptions = {
  projectId: Ref<string | null>;
};

export const useMovingItems = (options: UseMovingItemsOptions) => {
  const store = useStore();
  const openProjects = computed(() => store.state.application.openProjects);

  const pathToItemId = computed(() => store.getters["spaces/pathToItemId"]);
  const activeSpacePath = computed(() => {
    return store.state.spaces.projectPath[options.projectId.value];
  });

  const onMoveItems = async ({
    sourceItems,
    targetItem,
    isCopy = false,
    onComplete,
  }: {
    sourceItems: string[];
    targetItem: string;
    isCopy: boolean;
    onComplete: (success: boolean) => void;
  }) => {
    const openedWorkflows = openProjects.value.filter((project) =>
      sourceItems.includes(project?.origin?.itemId),
    );

    const isInsideFolder = openProjects.value.filter((project) => {
      if (!project.origin) {
        return false;
      }

      const { ancestorItemIds = [] } = project.origin;

      return ancestorItemIds.some((ancestorId) =>
        sourceItems.includes(ancestorId),
      );
    });

    if (openedWorkflows.length || isInsideFolder.length) {
      const openedWorkflowsNames = openedWorkflows.map(
        (workflow) => workflow.name,
      );
      const isInsideFolderNames = isInsideFolder.map(
        (workflow) => workflow.name,
      );
      const extraSpace =
        openedWorkflows.length && isInsideFolder.length ? "\n" : "";

      const copyOrMove = isCopy ? "copy" : "move";

      alert(`Following workflows are opened:\n
        ${
          openedWorkflowsNames.map((name) => `• ${name}`).join("\n") +
          extraSpace +
          isInsideFolderNames.map((name) => `• ${name}`).join("\n")
        }
        \nTo ${copyOrMove} your selected items, they have to be closed first`);

      onComplete(false);

      return;
    }

    const destWorkflowGroupItemId = pathToItemId.value(
      options.projectId.value,
      targetItem,
    );

    // if we copy into the current workflow group, we actually "duplicate"
    // and hence always want to auto rename without bothering the user with a dialog
    const isDuplicate = isCopy && targetItem === ".";
    const collisionStrategy = isDuplicate
      ? "AUTORENAME"
      : await API.desktop.getNameCollisionStrategy({
          spaceProviderId: activeSpacePath.value?.spaceProviderId,
          spaceId: activeSpacePath.value?.spaceId,
          itemIds: sourceItems,
          destinationItemId: destWorkflowGroupItemId,
        });

    if (collisionStrategy === "CANCEL") {
      onComplete(false);

      return;
    }

    try {
      await store.dispatch("spaces/moveOrCopyItems", {
        itemIds: sourceItems,
        projectId: options.projectId.value,
        destWorkflowGroupItemId,
        collisionStrategy,
        isCopy,
      });

      onComplete(true);
    } catch (error) {
      const copyOrMove = isCopy ? "copying" : "moving";
      consola.error(`There was a problem ${copyOrMove} the items`, { error });
      onComplete(false);
    }
  };

  const onDuplicateItems = async (sourceItems: string[]) => {
    await onMoveItems({
      sourceItems,
      targetItem: ".",
      isCopy: true,
      onComplete: () => {},
    });
  };

  return { onMoveItems, onDuplicateItems };
};
