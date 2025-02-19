/* eslint-disable func-style */
import type { TextureOptions } from "pixi.js";
import { Texture } from "pixi.js";

export function setTextureOptions(
  texture: Texture,
  options: TextureOptions = {},
) {
  for (const key in options) {
    texture[key] = options[key];
  }
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
