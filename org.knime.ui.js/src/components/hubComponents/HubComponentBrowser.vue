<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton, LoadingIcon, SearchInput, SubMenu, type MenuItem } from "@knime/components";
import LeaveIcon from "@knime/styles/img/icons/leave.svg";

import Portal from "@/components/common/Portal.vue";
import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import { useSpaceProviderAuth } from "@/components/spaces/useSpaceProviderAuth";
import type { HubComponent } from "@/store/hubComponents";
import { useHubComponentsStore } from "@/store/hubComponents";
import { usePanelStore } from "@/store/panel";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { formatSpaceProviderName, isCommunityHubProvider } from "@/store/spaces/util";

import HubComponentDescription from "./HubComponentDescription.vue";
import HubComponentsGroupedByCategory from "./HubComponentsGroupedByCategory.vue";

const SEARCH_DEBOUNCE_MS = 300;

type DisplayMode = "list" | "icon";

const hubComponentsStore = useHubComponentsStore();
const { components, searchTerm, isLoading, error, isAuthenticated, selectedProviderId } =
  storeToRefs(hubComponentsStore);

const spaceProvidersStore = useSpaceProvidersStore();
const { spaceProviders } = storeToRefs(spaceProvidersStore);

const panelStore = usePanelStore();
const { isExtensionPanelOpen } = storeToRefs(panelStore);

const {
  isConnectingToProvider,
  shouldShowLoading,
  connectAndNavigate,
  logout,
  shouldShowLoginIndicator,
  shouldShowLogout,
} = useSpaceProviderAuth();

const displayMode = ref<DisplayMode>("icon");
const searchInput = ref<InstanceType<typeof SearchInput>>();
const selectedComponentId = ref<string | null>(null);
const showDescriptionForComponent = ref<HubComponent | null>(null);
let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

// Watch for authentication changes and invalidate cache
const previousAuthState = ref<boolean | null>(null);
watch(
  isAuthenticated,
  (newAuth) => {
    // Only invalidate if auth state actually changed and it's not the initial mount
    if (previousAuthState.value !== null && newAuth !== previousAuthState.value) {
      consola.info("Hub authentication state changed, invalidating cache");
      hubComponentsStore.invalidateCacheAndRefetch();
    }
    previousAuthState.value = newAuth;
  },
  { immediate: true },
);

const onSearchInput = (value: string) => {
  hubComponentsStore.setSearchTerm(value);
  
  // Debounce API calls while typing
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout);
  }
  
  searchDebounceTimeout = setTimeout(() => {
    hubComponentsStore.fetchComponents();
  }, SEARCH_DEBOUNCE_MS);
};

const onSelectComponent = (componentId: string) => {
  selectedComponentId.value = componentId;
};

const toggleComponentDescription = (component: HubComponent) => {
  const isSameComponent = showDescriptionForComponent.value?.id === component.id;
  
  if (!isSameComponent || !isExtensionPanelOpen.value) {
    panelStore.openExtensionPanel();
    showDescriptionForComponent.value = component;
    selectedComponentId.value = component.id;
    return;
  }

  panelStore.closeExtensionPanel();
};

