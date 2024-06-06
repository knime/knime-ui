<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
// @ts-ignore
import Button from '../../../../org.knime.ui.js/webapps-common/ui/components/Button.vue'
// @ts-ignore
import Dropdown from '../../../../org.knime.ui.js/webapps-common/ui/components/forms/Dropdown.vue'
// @ts-ignore
import type * as generated from '../../../../org.knime.ui.js/src/embeddedFeatures/hub-api/generated'

type DropdownItem = { id: string; text: string }
const props = defineProps<{ workflowId: any }>()
const selectedVersion = ref('latest')
const versions = ref<DropdownItem[]>([{ id: 'latest', text: 'latest' }])
const executionContexts = ref<DropdownItem[]>([])

const api = inject<typeof generated>('hubApi')!

const fetchVersions = async () => {
  const { versions: _versions } = await api.getWorkflowVersions(props.workflowId)
  console.log('_versions :>> ', _versions)
  versions.value = [{ id: 'latest', text: 'latest' }].concat(
    (_versions ?? []).map(({ version, title }) => ({
      id: version.toString(),
      text: title
    }))
  )
}

const getExecutionContexts = async () => {
  const repositoryItem = await api.getRepositoryItem(props.workflowId)

  const { executionContexts: _executionContexts } = await api.getExecutionContextsByScope(
    repositoryItem.ownerAccountId
  )
  executionContexts.value = (_executionContexts ?? []).map(({ id, name }) => ({ id, text: name }))
}

onMounted(async () => {
  fetchVersions()
  getExecutionContexts()
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

    <Dropdown
      v-model="selectedVersion"
      aria-label="Execution contexts"
      size="3"
      :possible-values="executionContexts"
    />

    <Button compact with-border @click="api.exit()">Cancel</Button>
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
