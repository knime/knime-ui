<script>
import MetaNodePortBar from '~/components/MetaNodePortBar';

export default {
    components: {
        MetaNodePortBar
    }
};
</script>

<template>
  <g>
    <MetaNodePortBar type="in" />
    <MetaNodePortBar type="out" />
  </g>
</template>
