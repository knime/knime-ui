import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import {
  extractHostname,
  knimeExternalUrls,
} from "@/plugins/knimeExternalUrls";

import { useApplicationStore } from "./application/application";
import { useSpaceProvidersStore } from "./spaces/providers";

const { KNIME_HUB_HOME_HOSTNAME } = knimeExternalUrls;

// Default limit for fetching components from Hub API
// Initial load: 18 components per category for performance
const INITIAL_COMPONENTS_PER_CATEGORY = 18;
const LOAD_MORE_BATCH_SIZE = 18;
const MAX_TOTAL_COMPONENTS = 3000;
const HTTP_UNAUTHORIZED = 401;

// Cache key for localStorage
const CACHE_KEY = "knime_hub_components_cache";
const CACHE_VERSION_KEY = "knime_hub_components_cache_version";
const CACHE_VERSION = "1.4.0"; // Caching disabled - localStorage quota issues with icons

/**
 * Get the Hub provider ID
 */
const getHubProviderId = (): string | null => {
  const spaceProvidersStore = useSpaceProvidersStore();
  const communityHubProvider = Object.values(
    spaceProvidersStore.spaceProviders,
  ).find(
    (provider) =>
      provider.hostname &&
      extractHostname(provider.hostname) === KNIME_HUB_HOME_HOSTNAME,
  );
  return communityHubProvider?.id ?? null;
};

/**
 * Check if user is authenticated with KNIME Hub
 */
const isHubAuthenticated = (): boolean => {
  const spaceProvidersStore = useSpaceProvidersStore();
  const hubProviderId = getHubProviderId();
  
  if (!hubProviderId) {
    return false;
  }
  
  const hubProvider = spaceProvidersStore.spaceProviders[hubProviderId];
  return hubProvider?.connected === true;
};

export interface HubComponent {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  icon?: string;
  downloadCount?: number;
  rating?: number;
  lastUpdated: string;
  hubUrl: string;
  // Hub-specific data for drag & drop
  providerId: string;
  spaceId: string;
  itemId: string;
  versionId?: string;
  // Component type (from icon.type field)
  componentType?: string;
  // Whether this is a private component (requires authentication to access)
  isPrivate: boolean;
  // Node template for drag & drop
  nodeTemplate: NodeTemplateWithExtendedPorts;
}

export interface ComponentsByCategory {
  category: string;
  components: HubComponent[];
}

interface CacheData {
  components: HubComponent[];
  timestamp: number;
  wasAuthenticated: boolean;
}

/**
 * Save components to localStorage cache
 * DISABLED: Caching disabled due to localStorage quota issues with large icons
 */
const saveCacheToStorage = (_components: HubComponent[], _wasAuthenticated: boolean) => {
  // Caching disabled - always fetch fresh
};

/**
 * Load components from localStorage cache
 * Returns null if cache is invalid or outdated
 */
const loadCacheFromStorage = (): CacheData | null => {
  try {
    const version = localStorage.getItem(CACHE_VERSION_KEY);
    if (version !== CACHE_VERSION) {
      // Cache version mismatch, clear old cache
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_VERSION_KEY);
      return null;
    }

    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const cacheData: CacheData = JSON.parse(cached);
    return cacheData;
  } catch (err) {
    consola.warn("Failed to load Hub components from cache:", err);
    return null;
  }
};

/**
 * Clear the components cache
 */
const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
  } catch (err) {
    consola.warn("Failed to clear Hub components cache:", err);
  }
};

