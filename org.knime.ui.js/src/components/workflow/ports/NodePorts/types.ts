import type { MenuItem } from "@knime/components";

export type TargetPort = {
  side: "in" | "out";
  index: number;
  snapPosition: [number, number];
  typeId: string;
  isPortPlaceholder?: boolean;
};

export type MenuItemWithPort = MenuItem & { port?: { typeId: string } };
