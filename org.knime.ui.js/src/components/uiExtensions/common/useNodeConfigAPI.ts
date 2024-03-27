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
const __latestPublishedData = ref<Record<string, unknown> | null>(null);
let __pushEventDispatcher: UIExtensionPushEventDispatcher = () => {};

const unwrappedPromise = ref<UnwrappedPromise<boolean>>(
  createUnwrappedPromise<boolean>(),
);

/**
 * Composable used to synchronize / manage the shared state and methods
 * required to interact with the "active" node configuration (the one displayed on the right panel).
 * This composable will provide the necessary methods and state needed to make specific operations
 * such as reading the dirty state, the published config data and applying settings
 */
export const useNodeConfigAPI = () => {
  const setEventDispatcher = (dispatcher: UIExtensionPushEventDispatcher) => {
    __pushEventDispatcher = dispatcher;
  };

  const setLatestPublishedData = (data: Record<string, unknown> | null) => {
    __latestPublishedData.value = data;
  };

  const setDirtyState = (state: APILayerDirtyState) => {
    __dirtyState.value = { ...state };
  };

  const dispatchApplySettings = () => {
    __pushEventDispatcher<UIExtensionPushEvents.EventTypes.ApplyDataEvent>({
      eventType: UIExtensionPushEvents.EventTypes.ApplyDataEvent,
    });

    return unwrappedPromise.value.promise;
  };

  /**
   * Sets the result of the latest `applySettings` call. Calling this function
   * will essentially resolve the promise returned by `applySettings`
   * @param isApplied
   */
  const setApplyComplete = (isApplied: boolean) => {
    unwrappedPromise.value.resolve(isApplied);
    unwrappedPromise.value = createUnwrappedPromise();
  };

  const store = useStore();

  /**
   * Attempts to apply the changes to the node config of the given node (by id), and optionally
   * execute the node afterwards. Returns a promise which will resolve once the configuration
   * changes have been applied (when the api layer calls `setApplyComplete` in this composable)
   * @param nodeId
   * @param execute
   */
  const applySettings = async (nodeId: string, execute = false) => {
    const isApplied = await dispatchApplySettings();

    if (isApplied && execute) {
      store.dispatch("workflow/executeNodes", [nodeId]);
    }
  };

  /**
   * Discard the changes made to the node configuration by resetting the dirty state back to CLEAN
   */
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

    lastestPublishedData: computed(() => __latestPublishedData.value),

    dirtyState: computed(() => __dirtyState.value),
  };
};
