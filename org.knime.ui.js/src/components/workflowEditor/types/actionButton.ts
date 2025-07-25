import type { Component } from "vue";
import type { GraphicsContext } from "pixi.js";

export type ActionButtonConfig = {
  icon: GraphicsContext | Component;
  onClick: () => void;
  title?: string | ((action?: ActionButtonConfig) => string);
  disabled?: boolean;
  primary?: boolean;
  testId: string;
};
