<script>
export default {
  props: {
    text: {
      type: String,
      required: true,
    },
  },
};
</script>

<template>
  <div class="avatar">
    {{ text }}
  </div>
</template>

<style lang="postcss" scoped>
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  color: var(--knime-white);
  background: var(--knime-petrol-dark);
  border: 2px solid hsl(200deg 10% 94% / 100%);
  border-radius: 50%;
}
</style>
