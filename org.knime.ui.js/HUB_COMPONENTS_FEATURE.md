# Hub Components Sidebar Feature

## Overview
A new sidebar panel tab for browsing and discovering components from hub.knime.com, providing functionality similar to the Node Repository but focused on KNIME Hub components.

## Implementation Summary

### 1. Store Layer (`src/store/hubComponents.ts`)
Created a Pinia store to manage Hub component state:

**State:**
- `components`: Array of `HubComponent` objects
- `searchTerm`: Current search query
- `isLoading`: Loading state indicator
- `error`: Error message (if any)

**Actions:**
- `fetchComponents()`: Fetches components from Hub API (currently with mock data fallback)
- `setSearchTerm()`: Updates search query
- `clearSearch()`: Resets search

**HubComponent Interface:**
```typescript
{
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
}
```

### 2. UI Components

#### `HubComponentBrowser.vue`
Main container component with:
- Search functionality using `SearchInput` from KDS
- Refresh button to reload components
- Loading, error, and empty states
- Uses `SidebarPanelLayout` for consistent styling
- Client-side filtering by name, description, and tags

#### `HubComponentList.vue`
List container that:
- Renders array of `HubComponentCard` components
- Manages component selection state
- Scrollable container with gap spacing

#### `HubComponentCard.vue`
Individual component card displaying:
- Component icon (with fallback SVG)
- Name and author
- Description (truncated to 2 lines)
- Tags (first 3 with "+N more" indicator)
- Version, rating (★), and last updated date
- "Open in Hub" link button
- Hover and selected states

### 3. Sidebar Integration

#### Panel Store Updates (`src/store/panel.ts`)
- Added `HUB_COMPONENTS: "hubComponents"` to `TABS` constant

#### Sidebar Component (`src/components/sidebar/Sidebar.vue`)
- Imported `CloudComponentIcon` from KNIME styles
- Added async component definition for `HubComponentBrowser`
- Registered new tab in `sidebarSections` computed property
- Added conditional rendering in template
- Fixed PostCSS mixin issues (replaced `@mixin` calls with direct CSS)

## Features

### Search & Discovery
- Real-time client-side search filtering
- Searches across: component name, description, tags
- Clear search functionality

### Component Display
- Card-based layout with visual hierarchy
- Component metadata (version, rating, downloads)
- Tag display with overflow handling
- Direct links to Hub pages

### State Management
- Loading indicators during fetch
- Error handling with retry functionality
- Empty state messaging
- Component selection tracking

## Styling

All components follow KNIME Design System patterns:
- KDS color tokens (`--knime-*`)
- KDS spacing variables (`--spacing-*`)
- Consistent typography and transitions
- Theme-aware (works with light/dark/legacy modes)

## Integration Points

### API Integration
Currently uses mock data fallback. To connect to real Hub API:

```typescript
// In src/store/hubComponents.ts, update fetchComponents():
const response = await fetch("https://hub.knime.com/api/v1/components");
```

Replace with actual Hub API endpoint when available.

### UI Controls
The Hub Components tab is always visible (not behind a feature flag). To add conditional visibility:

```typescript
// In Sidebar.vue, use registerSidebarSection:
...registerSidebarSection(uiControls.canAccessHubComponents, {
  name: TABS.HUB_COMPONENTS,
  // ...
}),
```

## File Structure

```
org.knime.ui.js/
├── src/
│   ├── components/
│   │   ├── hubComponents/
│   │   │   ├── HubComponentBrowser.vue   (Main container)
│   │   │   ├── HubComponentList.vue      (List wrapper)
│   │   │   └── HubComponentCard.vue      (Individual cards)
│   │   └── sidebar/
│   │       └── Sidebar.vue               (Updated)
│   └── store/
│       ├── hubComponents.ts              (New store)
│       └── panel.ts                      (Updated TABS)
```

## Future Enhancements

1. **Real Hub API Integration**: Replace mock data with actual Hub API calls
2. **Advanced Filtering**: Add filters for tags, author, rating, download count
3. **Sorting**: Allow sorting by name, downloads, rating, date
4. **Component Preview**: Show detailed preview in extension panel (similar to NodeDescription)
5. **Component Installation**: Add ability to install/import components directly
6. **Pagination**: Handle large numbers of components efficiently
7. **Grid/List View Toggle**: Allow users to switch between card grid and compact list
8. **Favorites/Bookmarks**: Save frequently used components
9. **Recent Components**: Track and show recently viewed/used components
10. **Category Filtering**: Group components by categories similar to Node Repository

## Testing Checklist

- [ ] Tab appears in sidebar with cloud-component icon
- [ ] Clicking tab activates Hub Components panel
- [ ] Search input filters components correctly
- [ ] Clear search button works
- [ ] Refresh button reloads components
- [ ] Component cards display all metadata
- [ ] "Open in Hub" links work
- [ ] Loading state shows during fetch
- [ ] Error state handles failures gracefully
- [ ] Empty state shows when no components match
- [ ] Component selection highlighting works
- [ ] Scrolling works for long component lists
- [ ] Theme switching affects component styles correctly

## Known Limitations

1. Currently uses mock data until Hub API is integrated
2. No server-side search/filtering
3. No pagination (loads all components at once)
4. No component installation functionality yet
5. Component icons may not be available from Hub API
6. Rating and download count may need API support

## Dependencies

**External:**
- `@knime/components`: SearchInput, FunctionButton, Tag
- `@knime/styles`: CloudComponentIcon
- `pinia`: State management
- `vue`: Composition API

**Internal:**
- `SidebarPanelLayout`: Consistent panel structure
- Panel store: Tab management
- KNIME Design System tokens
