import { type Ref, computed } from "vue";

import { API } from "@/api";
import { useStore } from "@/composables/useStore";
import { getToastsProvider } from "@/plugins/toasts";

type UseMovingItemsOptions = {
  projectId: Ref<string | null>;
};

export const useMovingItems = (options: UseMovingItemsOptions) => {
  const store = useStore();
  const openProjects = computed(() => store.state.application.openProjects);

  const pathToItemId = computed(() => store.getters["spaces/pathToItemId"]);
  const activeSpacePath = computed(() => {
    return store.state.spaces.projectPath[options.projectId.value ?? ""];
  });

  const $toast = getToastsProvider();

  const onMoveItems = async ({
    sourceItems,
    targetItem,
    isCopy = false,
    onComplete,
  }: {
    sourceItems: string[];
    targetItem: string;
    onComplete: (success: boolean) => void;
    isCopy?: boolean;
  }) => {
    const openedWorkflows = openProjects.value.filter((project) =>
      sourceItems.includes(project?.origin?.itemId ?? ""),
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
          usageContext: "MOVE",
        });

    if (collisionStrategy === "CANCEL") {
      onComplete(false);

      return;
    }

    try {
      // remove ghosts regardless of sucess criteria. yields better results on slow operations
      // which will show a loading overlay anyway after a certain time threshold
      onComplete(true);

      await store.dispatch("spaces/moveOrCopyItems", {
        itemIds: sourceItems,
        projectId: options.projectId.value,
        destWorkflowGroupItemId,
        collisionStrategy,
        isCopy,
      });
    } catch (error) {
      const copyOrMove = isCopy ? "copying" : "moving";
      consola.error(`There was a problem ${copyOrMove} the items`, { error });

      $toast.show({
        type: "error",
        headline: "There was a problem moving your files",
        message: (error as any).message,
      });
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
