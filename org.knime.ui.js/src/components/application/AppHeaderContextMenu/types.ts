import type { MenuItem } from "@knime/components";

export type AppHeaderContextMenuItem = MenuItem & {
  metadata?: { onClick: () => void };
};
