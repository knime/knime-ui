<script>
import CirclePlus from '~/webapps-common/ui/assets/img/icons/circle-plus.svg?inline';
import FolderWorkflow from '~/webapps-common/ui/assets/img/icons/folder-workflow.svg?inline';

export default {
    components: {
        CirclePlus,
        FolderWorkflow
    }
};
</script>

<template>
  <main>
    <div class="button-tiles">
      <button>
        <div class="icon">
          <CirclePlus />
        </div>
        <div class="text primary">
          Create workflow
        </div>
      </button>
      <button @click="$commands.dispatch('openWorkflow')">
        <div class="icon">
          <FolderWorkflow />
        </div>
        <div class="text">
          Open workflow
        </div>
      </button>
    </div>
  </main>
</template>

<style lang="postcss" scoped>
main {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--knime-white);
  background-image: url('~assets/entry-page-background.webp');
  background-repeat: no-repeat;
  background-position: bottom right;
  background-size: 100%;

  & .button-tiles {
    margin-bottom: 30px; /* visually centered */

    & button {
      width: 400px;
      padding: 0;
      background-color: var(--knime-gray-ultra-light);
      border: 0;
      border-radius: 2px;
      box-shadow: 0 0 4px var(--knime-gray-dark-semi);
      margin-bottom: 60px;

      &:first-of-type {
        margin-right: 60px;
      }

      & .icon {
        height: 260px;
        display: flex;
        align-items: center;
        justify-content: center;

        & svg {
          width: 50px;
          stroke: var(--knime-dove-gray);
        }
      }

      & .text {
        background-color: var(--knime-masala);
        height: 60px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "Roboto Condensed", sans-serif;
        font-weight: normal;
        font-size: 20px;
        color: var(--knime-white);
        border-radius: 0 0 2px 2px;
      }

      &:hover,
      &:focus {
        box-shadow: 0 2px 10px 0 var(--knime-gray-dark-semi);
        transition: box-shadow 0.05s ease-out;
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

      & .primary {
        background-color: var(--knime-yellow);
        color: var(--knime-masala);
      }
    }
  }
}

</style>
