import type { MenuItem } from "@knime/components";

export type MenuItemWithHandler = MenuItem<{
  id?: string;
  handler?: () => void;
}>;
