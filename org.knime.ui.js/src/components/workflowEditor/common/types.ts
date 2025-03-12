import type { FunctionalComponent } from "vue";
import type { GraphicsContext } from "pixi.js";

export type Action = {
  icon: GraphicsContext | FunctionalComponent<any, any>;
  onClick: () => void;
  title?: (action?: Action) => string | string;
  disabled?: boolean;
  primary?: boolean;
};

export interface TooltipDefinition {
  position: {
    x: number;
    y: number;
  };
  gap: number;
  anchorPoint: { x: number; y: number };
  text: string;
  title?: string;
  issue?: string;
  resolutions?: string[];
  type?: "error" | "warning" | "default";
  orientation?: "top" | "bottom";
  hoverable?: boolean;
}
