<script>

export default {
    props: {
        text: {
            type: String,
            required: true
        }
    }
};
</script>

<template>
  <div class="avatar">
    {{ text }}
  </div>
</template>

<style lang="postcss" scoped>
.avatar {
  background: var(--knime-petrol-dark);
  height: 32px;
  width: 32px;
  border-radius: 50%;
  border: 2px solid hsla(200, 10%, 94%, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--knime-white);
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
}
</style>
