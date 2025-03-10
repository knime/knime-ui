import { type Ref, nextTick, onBeforeUnmount, onMounted } from "vue";
import { type MaybeElementRef, onClickOutside } from "@vueuse/core";
import { useFocusTrap } from "@vueuse/integrations/useFocusTrap.mjs";

type UseClickaway = {
  rootEl: MaybeElementRef<HTMLElement | undefined>;
  focusTrap: Ref<boolean>;
  onClickaway: () => void;
};

export const useFloatingMenuClickaway = (options: UseClickaway) => {
  const { rootEl, focusTrap } = options;
  const { activate: activateFocusTrap, deactivate: deactivateFocusTrap } =
    useFocusTrap(rootEl);

  onMounted(async () => {
    // wait once after first event loop run before registering the click outside handler,
    // to avoid closing immediately after opening
    await new Promise((r) => setTimeout(r, 0));

    onClickOutside(rootEl, () => {
      deactivateFocusTrap();
      options.onClickaway();
    });

    if (focusTrap.value) {
      await nextTick();
      activateFocusTrap();
    }
  });

  onBeforeUnmount(() => {
    deactivateFocusTrap();
  });
};
