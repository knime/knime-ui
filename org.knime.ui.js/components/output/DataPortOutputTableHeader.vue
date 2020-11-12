<script>
import { mapState } from 'vuex';

export default {
    computed: {
        ...mapState('datatable', ['columns'])
    }
};
</script>

<template>
  <thead>
    <tr>
      <th
        v-for="(column, index) of columns"
        :key="`table-header-${index}`"
        :title="column.name"
      >
        {{ column.name }}
      </th>
    </tr>
  </thead>
</template>

<style>
th {
  text-align: left;
  max-width: 1000px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
