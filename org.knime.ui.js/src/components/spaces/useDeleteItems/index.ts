import { h, markRaw } from "vue";
import { useRouter } from "vue-router";

import type { FileExplorerItem } from "@knime/components";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useStore } from "@/composables/useStore";

import DeleteItemTemplate from "./DeleteItemTemplate.vue";

type TemplateComponentProps = InstanceType<typeof DeleteItemTemplate>["$props"];

const createModalTemplate = (props: TemplateComponentProps) =>
  h(DeleteItemTemplate, { ...props });

type UseDeleteItemsOptions = {
  projectId: string;
  itemIconRenderer: TemplateComponentProps["itemIconRenderer"];
};

export const useDeleteItems = (options: UseDeleteItemsOptions) => {
  const store = useStore();
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
    const { confirmed } = await askConfirmation(items);

    if (confirmed) {
      const itemIds = items.map(({ id }) => id);

      await store.dispatch("spaces/deleteItems", {
        projectId: options.projectId,
        itemIds,
        $router,
      });
    }
  };

  return { onDeleteItems };
};
