<script>
import { h as createElement } from "vue";

import Avatar from "./Avatar.vue";

export default {
  props: {
    avatar: {
      type: String,
      default: null,
    },
  },

  render() {
    const icons = (this.$slots.icons || []).map((vnode) =>
      createElement(vnode.tag, { class: "icon" }, vnode.children),
    );

    const footerChildren = this.avatar
      ? [
          ...icons,
          ...(this.$slots.default?.() || []),
          createElement(Avatar, { props: { text: this.avatar } }),
        ]
      : [...icons, ...(this.$slots.default?.() || [])];

    return createElement("div", { class: "card-footer" }, footerChildren);
  },
};
</script>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.card {
  & .card-footer {
    display: flex;
    align-items: center;
    padding: 0 30px 20px;
    margin-top: auto;

    & .icon {
      display: flex;
      align-items: center;
      margin-right: 12px;

      & :slotted(svg) {
        margin-right: 6px;
        stroke: var(--knime-masala);

        @mixin svg-icon-size 20;
      }
    }

    & .avatar {
      margin-left: auto;
    }
  }
}
</style>
