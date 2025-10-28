<script>
export default {
  data() {
    return {
      jobId: this.$store.state.wizardExecution.job.id,
    };
  },
  methods: {
    buildReportDownloadURL(format) {
      return this.$api.reportDownloadUrl({ jobId: this.jobId, format });
    },
  },
};
</script>

<template>
  <div class="grid-container">
    <div class="grid-item-12">
      <iframe title="report" :src="buildReportDownloadURL('HTML')" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
iframe {
  height: calc(100vh - 312px);
  width: 100%;
  min-height: 300px;
  border: none;
}
</style>
