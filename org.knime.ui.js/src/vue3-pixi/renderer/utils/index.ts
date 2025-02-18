/* eslint-disable func-style */
import type { TextureOptions } from "pixi.js";
import { Texture } from "pixi.js";

export function setTextureOptions(
  texture: Texture,
  options: TextureOptions = {},
) {
  // @ts-expect-error key access is not defined in the type
  for (const key in options) {
    texture.baseTexture[key] = options[key];
  }
  // maybe: texture[key] = options[key]
}

export function normalizeTexture(value: Texture | string): Texture {
  // TODO: Load that texture if its a url?
  if (typeof value === "string") {
    return Texture.from(value);
  }
  return value;
}

export function isOn(props?: any) {
  return Object.keys(props || {}).some((p) => p.startsWith("on"));
}
