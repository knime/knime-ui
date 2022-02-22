<script>
import Icon from '~/assets/missing-value.svg?inline';

export default {
    components: {
        Icon
    }
};
</script>

<template>
  <main>
    <div class="buttons">
      <button>
        <Icon class="icon" />
        <span>Create workflow</span>
      </button>
      <button>Open workflow</button>
    </div>
  </main>
</template>

<style lang="postcss" scoped>
main {
  display: flex;
  min-height: 100vh;
  justify-content: center;
  align-items: center;

  & .buttons {
    display: flex;

    & button {
      padding: 20px;
      margin: 10px;
    }

    & span {
      background-color: blue;
    }
  }
}

</style>
