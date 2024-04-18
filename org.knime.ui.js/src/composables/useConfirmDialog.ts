import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
import { computed, ref } from "vue";

type ModalConfig = {
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  dontAskAgainText?: string;
};

type ConfirmResult = { confirmed: boolean; dontAskAgain?: boolean };

const isActive = ref(false);
const activeModalConfig = ref<ModalConfig | null>(null);
const unwrappedPromise = ref(createUnwrappedPromise<ConfirmResult>());

export const useConfirmModal = () => {
  const show = (config: ModalConfig): Promise<ConfirmResult> => {
    activeModalConfig.value = config;
    isActive.value = true;
    return unwrappedPromise.value.promise;
  };

  const close = () => {
    isActive.value = false;
    activeModalConfig.value = null;
    unwrappedPromise.value = createUnwrappedPromise();
  };

  const confirm = (dontAskAgain = false) => {
    unwrappedPromise.value.resolve({ confirmed: true, dontAskAgain });
    close();
  };

  const cancel = () => {
    unwrappedPromise.value.resolve({ confirmed: false });
    close();
  };

  const state = computed(() => ({
    isActive: isActive.value,
    config: activeModalConfig.value,
  }));

  return {
    show,
    confirm,
    cancel,
    state,
    isActive: computed(() => state.value.isActive),
    active: unwrappedPromise.value.promise,
  };
};
