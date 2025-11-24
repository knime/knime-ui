import type { ParticleContainer, ParticleContainerOptions } from "pixi.js";
import type { ComponentOptionsMixin, DefineComponent, VNodeProps } from "vue";

import type { PixiEvents } from "./events";
import type { AllowedPixiProps } from "./props";

export interface ParticleContainerProps {
  options: ParticleContainerOptions;
}

export interface ParticleContainerEvents extends PixiEvents {
  render: [ParticleContainer];
}

export type ParticleContainer = ParticleContainer & EventTarget;

export type ParticleContainerComponent = DefineComponent<
  ParticleContainerProps,
  {},
  unknown,
  {},
  {},
  ComponentOptionsMixin,
  ComponentOptionsMixin,
  (keyof ParticleContainerEvents)[],
  keyof ParticleContainerEvents,
  VNodeProps & AllowedPixiProps,
  Readonly<ParticleContainerProps> & {
    [key in keyof ParticleContainerEvents as `on${Capitalize<key>}`]?:
      | ((...args: ParticleContainerEvents[key]) => any)
      | undefined;
  },
  {}
>;
