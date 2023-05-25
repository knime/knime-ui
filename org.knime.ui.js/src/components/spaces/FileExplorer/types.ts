import type { MenuItem as BaseMenuItem } from "webapps-common/ui/components/MenuItems.vue";
import type { SpaceItem } from "@/api/gateway-api/generated-api";

export type FileExplorerItem = SpaceItem & {
  isOpen: boolean;
  canBeRenamed: boolean;
  canBeDeleted: boolean;
};

export namespace FileExplorerContextMenu {
  type DefaultOptions = "rename" | "delete";

  export type MenuItem = BaseMenuItem & {
    id: DefaultOptions | Omit<string, DefaultOptions>;
  };

  export type CreateDefaultMenuOption = (
    item: FileExplorerItem,
    customProps?: Partial<BaseMenuItem>
  ) => MenuItem;

  export type ItemClickPayload = {
    contextMenuItem: MenuItem;
    anchorItem: FileExplorerItem;
    isDelete: boolean;
    isRename: boolean;
  };
}
