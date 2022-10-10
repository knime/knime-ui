<script>
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        tag: {
            type: String,
            required: true,
            validator: (value) => ['g', 'div'].includes(value)
        },
        name: {
            type: String,
            required: true
        }
    }
});
</script>

<template>
  <Component
    :is="tag"
    :id="name"
  />
</template>

