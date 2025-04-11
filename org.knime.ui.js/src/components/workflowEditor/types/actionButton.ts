import type { FunctionalComponent } from "vue";
import type { GraphicsContext } from "pixi.js";

export type ActionButtonConfig = {
  icon: GraphicsContext | FunctionalComponent<any, any>;
  onClick: () => void;
  title?: string | ((action?: ActionButtonConfig) => string);
  disabled?: boolean;
  primary?: boolean;
};
