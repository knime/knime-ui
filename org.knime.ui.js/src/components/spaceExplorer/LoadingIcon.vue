<script>
import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';

export default {
    components: {
        ReloadIcon
    }
};
</script>

<template>
  <ReloadIcon />
</template>

<style type="postcss" scoped>
@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

svg {
  animation: spin 2s linear infinite;
}
</style>
