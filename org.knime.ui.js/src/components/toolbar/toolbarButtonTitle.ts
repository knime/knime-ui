import type { FormattedShortcut } from "@/shortcuts";

export const toolbarButtonTitle = (shortcut: FormattedShortcut) => {
  const { title, hotkeyText } = shortcut;
  return [title, hotkeyText].filter(Boolean).join(" – ");
};