watch(
  isExtensionPanelOpen,
  (isOpen) => {
    if (!isOpen) {
      showDescriptionForComponent.value = null;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  // Fetch components (will use cache if available and valid)
  await hubComponentsStore.fetchComponents();
});

const refreshComponents = async () => {
  // Force refresh without cache
  await hubComponentsStore.invalidateCacheAndRefetch();
};

// Hub provider dropdown
const hubProviders = computed(() => hubComponentsStore.getHubProviders());

// Auto-select first provider if none selected
watch(
  [hubProviders, selectedProviderId],
  ([providers, currentSelection]) => {
    if (providers.length > 0 && !currentSelection) {
      // Select first provider by default
      hubComponentsStore.setSelectedProviderId(providers[0].id);
    }
  },
  { immediate: true },
);

// Watch for provider connection changes and refresh components
watch(
  () => hubProviders.value.map(p => ({ id: p.id, connected: p.connected })),
  (newProviders, oldProviders) => {
    if (!oldProviders) {
      return;
    }
    
    // Check if any provider connection status changed
    const connectionChanged = newProviders.some((newP, index) => {
      const oldP = oldProviders[index];
      return oldP && newP.connected !== oldP.connected;
    });
    
    if (connectionChanged) {
      // Refresh components when any provider connects/disconnects
      hubComponentsStore.invalidateCacheAndRefetch();
    }
  },
  { deep: true },
);

const providerDropdownItems = computed(() => {
  const items: MenuItem[] = [];

  hubProviders.value.forEach((provider) => {
    const isConnected = provider.connected;
    const showLogin = shouldShowLoginIndicator(provider);
    
    let displayText = formatSpaceProviderName(provider);
    
    // Add connection status for non-community hubs
    if (!isCommunityHubProvider(provider)) {
      if (!isConnected && showLogin) {
        displayText += " (Connect)";
      }
    }
    
    items.push({
      text: displayText,
      metadata: { providerId: provider.id },
      disabled: isConnectingToProvider.value === provider.id,
    });
  });

  return items;
});

const selectedProvider = computed(() => {
  if (!selectedProviderId.value) {
    return hubProviders.value[0] || null;
  }
  return hubProviders.value.find(p => p.id === selectedProviderId.value) || hubProviders.value[0] || null;
});

const selectedProviderText = computed(() => {
  return selectedProvider.value ? formatSpaceProviderName(selectedProvider.value) : "Components";
});

const onProviderSelect = async (_event: MouseEvent, item: MenuItem) => {
  const metadata = item.metadata as { providerId?: string } | undefined;
  const providerId = metadata?.providerId;
  
  if (!providerId) {
    return;
  }
  
  const provider = hubProviders.value.find(p => p.id === providerId);
  if (!provider) {
    return;
  }
  
  // If not connected, trigger login
  if (!provider.connected) {
    await connectAndNavigate(provider);
    // After successful login, the provider will be connected and components will refresh
    return;
  }
  
  // If already connected, just switch to this provider
  hubComponentsStore.setSelectedProviderId(providerId);
};
</script>

<template>
  <SidebarPanelLayout class="hub-component-browser">
    <template #header>
      <div class="header-wrapper">
        <div class="tab-bar">
          <div class="tabs">
            <SubMenu
              v-if="hubProviders.length > 1"
              :items="providerDropdownItems"
              orientation="right"
              class="provider-dropdown"
              @item-click="onProviderSelect"
            >
              <div class="tab-item dropdown-trigger">
                <div class="tab-label">
                  {{ selectedProviderText }}
                  <LoadingIcon
                    v-if="selectedProvider && shouldShowLoading(selectedProvider)"
                    class="loading-indicator"
                  />
                  <FunctionButton
                    v-else-if="selectedProvider && shouldShowLogout(selectedProvider) && !isCommunityHubProvider(selectedProvider)"
                    compact
                    class="logout-button"
                    @click.stop.prevent="logout(selectedProvider)"
                  >
                    <LeaveIcon />
                  </FunctionButton>
                </div>
              </div>
            </SubMenu>
            <div v-else-if="selectedProvider" class="tab-item">
              <div class="tab-label">
                {{ selectedProviderText }}
                <LoadingIcon
                  v-if="shouldShowLoading(selectedProvider)"
                  class="loading-indicator"
                />
                <FunctionButton
                  v-else-if="shouldShowLogout(selectedProvider) && !isCommunityHubProvider(selectedProvider)"
                  compact
                  class="logout-button"
                  @click.stop.prevent="logout(selectedProvider)"
                >
                  <LeaveIcon />
                </FunctionButton>
              </div>
            </div>
          </div>
        </div>
        <div class="search-container">
          <SearchInput
            ref="searchInput"
            :model-value="searchTerm"
            placeholder="Search"
            compact
            @update:model-value="onSearchInput"
          />
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner" />
      <p>Loading Hub components...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>Failed to load Hub components</p>
      <p class="error-message">{{ error }}</p>
      <FunctionButton @click="refreshComponents">
        Retry
      </FunctionButton>
    </div>

    <div v-else-if="components.length === 0" class="empty-state">
      <p v-if="searchTerm">
        No components found matching "{{ searchTerm }}"
      </p>
      <p v-else>No components available</p>
    </div>

    <HubComponentsGroupedByCategory
      v-else
      v-model:display-mode="displayMode"
      :selected-component-id="selectedComponentId"
      :description-active-for-id="showDescriptionForComponent?.id ?? null"
      @select-component="onSelectComponent"
      @show-node-description="toggleComponentDescription"
    />

    <Portal v-if="isExtensionPanelOpen" to="extension-panel">
      <Transition name="extension-panel">
        <HubComponentDescription
          show-close-button
          :component="showDescriptionForComponent"
          @close="panelStore.closeExtensionPanel"
        />
      </Transition>
    </Portal>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.hub-component-browser {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header-wrapper {
  background: var(--knime-porcelain);
  display: flex;
  flex-direction: column;
  width: 100%;
}

.tab-bar {
  display: flex;
  flex-direction: column;
  padding: 0px;
}

.tab-separator {
  height: 15px;
}

.tabs {
  display: flex;
  align-items: flex-start;
}

.tab-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 10px 0 0;
}

.dropdown-trigger {
  cursor: pointer;
}

.dropdown-trigger:hover .tab-label {
  color: var(--knime-masala);
}

.provider-dropdown {
  min-width: 150px;
}

.tab-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 21px;
  padding: 0;
  font-family: Roboto, sans-serif;
  font-weight: 500;
  font-size: 13px;
  line-height: 13px;
  color: var(--knime-dove-gray);
  transition: color 0.2s;
}

.loading-indicator {
  width: 16px;
  height: 16px;
  color: var(--knime-dove-gray);
}

.logout-button {
  width: 20px;
  height: 20px;
  padding: 2px;
  
  & :deep(svg) {
    width: 16px;
    height: 16px;
  }
}

.search-container {
  width: 100%;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-32);
  text-align: center;
  gap: var(--spacing-16);

  & p {
    margin: 0;
    color: var(--knime-dove-gray);
  }
}

.error-message {
  font-size: 12px;
  color: var(--knime-coral-red);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--knime-stone-gray);
  border-top-color: var(--knime-masala);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.extension-panel-enter-active {
  transition: all 50ms ease-in;
}

.extension-panel-leave-active {
  transition: all 50ms ease-out;
}

.extension-panel-enter-from,
.extension-panel-leave-to {
  opacity: 0;
}
</style>
