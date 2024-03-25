import { computed, ref } from "vue";

import type { UIExtensionPushEventDispatcher } from "./types";
import {
  ApplyState,
  type APILayerDirtyState,
  ViewState,
  UIExtensionPushEvents,
} from "@knime/ui-extension-service";
import { useStore } from "@/composables/useStore";

type UnwrappedPromise<T = any> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  promise: Promise<T>;
};
const createUnwrappedPromise = <T>(): UnwrappedPromise<T> => {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  let reject: (reason?: any) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
};

const __dirtyState = ref<APILayerDirtyState>({
  apply: ApplyState.CLEAN,
  view: ViewState.CLEAN,
});
const __latestPublishedData = ref<unknown | null>(null);
const __pushEventDispatcher = ref<UIExtensionPushEventDispatcher>(() => {});

const unwrappedPromise = ref<UnwrappedPromise<boolean>>(
  createUnwrappedPromise<boolean>(),
);

export const useNodeDialogInteraction = (uniqueNodeId: string) => {
  const setEventDispatcher = (dispatcher: UIExtensionPushEventDispatcher) => {
    __pushEventDispatcher.value = dispatcher;
  };

  const setLatestPublishedData = (data: unknown) => {
    __latestPublishedData.value = data;
  };

  const setDirtyState = (state: APILayerDirtyState) => {
    __dirtyState.value = { ...state };
  };

  const dispatchApplySettings = () => {
    __pushEventDispatcher.value<UIExtensionPushEvents.EventTypes.ApplyDataEvent>(
      {
        eventType: UIExtensionPushEvents.EventTypes.ApplyDataEvent,
      },
    );

    return unwrappedPromise.value.promise;
  };

  const setApplyComplete = (isApplied: boolean) => {
    unwrappedPromise.value.resolve(isApplied);
    unwrappedPromise.value = createUnwrappedPromise();
  };

  const store = useStore();

  const applySettings = async (nodeId: string, execute = false) => {
    const isApplied = await dispatchApplySettings();

    if (isApplied && execute) {
      store.dispatch("workflow/executeNodes", [nodeId]);
    }
  };

  const discardSettings = () => {
    setDirtyState({
      apply: ApplyState.CLEAN,
      view: ViewState.CLEAN,
    });
  };

  return {
    setEventDispatcher,
    setLatestPublishedData,
    setDirtyState,

    applySettings,
    discardSettings,

    setApplyComplete,

    lastestPublishedData: computed(() => ({
      source: uniqueNodeId,
      payload: __latestPublishedData,
    })),

    dirtyState: computed(() => ({
      source: uniqueNodeId,
      payload: __dirtyState.value,
    })),
  };
};
