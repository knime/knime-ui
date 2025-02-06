import { type Ref, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";

import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useWorkflowStore } from "@/store/workflow/workflow";

type UseKanvasContextMenuOptions = {
  rootEl: Ref<HTMLElement>;
};

export const useKanvasContextMenu = (options: UseKanvasContextMenuOptions) => {
  const { toggleContextMenu } = useCanvasAnchoredComponentsStore();
  const { isWorkflowEmpty } = storeToRefs(useWorkflowStore());

  // handle native context menu event
  const onContextMenu = (event: MouseEvent) => {
    event.stopPropagation();
    if (
      event.target &&
      (event.target as HTMLElement).classList.contains("native-context-menu")
    ) {
      return;
    }
    // prevent native context menus to appear
    event.preventDefault();

    // trigger it for empty workflows as we don't have a pan there
    if (isWorkflowEmpty.value) {
      toggleContextMenu({ event });
    }
  };

  const preventContextMenuKey = (event: KeyboardEvent) => {
    // we prevent that key because it will issue a PointerEvent and calculate the position to the center of the
    // focused element which in our case is just the canvas and not the selected nodes. The fallback position will be
    // used if we supply a KeyboardEvent (or any Event without clientX/Y) to the toggleContextMenu.
    if (event.key === "ContextMenu") {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    const stopPreventAndToggleContextMenu = () => {
      // @ts-expect-error TODO: fix type in store
      toggleContextMenu({ event });
      event.preventDefault();
      event.stopPropagation();
    };

    // handle key with KeyboardEvent to get our fallback position (based on the selection)
    if (event.key === "ContextMenu") {
      stopPreventAndToggleContextMenu();
    }

    // Shift+F10 is used as cross platform context menu key (linux/windows support that anyway but Equo/CEF does not)
    if (event.shiftKey && event.key === "F10") {
      stopPreventAndToggleContextMenu();
    }
  };

  onMounted(() => {
    options.rootEl.value?.addEventListener("contextmenu", onContextMenu);
    options.rootEl.value?.addEventListener("keydown", onKeydown);
    options.rootEl.value?.addEventListener("keyup", preventContextMenuKey);
  });

  onUnmounted(() => {
    options.rootEl.value?.removeEventListener("contextmenu", onContextMenu);
    options.rootEl.value?.removeEventListener("keydown", onKeydown);
    options.rootEl.value?.removeEventListener("keyup", preventContextMenuKey);
  });
};
