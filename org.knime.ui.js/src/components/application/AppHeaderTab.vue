<script>
import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import CloseIcon from '@/assets/cancel.svg';


/* eslint-disable no-magic-numbers */
const maxCharSwitch = [
    (width) => width < 600 ? 10 : false,
    (width) => width < 900 ? 20 : false,
    (width) => width < 1280 ? 50 : false,
    (width) => width < 1680 ? 100 : false,
    (width) => width < 2180 ? 150 : false,
    (width) => width < 2800 ? 200 : false,
    (width) => width >= 2800 ? 256 : false
];
/* eslint-enable no-magic-numbers */

const maxCharFunction = (windowWidth) => {
    const getMaxChars = maxCharSwitch.find(fn => fn(windowWidth));
    return getMaxChars(windowWidth);
};

export default {
    components: {
        FunctionButton,
        CloseIcon
    },
    props: {
        name: {
            type: String,
            required: true
        },
        projectId: {
            type: String,
            required: true
        },
        isActive: {
            type: Boolean,
            default: false
        },
        isHoveredOver: {
            type: Boolean,
            default: false
        },
        windowWidth: {
            type: Number,
            default: 0
        }
    },
    computed: {
        shouldTruncateName() {
            const maxChars = maxCharFunction(this.windowWidth);
            return this.name.length > maxChars;
        },
        truncatedProjectName() {
            const maxChars = maxCharFunction(this.windowWidth);

            return this.shouldTruncateName ? `${this.name.slice(0, maxChars)} …` : this.name;
        }
    },
    methods: {
        onHover(hoverValue) {
            this.$emit('hover', hoverValue);
        }
    }
};
</script>

<template>
  <li
    :class="{ active: isActive, hovered: isHoveredOver }"
    :title="shouldTruncateName ? name : null"
    @click.stop="isActive ? null : $emit('switch-workflow', projectId)"
    @mouseover="onHover(projectId)"
    @mouseleave="onHover(null)"
  >
    <span class="text">{{ truncatedProjectName }}</span>
    <FunctionButton
      class="icon"
      :class="[ isHoveredOver ? 'visible' : null ]"
      @click.stop="$emit('close-workflow', projectId)"
    >
      <CloseIcon />
    </FunctionButton>
  </li>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

li {
  height: 49px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 0 1px;
  padding-left: 10px;
  padding-bottom: 1px;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  border-radius: 1px 1px 0 0;
  background-color: var(--knime-black);
  color: var(--knime-white);
  min-width: 80px;
  max-width: 300px;

  &:hover {
    background-color: var(--knime-masala);
  }

  & .text {
    color: var(--knime-white);
    font-family: "Roboto Condensed", sans-serif;
    font-size: 18px;
    padding: 10px 0;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    min-width: 0;
    line-height: 21px;
    font-weight: 400;
    width: 100%;
    text-align: left;
  }

  /* Increase rule specificity to override function-button's styles */
  & .function-button.icon {
    padding: 0;
  }

  & .icon {
    align-self: center;
    align-items: center;
    border-radius: 0;
    margin-left: -18px;
    margin-right: 4px;
    width: 20px;
    height: 100%;

    & svg {
      display: none;
    }
  }

  /* Increase rule specificity to override function-button's styles */
  & .function-button.icon.visible {
    background: linear-gradient(90deg, hsl(0deg 0% 100% / 0%) 0%, var(--knime-masala) 30%);
  }

  & .visible {
    & svg {
      display: block;

      @mixin svg-icon-size 18;

      stroke: var(--knime-porcelain);
    }

    &:hover svg {
      stroke: var(--knime-white);
    }
  }
}

li.hovered:last-child:not(.active) {
  border-right: 2px solid var(--knime-black);
}

li.active {
  background-color: var(--knime-yellow);
  color: var(--knime-black);
  cursor: inherit;

  & .text {
    color: var(--knime-black);
  }

  & .function-button.icon.visible {
    background: linear-gradient(90deg, hsl(0deg 0% 100% / 0%) 0%, var(--knime-yellow) 30%);
  }

  & .visible {
    height: 49px;

    & svg {
      stroke: var(--knime-masala);
    }

    &:hover svg {
      stroke: var(--knime-black);
    }
  }

  &:hover,
  &:focus {
    cursor: inherit;
    background-color: var(--knime-yellow);
  }
}
</style>
