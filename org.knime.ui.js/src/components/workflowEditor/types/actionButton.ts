import type { FunctionalComponent } from "vue";
import type { GraphicsContext } from "pixi.js";

export type ActionButtonConfig = {
  icon: GraphicsContext | FunctionalComponent<any, any>;
  onClick: () => void;
  title?: (action?: ActionButtonConfig) => string | string;
  disabled?: boolean;
  primary?: boolean;
};
