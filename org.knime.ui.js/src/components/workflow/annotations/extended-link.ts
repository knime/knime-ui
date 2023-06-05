import { Plugin, PluginKey } from "@tiptap/pm/state";
import { getAttributes } from "@tiptap/core";
import Link from "@tiptap/extension-link";

/**
 * This is a workaround to support link open on Control + Click.
 *
 * It comes from https://github.com/ueberdosis/tiptap/issues/3389#issuecomment-1422608677 originally.
 */
export const ControlClickLink = Link.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
    };
  },
  addProseMirrorPlugins() {
    const plugins: Plugin[] = this.parent?.() || [];

    const ctrlClickHandler = new Plugin({
      key: new PluginKey("handleControlClick"),
      props: {
        handleClick(view, pos, event) {
          const attrs = getAttributes(view.state, "link");
          const link = (event.target as HTMLElement)?.closest("a");

          const keyPressed = event.ctrlKey || event.metaKey;

          if (keyPressed && link && attrs.href) {
            window.open(attrs.href, attrs.target);

            return true;
          }

          return false;
        },
      },
    });

    plugins.push(ctrlClickHandler);

    return plugins;
  },
});
