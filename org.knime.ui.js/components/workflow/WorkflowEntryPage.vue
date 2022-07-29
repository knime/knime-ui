<script>
import CirclePlusIcon from '~/webapps-common/ui/assets/img/icons/circle-plus.svg?inline';
import FolderWorkflowIcon from '~/webapps-common/ui/assets/img/icons/folder-workflow.svg?inline';
import OpenSourceCreditsModal from '../OpenSourceCreditsModal';

export default {
    components: {
        CirclePlusIcon,
        FolderWorkflowIcon,
        OpenSourceCreditsModal
    }
};
</script>

<template>
  <main>
    <div class="button-tiles">
      <button @click="$commands.dispatch('createWorkflow')">
        <div class="icon">
          <CirclePlusIcon />
        </div>
        <div class="text primary">
          Create workflow
        </div>
      </button>
      <button @click="$commands.dispatch('openWorkflow')">
        <div class="icon">
          <FolderWorkflowIcon />
        </div>
        <div class="text">
          Open workflow
        </div>
      </button>
    </div>
    <div class="footer">
      <OpenSourceCreditsModal />
    </div>
  </main>
</template>

<style lang="postcss" scoped>
main {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--knime-white);
  /* background-image: url('~assets/workflow-entry-page-background.webp'); */
  background-repeat: no-repeat;
  background-position: bottom right;
  background-size: 100%;
}

.button-tiles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

button {
  width: 400px;
  padding: 0;
  background-color: var(--knime-gray-ultra-light);
  border: 0;
  border-radius: 2px;
  box-shadow: 0 0 4px var(--knime-gray-dark-semi);
  transition: all 150ms ease-out;
  margin: 30px;

  & .icon {
    height: 260px;
    display: flex;
    align-items: center;
    justify-content: center;

    & svg {
      transition: all 150ms ease-out;
      width: 50px;
      stroke: var(--knime-dove-gray);
    }
  }

  & .text {
    background-color: var(--knime-masala);
    color: var(--knime-white);
    font-family: "Roboto Condensed", sans-serif;
    font-size: 20px;
    border-radius: 0 0 2px 2px;
    transition: all 150ms ease-out;
    height: 60px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    &.primary {
      background-color: var(--knime-yellow);
      color: var(--knime-masala);
    }
  }

  &:hover {
    box-shadow: 0 2px 10px 0 var(--knime-gray-dark-semi);
    cursor: pointer;

    & .icon svg {
      stroke: var(--knime-masala);
    }

    & .text {
      background-color: var(--knime-black);
    }

    & .text.primary {
      background-color: var(--knime-masala);
      color: var(--knime-white);
    }
  }

  &:active {
    transform: scale(0.98);
  }
}

.footer {
  position: absolute;
  bottom: 0;
  right: 0;

  & >>> .primary {
    color: var(--knime-masala);
    font-size: 12px;
    background-color: transparent;

    &:matches(:hover, :focus, :active) {
      color: var(--knime-masala);
      background-color: transparent;
      text-decoration: underline;
    }
  }
}
</style>
