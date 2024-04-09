// TODO: NXT-2560 unify via WAC with scripting editor
import { onMounted, onUnmounted, ref } from "vue";

const defaultFocusKeys = [
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  " ",
  "Enter",
];

/*
 * Composable that returns whether focus is done by keyboard. It turn focus
 * on when the document is navigated using key presses of keys that are defined in `focusKeys`, and off again
 * when the document is clicked (`mousedown`).
 */
const useKeyboardFocus = (focusKeys: Array<string> = defaultFocusKeys) => {
  const hasKeyboardFocus = ref<boolean>(false);

  const turnKeyboardFocusOn = (event: KeyboardEvent) => {
    if (focusKeys.includes(event.key)) {
      hasKeyboardFocus.value = true;
    }
  };

  const turnKeyboardFocusOff = () => {
    hasKeyboardFocus.value = false;
  };

  onMounted(() => {
    document.addEventListener("keydown", turnKeyboardFocusOn);
    document.addEventListener("mousedown", turnKeyboardFocusOff);
  });

  onUnmounted(() => {
    // Clean up - remove event listeners and stored data
    document.removeEventListener("keydown", turnKeyboardFocusOn);
    document.removeEventListener("mousedown", turnKeyboardFocusOff);
  });

  return hasKeyboardFocus;
};

export default useKeyboardFocus;
