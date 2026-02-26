import type { ShortcutExecuteContext } from "@/services/shortcuts";

export const mockShortcutContext = ({
  $router = {},
  payload = {},
}: {
  $router?: unknown;
  payload?: unknown;
} = {}) => ({ $router, $toast: {}, payload }) as ShortcutExecuteContext;
