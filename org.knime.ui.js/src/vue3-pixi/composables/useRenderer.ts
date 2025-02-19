import type { Application, Renderer } from "pixi.js";
import type { Ref } from "vue";
import { computed, unref } from "vue";

import { useApplication } from "./useApplication";

export function useRenderer(app?: Ref<Application>): Ref<Renderer> {
  const useApp = app || useApplication();
  return computed(() => unref(useApp)?.renderer);
}
