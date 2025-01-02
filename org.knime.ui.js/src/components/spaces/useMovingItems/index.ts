import { type Ref } from "vue";
import { h } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";

import { useApplicationStore } from "@/store/application/application";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { getToastPresets } from "@/toastPresets";

import MovingItemsTemplate from "./MovingItemsTemplate.vue";

type UseMovingItemsOptions = {
  projectId: Ref<string | null>;
};

const createModalTemplate = (
  props: InstanceType<typeof MovingItemsTemplate>["$props"],
) => h(MovingItemsTemplate, { ...props });

export const useMovingItems = (options: UseMovingItemsOptions) => {
  const { openProjects } = storeToRefs(useApplicationStore());
  const { projectPath } = storeToRefs(useSpaceCachingStore());
  const { pathToItemId } = storeToRefs(useSpaceOperationsStore());
  const { moveOrCopyItems } = useSpaceOperationsStore();

  const activeSpacePath = projectPath.value[options.projectId.value ?? ""];

  const { toastPresets } = getToastPresets();

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

      toastPresets.spaces.crud.moveOrCopyOpenItemsWarning({
        isCopy,
        component: createModalTemplate({
          isCopy,
          openedItemNames: openedWorkflowsNames.concat(isInsideFolderNames),
        }),
      });

      onComplete(false);

      return;
    }

    const destWorkflowGroupItemId = pathToItemId.value(
      options.projectId.value ?? "",
      targetItem,
    );

    // if we copy into the current workflow group, we actually "duplicate"
    // and hence always want to auto rename without bothering the user with a dialog
    const isDuplicate = isCopy && targetItem === ".";
    const collisionStrategy = isDuplicate
      ? "AUTORENAME"
      : (await API.desktop.getNameCollisionStrategy({
          spaceProviderId: activeSpacePath?.spaceProviderId,
          spaceId: activeSpacePath?.spaceId,
          itemIds: sourceItems,
          destinationItemId: destWorkflowGroupItemId ?? "",
          usageContext: "MOVE",
        }))!;

    if (collisionStrategy === "CANCEL") {
      onComplete(false);

      return;
    }

    try {
      // remove ghosts regardless of success criteria. yields better results on slow operations
      // which will show a loading overlay anyway after a certain time threshold
      onComplete(true);

      await moveOrCopyItems({
        itemIds: sourceItems,
        projectId: options.projectId.value ?? "",
        destWorkflowGroupItemId: destWorkflowGroupItemId ?? "",
        collisionStrategy,
        isCopy,
      });
    } catch (error) {
      const copyOrMove = isCopy ? "copying" : "moving";
      consola.error(`There was a problem ${copyOrMove} the items`, { error });

      if (isCopy) {
        toastPresets.spaces.crud.copyItemsFailed({ error });
      } else {
        toastPresets.spaces.crud.moveItemsFailed({ error });
      }
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
