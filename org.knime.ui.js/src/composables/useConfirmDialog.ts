import { computed, ref } from "vue";

import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

export type ConfirmDialogButton = {
  type: "confirm" | "cancel";
  label: string;
  flushRight?: boolean;
  customHandler?: (actions: {
    confirm: () => void;
    cancel: () => void;
  }) => void;
};

type ModalConfig = {
  title: string;
  message: string;
  doNotAskAgainText?: string;
  buttons?: Array<ConfirmDialogButton>;
};

const defaultButtons: [ConfirmDialogButton, ConfirmDialogButton] = [
  { type: "cancel", label: "No" },
  { type: "confirm", label: "Yes", flushRight: true },
];

type ConfirmResult = { confirmed: boolean; doNotAskAgain?: boolean };

const isActive = ref(false);
const activeModalConfig = ref<ModalConfig | null>(null);
const unwrappedPromise = ref(createUnwrappedPromise<ConfirmResult>());

export const useConfirmDialog = () => {
  const show = (config: ModalConfig): Promise<ConfirmResult> => {
    activeModalConfig.value = { buttons: defaultButtons, ...config };
    isActive.value = true;
    return unwrappedPromise.value.promise;
  };

  const close = () => {
    isActive.value = false;
    activeModalConfig.value = null;
    unwrappedPromise.value = createUnwrappedPromise();
  };

  const confirm = (doNotAskAgain = false) => {
    unwrappedPromise.value.resolve({
      confirmed: true,
      doNotAskAgain,
    });
    close();
  };

  const cancel = () => {
    unwrappedPromise.value.resolve({ confirmed: false });
    close();
  };

  return {
    show,
    confirm,
    cancel,
    config: computed(() => activeModalConfig.value),
    isActive: computed(() => isActive.value),
    dialogResult: computed(() => unwrappedPromise.value.promise),
  };
};
