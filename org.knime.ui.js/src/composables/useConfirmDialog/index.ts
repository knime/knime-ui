import { type VNode, computed, ref } from "vue";

import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

type ConfirmationButton = {
  type: "confirm";
  label: string;
  flushRight?: boolean;
  customHandler?: (actions: { confirm: () => void }) => void;
};

type CancellationButton = {
  type: "cancel";
  label: string;
  flushRight?: boolean;
  customHandler?: (actions: { cancel: () => void }) => void;
};

export type ConfirmDialogButton = ConfirmationButton | CancellationButton;

type CommonConfig = {
  /**
   * Dialog title
   */
  title: string;
  /**
   * Icon shown in the title bar of the dialog. Defaults to no icon used
   */
  titleIcon?: any;
  /**
   * Whether pressing the "Esc" key dismisses the dialog. Defaults to (false)
   */
  implicitDismiss?: boolean;
  /**
   * A list of buttons to control the dialog. Buttons belong to 2 categories:
   * - confirmation -> positive result out from the dialog
   * - cancellation -> negative result out from the dialog
   */
  buttons?: Array<ConfirmDialogButton>;
};

export type PropertyBasedConfig = CommonConfig & {
  /**
   * The message displayed in the dialog body
   */
  message: string;
  /**
   * The text to be rendered for the "do not ask again" checkbox option. The checkbox
   * will only be present when a text is supplied. The value will be returned on the dialog result.
   * Defaults to empty string
   */
  doNotAskAgainText?: string;
};

export type ComponentBasedConfig = CommonConfig & {
  /**
   * A component (supplied as Vue vnode instance) to be used as the template
   * for the dialog body
   */
  component: VNode;
};

type ModalConfig = PropertyBasedConfig | ComponentBasedConfig;

const defaultButtons: [ConfirmDialogButton, ConfirmDialogButton] = [
  { type: "cancel", label: "No" },
  { type: "confirm", label: "Yes", flushRight: true },
];

type ConfirmResult = { confirmed: boolean; doNotAskAgain?: boolean };

const isActive = ref(false);
const activeModalConfig = ref<ModalConfig | null>(null);
const unwrappedPromise = ref(createUnwrappedPromise<ConfirmResult>());

export const isComponentBasedConfig = (
  config: ModalConfig,
): config is ComponentBasedConfig => {
  return "component" in config;
};

export const useConfirmDialog = () => {
  // function overload to support 2 distinct configurations
  function show(config: PropertyBasedConfig): Promise<ConfirmResult>;

  // function overload to support 2 distinct configurations
  // eslint-disable-next-line no-redeclare
  function show(config: ComponentBasedConfig): Promise<ConfirmResult>;

  // eslint-disable-next-line func-style, no-redeclare
  function show(config: ModalConfig): Promise<ConfirmResult> {
    activeModalConfig.value = { buttons: defaultButtons, ...config };
    isActive.value = true;
    return unwrappedPromise.value.promise;
  }

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
