<script>
import { useEscapeStack } from "@/composables/useEscapeStack";
import { isInputElement } from "@/util/isInputElement";
import { isUIExtensionFocused } from "@/components/uiExtensions";

/**
 * This Component handles keyboard shortcuts by listening to keydown/up-Events
 * on document and dispatching the corresponding shortcut handler.
 */
export default {
  setup() {
    const { escapePressed } = useEscapeStack();
    return { escapePressed };
  },
  mounted() {
    // Start Key Listener
    document.addEventListener("keydown", this.onKeydown);
  },
  beforeUnmount() {
    // Stop Key listener
    document.removeEventListener("keydown", this.onKeydown);
  },
  methods: {
    preventShortcuts(e) {
      if (isUIExtensionFocused()) {
        return true;
      }

      if (isInputElement(e.target)) {
        // allow shortcuts when output-port tabs (<input type="radio">) are selected
        const isOutputPortTabbar =
          e.target?.attributes.getNamedItem("name")?.value === "output-port";
        return !isOutputPortTabbar;
      }

      return false;
    },

    onKeydown(e) {
      // Pressed key is just a modifier
      if (e.key === "Control" || e.key === "Shift" || e.key === "Meta") {
        return;
      }

      // Close one item on the escape stack
      if (e.key === "Escape") {
        this.escapePressed();
      }

      if (this.preventShortcuts(e)) {
        return;
      }

      // Ignore repeat / hold down of keys
      if (e.repeat === true) {
        return;
      }

      // Search for all shortcuts
      let shortcuts = this.$shortcuts.findByHotkey(e);

      if (shortcuts.length === 0) {
        return;
      }

      for (const shortcut of shortcuts) {
        const isEnabled = this.$shortcuts.isEnabled(shortcut);
        if (isEnabled) {
          this.$shortcuts.dispatch(shortcut, { event: e });
        }
        // prevent default if shortcut did not allow it (like copy text via CTRL+C)
        if (isEnabled || this.$shortcuts.preventDefault(shortcut)) {
          e.preventDefault();
        }
      }

      // this is the only place where the registered hotkeys should be handled
      e.stopPropagation();
    },
  },
  render() {
    return null;
  },
};
</script>