export const useHubComponentsStore = defineStore("hubComponents", () => {
  const components = ref<HubComponent[]>([]);
  const searchTerm = ref("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isAuthenticated = computed(() => isHubAuthenticated());
  const lastAuthState = ref<boolean>(false);
  
  // Selected Hub provider for filtering components
  const selectedProviderId = ref<string | null>(null);
  
  // Category expansion and pagination state
  const expandedCategories = ref<Set<string>>(new Set());
  const categoryLoadCounts = ref<Map<string, number>>(new Map());
  
  // Map of component ID to hubUrl for drag & drop lookup
  const componentIdToHubUrl = ref<Map<string, string>>(new Map());

  // Try to load from cache on initialization
  const initializeFromCache = () => {
    // Caching disabled - always fetch fresh
    clearCache();
    return false;
  };

  const filteredComponents = computed(() => {
    let filtered = components.value;
    
    // Filter by selected provider if set
    if (selectedProviderId.value) {
      filtered = filtered.filter(
        (component) => component.providerId === selectedProviderId.value,
      );
    }
    
    // Filter by search term
    if (searchTerm.value) {
      const term = searchTerm.value.toLowerCase();
      filtered = filtered.filter(
        (component) =>
          component.name.toLowerCase().includes(term) ||
          component.description.toLowerCase().includes(term) ||
          component.tags.some((tag) => tag.toLowerCase().includes(term)),
      );
    }
    
    return filtered;
  });

  const groupedByCategory = computed(() => {
    const grouped = new Map<string, HubComponent[]>();

    filteredComponents.value.forEach((component) => {
      // Use componentType from API (Learner, Manipulator, Predictor, etc.)
      const category = component.componentType || "Other";

      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(component);
    });

    // Convert to array and sort in the specified order
    const categoryOrder = [
      "Source",
      "Manipulator", 
      "Visualizer",
      "Learner",
      "Predictor",
      "Sink",
      "Other",
      "Uncategorized"
    ];
    
    const result: ComponentsByCategory[] = [];
    
    // Add categories in the specified order
    categoryOrder.forEach((category) => {
      if (grouped.has(category)) {
        const allComponents = grouped.get(category)!;
        const loadCount = categoryLoadCounts.value.get(category) || INITIAL_COMPONENTS_PER_CATEGORY;
        
        result.push({
          category,
          components: allComponents.slice(0, loadCount),
        });
      }
    });
    
    // Add any remaining categories not in the specified order
    Array.from(grouped.keys()).forEach((category) => {
      if (!categoryOrder.includes(category)) {
        const allComponents = grouped.get(category)!;
        const loadCount = categoryLoadCounts.value.get(category) || INITIAL_COMPONENTS_PER_CATEGORY;
        
        result.push({
          category,
          components: allComponents.slice(0, loadCount),
        });
      }
    });

    return result;
  });

  // Get total count for a category (including components not yet shown)
  const getCategoryTotalCount = (category: string): number => {
    const allComponents = filteredComponents.value.filter(
      (c) => (c.componentType || "Other") === category
    );
    return allComponents.length;
  };

  // Check if category has more components to load
  const categoryHasMore = (category: string): boolean => {
    const totalCount = getCategoryTotalCount(category);
    const loadedCount = categoryLoadCounts.value.get(category) || INITIAL_COMPONENTS_PER_CATEGORY;
    return loadedCount < totalCount;
  };

  // Load more components for a category
  const loadMoreInCategory = (category: string) => {
    const currentCount = categoryLoadCounts.value.get(category) || INITIAL_COMPONENTS_PER_CATEGORY;
    const newCount = currentCount + LOAD_MORE_BATCH_SIZE;
    categoryLoadCounts.value.set(category, newCount);
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (category: string) => {
    if (expandedCategories.value.has(category)) {
      expandedCategories.value.delete(category);
    } else {
      expandedCategories.value.add(category);
    }
  };

  // Check if category is expanded
  const isCategoryExpanded = (category: string): boolean => {
    return expandedCategories.value.has(category);
  };

  /**
   * Map Hub API port data to NodeTemplate port format
   * This adds the necessary properties that NodePreview expects
   */
  const mapHubPortsToNodeTemplate = (hubPorts: any[] | undefined, availablePortTypes: any) => {
    if (!hubPorts || hubPorts.length === 0) {
      return [];
    }
    return hubPorts.map((port: any) => {
      const typeId = port.objectClass || "org.knime.core.node.BufferedDataTable";
      
      // Get port type information from available port types
      const portTypeInfo = availablePortTypes[typeId] || availablePortTypes["org.knime.core.node.BufferedDataTable"];
      
      const mappedPort: any = {
        name: port.name || port.description || "Port",
        typeId,
        optional: port.optional ?? false,
        // Add kind (type) from port type info - required by NodePreview
        type: portTypeInfo?.kind || "other",
        kind: portTypeInfo?.kind || "other",
      };
      
      // Use color from Hub API if available, otherwise use color from port type
      if (port.color) {
        mappedPort.color = `#${port.color}`;
      } else if (portTypeInfo?.color) {
        mappedPort.color = portTypeInfo.color;
      }
      
      return mappedPort;
    });
  };

  /**
   * Create NodeTemplate for Hub component
   */
  const createNodeTemplate = (
    result: any, 
    nodeType: string | null, 
    iconDataUri: string | undefined,
    availablePortTypes: any
  ): NodeTemplateWithExtendedPorts => {
    // Extract port information from Hub API
    // Use the exact ports from the API - empty arrays mean no ports
    const inPorts = mapHubPortsToNodeTemplate(result.icon?.inPorts, availablePortTypes);
    const outPorts = mapHubPortsToNodeTemplate(result.icon?.outPorts, availablePortTypes);
    
    const template: NodeTemplateWithExtendedPorts = {
      id: result.id || "",
      name: result.title || "Unnamed Component",
      component: true,
      icon: iconDataUri,
      nodeFactory: {
        className: result.id || "",
      },
      inPorts: inPorts as any,
      outPorts: outPorts as any,
    } as any;
    
    // Only set type if nodeType is provided (not null)
    // This allows uncategorized components to render as plain gray
    if (nodeType) {
      template.type = nodeType as any;
    }
    
    return template;
  };

  /**
   * Get node type and component type from Hub API result
   */
  const getComponentTypes = (result: any) => {
    const validNodeTypes = ["Source", "Sink", "Learner", "Predictor", "Manipulator", "Visualizer"];
    const validTypes = [...validNodeTypes, "Other"];
    const apiType = result.icon?.type;
    
    // Determine component type for categorization
    // - null/undefined → "Uncategorized" (will show as gray without colored rectangle)
    // - "Other" → "Other" (will show as light brown)
    // - valid type → use that type
    // - invalid type → "Uncategorized"
    let componentType: string;
    if (!apiType) {
      componentType = "Uncategorized";
    } else if (validTypes.includes(apiType)) {
      componentType = apiType;
    } else {
      componentType = "Uncategorized";
    }
    
    // For nodeTemplate.type:
    // - Uncategorized → null (renders as plain gray)
    // - "Other" → "Other" (renders with light brown color + gray border)
    // - Valid node type → use that type
    let nodeType: string | null;
    if (componentType === "Uncategorized") {
      nodeType = null;
    } else if (apiType === "Other") {
      nodeType = "Other";
    } else if (apiType && validNodeTypes.includes(apiType)) {
      nodeType = apiType;
    } else {
      nodeType = "Other";
    }
    
    return { componentType, nodeType };
  };

  const createHubComponent = (
    result: any, 
    hubProviderId: string | null, 
    hubProviderHostname: string | null,
    availablePortTypes: any
  ): HubComponent => {
    // For public KNIME Hub components, the spaceId is typically "Examples"
    const spaceId = result.owner === "knime" ? "Examples" : result.owner;
    
    // Extract the short ID by removing the * prefix from the component ID
    const shortId = result.id?.startsWith("*") ? result.id.substring(1) : result.id;
    
    // Determine component type and node type
    const { componentType, nodeType } = getComponentTypes(result);
    
    // Convert base64 icon to data URI format
    let iconDataUri: string | undefined;
    if (result.icon?.data) {
      iconDataUri = `data:image/png;base64,${result.icon.data}`;
    }
    
    // Construct the Hub URL using the provider's hostname
    let hubUrl: string;
    if (hubProviderHostname) {
      const hostname = hubProviderHostname.startsWith("http") 
        ? hubProviderHostname 
        : `https://${hubProviderHostname}`;
      hubUrl = `${hostname}/s/${shortId}`;
    } else {
      // Fallback to Community Hub
      hubUrl = `https://hub.knime.com/s/${shortId}`;
    }
    
    // Create a proper NodeTemplate for drag & drop
    const nodeTemplate = createNodeTemplate(result, nodeType, iconDataUri, availablePortTypes);
    
    return {
      id: result.id || "",
      name: result.title || "Unnamed Component",
      description: result.description || "",
      author: result.owner || "Unknown",
      version: result.version?.toString() || "1.0.0",
      tags: result.tags || [],
      icon: result.icon?.data,
      downloadCount: result.downloadCount,
      rating: result.kudosCount,
      lastUpdated: result.lastEditedOn || result.versionCreatedOn || new Date().toISOString(),
      // Use the provider-specific URL
      hubUrl,
      // Hub space reference data for drag & drop
      providerId: hubProviderId || "knime-hub-id-not-found",
      spaceId,
      itemId: result.id || "",
      versionId: result.version?.toString(),
      // Component type from icon.type (Learner, Manipulator, Predictor, etc.)
      componentType,
      // Private flag from Hub API
      isPrivate: result.private === true,
      // Node template for proper drag & drop
      nodeTemplate,
    };
  };

  const fetchComponents = async (limit = MAX_TOTAL_COMPONENTS, offset = 0, forceRefresh = false) => {
    // Check if we should use cache
    if (!forceRefresh && components.value.length > 0) {
      // Already have components loaded
      return;
    }

    // Try to load from cache first (unless forcing refresh)
    if (!forceRefresh && initializeFromCache()) {
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const spaceProvidersStore = useSpaceProvidersStore();
      const hubProviders = Object.values(spaceProvidersStore.spaceProviders).filter(
        (provider) => provider.type === "HUB",
      );

      if (hubProviders.length === 0) {
        consola.warn("No Hub providers found");
        components.value = [];
        isLoading.value = false;
        return;
      }

      // Get available port types from application store
      const applicationStore = useApplicationStore();
      const availablePortTypes = applicationStore.availablePortTypes;

      // Fetch components from all Hub providers in parallel
      const allComponents: HubComponent[] = [];
      
      await Promise.all(
        hubProviders.map(async (hubProvider) => {
          try {
            const params = new URLSearchParams({
              offset: offset.toString(),
              type: "component",
              limit: limit.toString(),
              sort: "best",
            });

            if (searchTerm.value.trim()) {
              params.set("query", searchTerm.value.trim());
            }

            let url: string;
            if (hubProvider.hostname) {
              // Use the provider's hostname which will go through the backend's request filter
              // This adds authentication headers for authenticated users
              const hostname = hubProvider.hostname.startsWith("http") 
                ? hubProvider.hostname 
                : `https://${hubProvider.hostname}`;
              url = `${hostname}/search?${params.toString()}`;
            } else {
              // Skip providers without hostname
              consola.warn(`Hub provider ${hubProvider.id} has no hostname`);
              return;
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
              if (response.status === HTTP_UNAUTHORIZED) {
                // Authentication required - skip this provider silently
                consola.info(`Authentication required for ${hubProvider.name}, skipping`);
                return;
              }
              throw new Error(`Failed to fetch components from ${hubProvider.name}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Map Hub API response to HubComponent interface with the correct providerId and hostname
            const providerComponents = (data.results || []).map((result: any) => 
              createHubComponent(result, hubProvider.id, hubProvider.hostname ?? null, availablePortTypes)
            );
            
            allComponents.push(...providerComponents);
            
            consola.info(`Fetched components from ${hubProvider.name}`, {
              count: providerComponents.length,
              providerId: hubProvider.id,
            });
          } catch (err) {
            consola.error(`Failed to fetch from provider ${hubProvider.name}`, err);
            // Continue with other providers even if one fails
          }
        }),
      );

      components.value = allComponents;

      // Populate the component ID to hubUrl lookup map
      componentIdToHubUrl.value.clear();
      allComponents.forEach(component => {
        componentIdToHubUrl.value.set(component.id, component.hubUrl);
      });

      // Save to cache
      const currentAuthState = isHubAuthenticated();
      saveCacheToStorage(components.value, currentAuthState);
      lastAuthState.value = currentAuthState;

      consola.info("Fetched Hub components from all providers", {
        totalCount: components.value.length,
        providerCount: hubProviders.length,
        wasAuthenticated: currentAuthState,
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error occurred";
      components.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Invalidate cache and refetch components
   * Should be called after login/logout or app restart
   */
  const invalidateCacheAndRefetch = async () => {
    consola.info("Invalidating Hub components cache");
    clearCache();
    components.value = [];
    await fetchComponents(MAX_TOTAL_COMPONENTS, 0, true);
  };

  const setSearchTerm = (term: string) => {
    searchTerm.value = term;
  };

  const clearSearch = () => {
    searchTerm.value = "";
  };

  /**
   * Get all Hub providers (not LOCAL or SERVER types)
   */
  const getHubProviders = () => {
    const spaceProvidersStore = useSpaceProvidersStore();
    return Object.values(spaceProvidersStore.spaceProviders).filter(
      (provider) => provider.type === "HUB",
    );
  };

  /**
   * Set the selected Hub provider for filtering components
   */
  const setSelectedProviderId = (providerId: string | null) => {
    selectedProviderId.value = providerId;
  };

  /**
   * Get the hubUrl for a component by its ID
   * Used for drag & drop when only the component ID is available
   */
  const getHubUrlForComponentId = (componentId: string): string | null => {
    return componentIdToHubUrl.value.get(componentId) ?? null;
  };

  return {
    components,
    filteredComponents,
    groupedByCategory,
    searchTerm,
    isLoading,
    error,
    isAuthenticated,
    expandedCategories,
    selectedProviderId,
    fetchComponents,
    invalidateCacheAndRefetch,
    setSearchTerm,
    clearSearch,
    getCategoryTotalCount,
    categoryHasMore,
    loadMoreInCategory,
    toggleCategoryExpansion,
    isCategoryExpanded,
    getHubProviders,
    setSelectedProviderId,
    getHubUrlForComponentId,
  };
});
