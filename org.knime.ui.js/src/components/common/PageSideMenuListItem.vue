<script>
import ArrowRight from 'webapps-common/ui/assets/img/icons/arrow-right.svg';

export default {
    components: {
        ArrowRight
    },
    props: {
        item: {
            type: Object,
            default: () => {}
        }
    },
    computed: {
        currentRoute() {
            return this.$route.path;
        },
        isItemActive() {
            return this.item.route === this.currentRoute;
        },
        itemRoute() {
            return this.item.route || this.item.children?.[0].route;
        },
        hasChildren() {
            return Boolean(this.item.children);
        }
    }

};
</script>

<template>
  <li
    :class="{active: isItemActive, disabled: item.disabled, 'has-children': hasChildren}"
    :title="item.tooltip ? item.tooltip : null"
  >
    <Component
      :is="item.disabled ? 'span' : 'router-link'"
      :to="itemRoute"
    >
      <span>
        <Component
          :is="item.icon"
          class="item-icon"
        />
        <ArrowRight
          v-if="hasChildren"
          class="arrow-icon"
        />
        {{ item.text }}
      </span>
    </Component>
  </li>
</template>

<style lang="postcss" scoped>
li > * {
  color: var(--knime-dove-gray);
  text-decoration: none;
  font-weight: 500;

  & svg {
    stroke-width: calc(32px / 18);
    width: 18px;
    height: 18px;
    stroke: var(--knime-dove-gray);
  }

  & svg.arrow-icon {
    display: none;
  }
}

li.active {
  border-top: 3px solid var(--knime-masala);

  & > * {
    color: var(--knime-masala);

    & svg {
      stroke: var(--knime-masala);
    }
  }
}

li.disabled > * {
  color: var(--knime-silver-sand);

  & svg {
    stroke: var(--knime-silver-sand);
  }
}

li:not(.disabled, .active):hover {
  & > * {
    color: var(--knime-masala);

    & svg {
      stroke: var(--knime-masala);
    }
  }

  &.has-children {
    & svg.item-icon {
      display: none;
    }

    & svg.arrow-icon {
      display: block;
    }
  }
}

/* vertical mode */
@media only screen and (min-width: 901px) {
  li {
    border-top: 1px solid var(--knime-silver-sand);
    padding-top: 2px;

    &.active {
      padding-top: 0;
    }

    & > * {
      padding: 7px 0 20px;
      display: block;

      & svg {
        float: right;
      }
    }
  }
}

/* horizontal mode fixed on screen bottom */
@media only screen and (max-width: 900px) {
  li {
    padding-top: 13px;
    border-top: 1px solid var(--knime-silver-sand);

    & > * {
      font-size: 12px;
      line-height: 18px;

      & svg {
        display: block;
        margin: 0 auto;
      }
    }

    &:not(.active) {
      border-top: 3px solid transparent;
    }
  }
}
</style>
