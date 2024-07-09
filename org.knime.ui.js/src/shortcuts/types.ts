import type { FunctionalComponent, SVGAttributes } from "vue";
import type { Router } from "vue-router";
import type { Store } from "vuex";

import type { ToastService } from "webapps-common/ui/services/toast";
import type { RootStoreState } from "@/store/types";
import type { ShortcutsRegistry } from ".";
import type { HotkeysNS } from "@knime/utils";

export type ShortcutGroups =
  | "general"
  | "panelNavigation"
  | "workflowEditorModes"
  | "execution"
  | "canvasNavigation"
  | "componentAndMetanode"
  | "selectedNode"
  | "workflowAnnotations"
  | "workflowEditor";

export type HotkeyText = { text: string };
export type Hotkeys = Array<HotkeysNS.Hotkey | HotkeyText>;

export type ShortcutExecuteContext = {
  $store: Store<RootStoreState>;
  $router: Router;
  $toast: ToastService;
  payload: { event?: Event; metadata?: any };
};

export type ShortcutConditionContext = Pick<ShortcutExecuteContext, "$store">;

export type Shortcut = {
  /**
   * Action that executes when the shortcut is triggered. Will receive a context object
   * that contains the store instance, the router instance, and optionally a MouseEvent
   * in case there's mouse action that triggers this shortcut
   * @param context
   * @returns
   */
  execute: (context: ShortcutExecuteContext) => void | Promise<any>;

  /**
   * Shortcut can only execute if the result of this function is `true`. If not provided defaults to
   * true
   * @param payload
   * @returns
   */
  condition?: (payload: ShortcutConditionContext) => boolean;

  /**
   * Key combination that triggers the shortcut.
   * It's optional because some actions can be registered as shortcuts without having a key combination
   * bound to them. The reason for this is to enable using all the registered shortcuts to dynamically
   * populate to menus, etc.
   */
  hotkey?: Hotkeys;

  /**
   * List of key combinations that also trigger the shortcut.
   */
  additionalHotkeys?: Array<{ key: Hotkeys; visible: boolean }>;

  /**
   * Text to display for the shortcut or a function that returns dynamic text based on the condition of the shortcut
   * @param payload
   */
  text?: string | ((payload: ShortcutConditionContext) => string);

  /**
   * A description that will be used for the shortcuts overview, important if the text is a function that depends on
   * some states or there is no text.
   */
  description?: string;

  /**
   * Group the shortcut for visual representation in the ShortcutOverviewDialog
   */
  group?: ShortcutGroups;

  /**
   * Tooltip to display for the shortcut (on mouse hover)
   */
  title?: string;

  /**
   * Wether to use an icon
   */
  icon?: FunctionalComponent<SVGAttributes>;

  /**
   * Determines if the shortcut will allow the default browser behavior, for example Ctrl+C -> Copy
   * By default is `false` meaning that shortcuts don't allow the default behavior and instead
   * take control to run the registered logic via the `execute` function
   */
  allowEventDefault?: boolean;
};

export type ShortcutName = keyof ShortcutsRegistry;

export type FormattedShortcut = Shortcut & {
  name: ShortcutName;
  hotkeyText?: string;
};

export type ShortcutsService = {
  isEnabled: (shortcutName: ShortcutName) => boolean;
  dispatch: (
    shortcutName: ShortcutName,
    payload?: ShortcutExecuteContext["payload"],
  ) => void;
  preventDefault: (shortcutName: ShortcutName) => boolean;
  findByHotkey: (event: KeyboardEvent) => string[];
  get: (shortcutName: ShortcutName) => FormattedShortcut;
};

export type UnionToShortcutRegistry<T extends string> = {
  [key in T]: Shortcut;
};
