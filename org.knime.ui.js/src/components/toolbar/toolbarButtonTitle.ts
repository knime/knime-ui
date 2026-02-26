import type { FormattedShortcut } from "@/services/shortcuts";

export const toolbarButtonTitle = (shortcut: FormattedShortcut) => {
  const { title, hotkeyText } = shortcut;
  return [title, hotkeyText].filter(Boolean).join(" – ");
};
