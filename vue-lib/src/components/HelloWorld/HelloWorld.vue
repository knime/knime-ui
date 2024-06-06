<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
// @ts-ignore
import Button from '../../../../org.knime.ui.js/webapps-common/ui/components/Button.vue'
// @ts-ignore
import Dropdown from '../../../../org.knime.ui.js/webapps-common/ui/components/forms/Dropdown.vue'
// @ts-ignore
import type * as generated from '../../../../org.knime.ui.js/src/embeddedFeatures/hub-api/generated'

const props = defineProps<{ workflowId: any }>()
const selectedVersion = ref('latest')
const versions = ref<{ id: string; text: string }[]>([{ id: 'latest', text: 'latest' }])

const api = inject<typeof generated>('hubApi')!

const fetchVersions = async () => {
  const { versions: _versions } = await api.getWorkflowVersions(props.workflowId)
  console.log('_versions :>> ', _versions)
  versions.value = [{ id: 'latest', text: 'latest' }].concat(
    _versions.map(({ version, title }) => ({
      id: version.toString(),
      text: title
    }))
  )
}

onMounted(async () => {
  const repositoryItem = await api.getRepositoryItem(props.workflowId)
  const test2 = await api.getExecutionContextsByScope(repositoryItem.ownerAccountId)
  console.log('repositoryItem :>> ', repositoryItem)
  console.log('test2 :>> ', test2)
  fetchVersions()
})
</script>

<template>
  <div class="wrapper">
    <h3 class="green">Ad hoc execution</h3>

    <Dropdown
      v-model="selectedVersion"
      aria-label="Versions"
      size="3"
      :possible-values="versions"
    />

    <Button compact with-border>Cancel</Button>
    <Button compact primary>Run</Button>
  </div>
</template>

<style scoped>
h3 {
  font-size: 1.2rem;
}

.wrapper {
  padding: 20px;
}
</style>
