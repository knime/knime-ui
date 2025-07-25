import type { MenuItem } from "@knime/components";

export type MenuItemWithHandler = MenuItem<{ handler?: () => void }>;
