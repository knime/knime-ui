import type { FunctionalComponent } from "vue";
import type { GraphicsContext } from "pixi.js";

export type Action = {
  icon: GraphicsContext | FunctionalComponent<any, any>;
  onClick: () => void;
  title?: (action?: Action) => string | string;
  disabled?: boolean;
  primary?: boolean;
};
