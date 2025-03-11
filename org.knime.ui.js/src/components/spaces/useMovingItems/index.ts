import { type Ref } from "vue";
import { storeToRefs } from "pinia";

import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { checkOpenWorkflowsBeforeMove } from "@/store/spaces/util";
import { getToastPresets } from "@/toastPresets";

type UseMovingItemsOptions = {
  projectId: Ref<string | null>;
};

export const useMovingItems = (options: UseMovingItemsOptions) => {
  const { pathToItemId } = storeToRefs(useSpaceOperationsStore());
  const { moveOrCopyItems } = useSpaceOperationsStore();

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
    if (checkOpenWorkflowsBeforeMove({ itemIds: sourceItems, isCopy })) {
      // can't move workflows that are currently open
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

    try {
      // remove ghosts regardless of success criteria. yields better results on slow operations
      // which will show a loading overlay anyway after a certain time threshold
      onComplete(true);

      await moveOrCopyItems({
        itemIds: sourceItems,
        projectId: options.projectId.value ?? "",
        destWorkflowGroupItemId: destWorkflowGroupItemId ?? "",
        ...(isDuplicate && { collisionHandling: "AUTORENAME" }),
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
