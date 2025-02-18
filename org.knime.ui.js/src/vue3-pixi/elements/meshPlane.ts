import type * as PIXI from "pixi.js";
import type {
  ComponentOptionsMixin,
  DefineComponent,
  VNodeProps,
} from "vue-demi";

import type { PixiEvents } from "./events";
import type { AllowedPixiProps } from "./props";

export interface MeshPlaneProps {
  texture: string | PIXI.Texture;
  points: PIXI.Point[];

  shader?: PIXI.Shader;
  blendMode?: PIXI.BLEND_MODES;
  drawMode?: PIXI.Topology;
  material?: PIXI.Shader;
  roundPixels?: boolean;
  size?: number;
  start?: number;
  state?: PIXI.State;

  tint?: PIXI.ColorSource;
  autoResize?: boolean;
}

export interface MeshPlaneEvents extends PixiEvents {
  render: [MeshPlaneInst];
}

export type MeshPlaneInst = PIXI.MeshPlane & EventTarget;

export type MeshPlaneComponent = DefineComponent<
  MeshPlaneProps,
  {},
  unknown,
  {},
  {},
  ComponentOptionsMixin,
  ComponentOptionsMixin,
  (keyof MeshPlaneEvents)[],
  keyof MeshPlaneEvents,
  VNodeProps & AllowedPixiProps,
  Readonly<MeshPlaneProps> & {
    [key in keyof MeshPlaneEvents as `on${Capitalize<key>}`]?:
      | ((...args: MeshPlaneEvents[key]) => any)
      | undefined;
  },
  {}
>;
