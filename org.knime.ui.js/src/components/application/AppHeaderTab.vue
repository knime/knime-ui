<script>
import WorkflowIcon from "webapps-common/ui/assets/img/icons/workflow.svg";
import CloseButton from "@/components/common/CloseButton.vue";

/* eslint-disable no-magic-numbers */
const maxCharSwitch = [
  (width) => (width < 600 ? 10 : false),
  (width) => (width < 900 ? 20 : false),
  (width) => (width < 1280 ? 50 : false),
  (width) => (width < 1680 ? 100 : false),
  (width) => (width < 2180 ? 150 : false),
  (width) => (width < 2800 ? 200 : false),
  (width) => (width >= 2800 ? 256 : false),
];
/* eslint-enable no-magic-numbers */

const maxCharFunction = (windowWidth) => {
  const getMaxChars = maxCharSwitch.find((fn) => fn(windowWidth));
  return getMaxChars(windowWidth);
};

export default {
  components: {
    CloseButton,
    WorkflowIcon,
  },
  props: {
    name: {
      type: String,
      required: true,
    },
    projectId: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    hasUnsavedChanges: {
      type: Boolean,
      default: false,
    },
    isHoveredOver: {
      type: Boolean,
      default: false,
    },
    windowWidth: {
      type: Number,
      default: 0,
    },
  },
  emits: ["hover", "switchWorkflow", "closeWorkflow"],
  computed: {
    shouldTruncateName() {
      const maxChars = maxCharFunction(this.windowWidth);
      return this.name.length > maxChars;
    },
    truncatedProjectName() {
      const maxChars = maxCharFunction(this.windowWidth);

      return this.shouldTruncateName
        ? `${this.name.slice(0, maxChars)} …`
        : this.name;
    },
  },
  methods: {
    onHover(hoverValue) {
      this.$emit("hover", hoverValue);
    },
  },
};
</script>

<template>
  <li
    :class="{ active: isActive, hovered: isHoveredOver }"
    :title="shouldTruncateName ? name : null"
    @click.stop="isActive ? null : $emit('switchWorkflow', projectId)"
    @mouseover="onHover(projectId)"
    @mouseleave="onHover(null)"
    @click.middle.stop="$emit('closeWorkflow', projectId)"
  >
    <WorkflowIcon class="workflow-icon" />
    <span class="text">{{ truncatedProjectName }}</span>
    <CloseButton
      class="close-icon"
      :has-unsaved-changes="hasUnsavedChanges"
      @close.stop="$emit('closeWorkflow', projectId)"
    />
  </li>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

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

  & .workflow-icon {
    stroke: var(--knime-white);

    @mixin svg-icon-size 20;
  }

  &:hover {
    background-color: var(--knime-masala);
  }

  & .text {
    color: var(--knime-white);
    font-family: "Roboto Condensed", sans-serif;
    font-size: 18px;
    padding: 10px 0 10px 5px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    min-width: 0;
    line-height: 21px;
    font-weight: 400;
    width: 100%;
    text-align: left;
  }

  & .close-icon {
    padding-left: 0;

    & :deep(svg) {
      stroke: var(--knime-white);

      @mixin svg-icon-size 20;
    }
  }
}

li.hovered:last-child:not(.active) {
  box-shadow: 10px 10px 45px 10px var(--knime-black-semi);
  clip-path: inset(0 -100px 0 0);
}

li.active {
  background-color: var(--knime-yellow);
  color: var(--knime-black);
  cursor: inherit;

  & .text {
    color: var(--knime-black);
  }

  & .workflow-icon {
    stroke: var(--knime-black);
  }

  & .close-icon {
    & :deep(svg) {
      stroke: var(--knime-black);

      &:hover {
        stroke: var(--knime-white);
        background: var(--knime-masala-semi);
      }
    }
  }

  &:hover,
  &:focus {
    cursor: inherit;
    background-color: var(--knime-yellow);
  }
}
</style>
