import type { InjectionKey, Ref, ShallowRef } from "vue";
import type { JumpMark } from "./useDialogJumpMarks";

/**
 * Context provided by NodeConfigFloatingPanel and injected by NodeConfigWrapper.
 *
 * The parent (floating panel) creates reactive containers and provides them.
 * The child (wrapper) fills them once the UIExtension shadow DOM is ready.
 * This allows the floating panel to render jump marks OUTSIDE the dialog panel.
 */
export interface DialogJumpMarksContext {
  /** Reactive list of discovered sections — written by NodeConfigWrapper. */
  sections: Ref<JumpMark[]>;
  /** Index of the currently active section (tabs mode / last-clicked). */
  activeSection: Ref<number | null>;
  /** Whether the dialog has a `.advanced-options` toggle element. */
  hasAdvancedOptions: Ref<boolean>;
  /**
   * Callback registered by NodeConfigWrapper that activates a section.
   * The floating panel calls this when a jump mark button is clicked.
   */
  activateFn: ShallowRef<((index: number) => void) | null>;
}

export const DIALOG_JUMP_MARKS_KEY: InjectionKey<DialogJumpMarksContext> =
  Symbol("dialogJumpMarks");
