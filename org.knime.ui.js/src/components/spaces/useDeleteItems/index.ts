import { type Ref, h, markRaw } from "vue";
import { useRouter } from "vue-router";

import type { FileExplorerItem } from "@knime/components";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { isBrowser } from "@/environment";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { getToastPresets } from "@/toastPresets";

import DeleteItemTemplate from "./DeleteItemTemplate.vue";

type TemplateComponentProps = InstanceType<typeof DeleteItemTemplate>["$props"];

const createModalTemplate = (props: TemplateComponentProps) =>
  h(DeleteItemTemplate, { ...props });

type UseDeleteItemsOptions = {
  projectId: Ref<string>;
  itemIconRenderer: TemplateComponentProps["itemIconRenderer"];
};

export const useDeleteItems = (options: UseDeleteItemsOptions) => {
  const { deleteItems } = useSpaceOperationsStore();
  const $router = useRouter();

  const { itemIconRenderer } = options;

  const askConfirmation = (items: FileExplorerItem[]) => {
    const { show: showConfirmDialog } = useConfirmDialog();

    return showConfirmDialog({
      title: "Delete",
      titleIcon: markRaw(TrashIcon),

      component: createModalTemplate({
        items,
        itemIconRenderer,
      }),

      buttons: [
        {
          label: "Cancel",
          type: "cancel",
        },
        {
          label: "Ok",
          type: "confirm",
          flushRight: true,
        },
      ],
    });
  };

  const onDeleteItems = async (items: FileExplorerItem[]) => {
    // TODO NXT-3468 when Desktop and Browser are in sync confirmation should no longer be needed
    // as there won't be any hard deletes
    const isBrowserOrConfirmed =
      isBrowser || (await askConfirmation(items)).confirmed;

    if (isBrowserOrConfirmed) {
      const itemIds = items.map(({ id }) => id);

      try {
        await deleteItems({
          projectId: options.projectId.value,
          itemIds,
          $router,
        });
      } catch (error) {
        const { toastPresets } = getToastPresets();
        toastPresets.spaces.crud.deleteItemsFailed({ error });
      }
    }
  };

  return { onDeleteItems };
};
