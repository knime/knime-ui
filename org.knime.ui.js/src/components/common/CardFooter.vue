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
    padding: 0 30px 20px;
    display: flex;
    align-items: center;
    margin-top: auto;

    & .icon {
      display: flex;
      align-items: center;
      margin-right: 12px;

      & :slotted(svg) {
        stroke: var(--knime-masala);
        margin-right: 6px;

        @mixin svg-icon-size 20;
      }
    }

    & .avatar {
      margin-left: auto;
    }
  }
}
</style>
