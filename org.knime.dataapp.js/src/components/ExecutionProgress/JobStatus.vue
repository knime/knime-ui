<script>
export default {
  props: {
    title: {
      type: String,
      required: true,
    },
  },
};
</script>

<template>
  <div>
    <section class="headline">
      <div class="grid-container">
        <div class="grid-item-12 title">
          <h3>{{ title }}</h3>
        </div>
      </div>
    </section>
    <section class="progress grid-container">
      <div class="grid-item-12">
        <div class="info grid-item-8">
          <slot name="status" />
        </div>
        <div class="graph grid-item-8">
          <slot name="graph" />
        </div>
        <div class="text info grid-item-8">
          <slot name="text" />
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="postcss" scoped>
h5 {
  margin: 70px 0;
  font-family: var(--theme-headlines-font-family);
  color: var(--theme-headlines-color);
  font-weight: var(--theme-headlines-font-weight);
}

.headline {
  background-color: var(--knime-gray-ultra-light);
  left: calc((100% - 100vw) / 2);
  width: 100vw;
  position: relative;
}

.title {
  margin: 40px 0;
  text-align: center;

  & h3 {
    margin-bottom: 20px;
  }
}

.progress {
  margin-top: 60px;
}

.info {
  display: flex;
  align-items: center;
  margin-left: auto;
  margin-right: auto;
}

.graph {
  margin-top: 40px;
  position: relative;
  display: flex;
  margin-right: auto;
  margin-left: auto;
  padding-bottom: 5px;

  &::before {
    content: "";
    position: absolute;
    right: 0;
    border-top: 1px solid var(--knime-silver-sand);
    width: 100%;
    top: -1px;
  }
}

@media only screen and (width <= 900px) {
  .progress {
    width: 80%;
  }
}
</style>
