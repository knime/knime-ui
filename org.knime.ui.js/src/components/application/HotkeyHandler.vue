<script lang="ts">
import { isUIExtensionFocused } from "@/components/uiExtensions";
import { isInputElement } from "@/lib/dom";

/**
 * This Component handles keyboard shortcuts by listening to keydown/up-Events
 * on document and dispatching the corresponding shortcut handler.
 */
export default {
  mounted() {
    // Start Key Listener
    document.addEventListener("keydown", this.onKeydown);
  },
  beforeUnmount() {
    // Stop Key listener
    document.removeEventListener("keydown", this.onKeydown);
  },
  methods: {
    onKeydown(e: KeyboardEvent) {
      // Pressed key is just a modifier
      if (
        e.key === "Control" ||
        e.key === "Shift" ||
        e.key === "Meta" ||
        e.key === "Alt" ||
        e.key === "Escape"
      ) {
        return;
      }

      if (isUIExtensionFocused()) {
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

      // 1. Not an input - just return list of shortcuts
      // 2. Input without data attr - return empty list
      // 3. Input with data attr - return list of shortcuts that match the data attr
      const allowedShortcuts = (() => {
        const target = e.target as HTMLElement;

        if (!e.target || !isInputElement(target)) {
          return shortcuts;
        }

        const allowlist = new Set(
          target.dataset.allowShortcuts?.split(",") ?? [],
        );

        consola.debug(
          "List of allowed shortcuts from input element: ",
          allowlist,
        );

        return shortcuts.filter((shortcut) => allowlist.has(shortcut));
      })();

      for (const shortcut of allowedShortcuts) {
        const isEnabled = this.$shortcuts.isEnabled(shortcut);
        if (isEnabled) {
          this.$shortcuts.dispatch(shortcut, { event: e, src: "global" });
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
