import { type Ref, type VNode, h } from "vue";
import { useRouter } from "vue-router";

import type { FileExplorerItem } from "@knime/components";
import {
  type UseKdsConfirmDialogComponentBasedConfig,
  useKdsConfirmDialog,
} from "@knime/kds-components";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { getToastsProvider } from "@/plugins/toasts";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { getToastPresets } from "@/toastPresets";

import DeleteItemTemplate from "./DeleteItemTemplate.vue";

type TemplateComponentProps = InstanceType<typeof DeleteItemTemplate>["$props"];

const createModalTemplate = (props: TemplateComponentProps): VNode =>
  h(DeleteItemTemplate, { ...props });

type UseDeleteItemsOptions = {
  projectId: Ref<string>;
  itemIconRenderer: TemplateComponentProps["itemIconRenderer"];
};

export const useDeleteItems = (options: UseDeleteItemsOptions) => {
  const { deleteItems, getDeletionInfo } = useSpaceOperationsStore();
  const { getProviderInfoFromProjectPath, getRecycleBinUrl } =
    useSpaceProvidersStore();
  const $router = useRouter();

  const { itemIconRenderer } = options;

  const askConfirmation = (items: FileExplorerItem[]) => {
    const { show: showConfirmDialog } = useKdsConfirmDialog();

    return showConfirmDialog({
      title: "Delete",
      icon: "trash",

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
        },
      ],
    } as UseKdsConfirmDialogComponentBasedConfig);
  };

  const onDeleteItems = async (items: FileExplorerItem[]) => {
    const spaceProvider = getProviderInfoFromProjectPath(
      options.projectId.value,
    );
    const { canSoftDelete, groupName } = getDeletionInfo(
      options.projectId.value,
    );

    const canProceed =
      canSoftDelete || (await askConfirmation(items)).confirmed;
    if (!canProceed) {
      return;
    }

    const itemIds = items.map(({ id }) => id);
    try {
      await deleteItems({
        projectId: options.projectId.value,
        itemIds,
        $router,
      });

      // Show success toast when soft delete was used
      if (canSoftDelete) {
        const $toast = getToastsProvider();
        const itemCount = itemIds.length;
        const headline = `Item${
          itemCount > 1 ? "(s)" : ""
        } moved to the recycle bin`;
        $toast.show({
          type: "success",
          headline,
          autoRemove: true,
          buttons: [
            {
              icon: TrashIcon,
              text: "Show recycle bin",
              callback: () => {
                const url = getRecycleBinUrl(spaceProvider!.id, groupName!);
                if (url) {
                  window.open(url);
                }
              },
            },
          ],
        });
      }
    } catch (error) {
      const { toastPresets } = getToastPresets();
      toastPresets.spaces.crud.deleteItemsFailed({ error });
    }
  };

  return { onDeleteItems };
};
