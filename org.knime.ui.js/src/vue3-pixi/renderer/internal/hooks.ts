/* eslint-disable @typescript-eslint/ban-ts-comment */
import { renderers } from "./constants";
import type { Renderer, RendererOptions } from "./types";

export function baseUse(options: RendererOptions) {
  const { createElement: _createElement, name } = options;
  function createElement(...args: any) {
    // @ts-expect-error (please add error description)
    const element = _createElement(...args);
    element._vp_name = name;
    return element;
  }
  options.createElement = createElement;
  renderers[name] = options;
}

export function use(options: Renderer) {
  if (Array.isArray(options)) {
    options.forEach(baseUse);
  } else {
    baseUse(options);
  }
}
