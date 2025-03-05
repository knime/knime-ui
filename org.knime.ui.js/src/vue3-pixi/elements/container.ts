import type { Container, IRenderLayer } from "pixi.js";
import type { ComponentOptionsMixin, DefineComponent, VNodeProps } from "vue";

import type { PixiEvents } from "./events";
import type { AllowedPixiProps } from "./props";

export interface ContainerProps {
  layer?: IRenderLayer | null;
}

export interface ContainerEvents extends PixiEvents {
  render: [ContainerInst];
}

export type ContainerInst = Container & EventTarget;

export type ContainerComponent = DefineComponent<
  ContainerProps,
  {},
  unknown,
  {},
  {},
  ComponentOptionsMixin,
  ComponentOptionsMixin,
  (keyof ContainerEvents)[],
  keyof ContainerEvents,
  VNodeProps & AllowedPixiProps,
  Readonly<ContainerProps> & {
    [key in keyof ContainerEvents as `on${Capitalize<key>}`]?:
      | ((...args: ContainerEvents[key]) => any)
      | undefined;
  },
  {}
>;
