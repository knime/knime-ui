<script setup lang="ts">
import BulbIcon from "@knime/styles/img/icons/bulb.svg";
</script>

<template>
  <div class="tips-area">
    <div class="title">
      <div class="icon"><BulbIcon /></div>
      <span>Tips to get started</span>
    </div>

    <div class="tips">
      <div class="tip">
        <div class="number">1</div>
        <span class="text">
          You can drag nodes from the node repository in the left panel
        </span>
      </div>
      <div class="tip">
        <div class="number">2</div>
        <span class="text">
          You can drag files from your system and drop them onto the application
        </span>
      </div>
      <div class="tip">
        <div class="number">3</div>
        <span class="text">
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </span>
      </div>
      <div class="tip">
        <div class="number">4</div>
        <span class="text">
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.tips-area {
  padding: var(--space-16);
  max-width: 50%;
  align-self: center;
  border: 1px solid var(--knime-silver-sand);
  background: var(--knime-gray-ultra-light);
  border-radius: 8px;

  & .title {
    display: flex;
    align-items: center;
    gap: var(--space-8);

    & span {
      font-weight: bold;
    }

    & .icon {
      background-color: var(--knime-cornflower-semi);
      padding: var(--space-8);
      border-radius: 10px;
    }

    & svg {
      stroke: var(--knime-cornflower);

      @mixin svg-icon-size 24;
    }
  }

  & .tips {
    display: grid;
    margin-top: var(--space-16);
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: var(--space-8);

    & .tip {
      display: flex;
      align-items: center;
      gap: var(--space-8);

      & .number {
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 12px;
        border-radius: 50%;
        width: var(--space-24);
        height: var(--space-24);
        padding: var(--space-8);
        background-color: var(--knime-cornflower-semi);
        color: var(--knime-cornflower);
      }

      & .text {
        font-size: 10px;
        font-weight: bold;
      }
    }
  }
}
</style>
