/*
 * ------------------------------------------------------------------------
 *
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.com; Email: contact@knime.com
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License, Version 3, as
 *  published by the Free Software Foundation.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, see <http://www.gnu.org/licenses>.
 *
 *  Additional permission under GNU GPL version 3 section 7:
 *
 *  KNIME interoperates with ECLIPSE solely via ECLIPSE's plug-in APIs.
 *  Hence, KNIME and ECLIPSE are both independent programs and are not
 *  derived from each other. Should, however, the interpretation of the
 *  GNU GPL Version 3 ("License") under any applicable laws result in
 *  KNIME and ECLIPSE being a combined program, KNIME AG herewith grants
 *  you the additional permission to use and propagate KNIME together with
 *  ECLIPSE with only the license terms in place for ECLIPSE applying to
 *  ECLIPSE and the GNU GPL Version 3 applying for KNIME, provided the
 *  license terms of ECLIPSE themselves allow for the respective use and
 *  propagation of ECLIPSE together with KNIME.
 *
 *  Additional permission relating to nodes for KNIME that extend the Node
 *  Extension (and in particular that are based on subclasses of NodeModel,
 *  NodeDialog, and NodeView) and that only interoperate with KNIME through
 *  standard APIs ("Nodes"):
 *  Nodes are deemed to be separate and independent programs and to not be
 *  covered works.  Notwithstanding anything to the contrary in the
 *  License, the License does not apply to Nodes, you are not required to
 *  license Nodes under the License, and you are granted a license to
 *  prepare and propagate Nodes, in each case even if such Nodes are
 *  propagated with or for interoperation with KNIME.  The owner of a Node
 *  may freely choose the license terms applicable to such Node, including
 *  when such Node is propagated with or for interoperation with KNIME.
 * ---------------------------------------------------------------------
 *
 * History
 *   Jan 30, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map.Entry;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Predicate;
import java.util.stream.Stream;

import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.core.util.KnimeUrlType;
import org.knime.core.util.exception.ResourceAccessException;
import org.knime.core.webui.WebUIUtil;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvider.SpaceProviderConnection;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.api.SpaceDestinationPicker.Operation;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.LocalSpaceUtil;
import org.knime.ui.java.util.SpaceProvidersUtil;
import org.knime.workbench.explorer.dialogs.SpaceResourceSelectionDialog;
import org.knime.workbench.explorer.dialogs.Validator;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileInfo;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;

/**
 * Functions around spaces.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class SpaceAPI {

    private SpaceAPI() {
       // stateless
    }

    /**
     * Provides infos on all available {@link SpaceProviders}. It's a browser function because this functionality is
     * only available in the desktop AP (the desktop AP, e.g., can connect to multiple hubs).
     *
     * @return
     */
    @API
    static void getSpaceProviders() {
        SpaceProvidersUtil.sendSpaceProvidersChangedEvent(DesktopAPI.getDeps(SpaceProviders.class),
            DesktopAPI.getDeps(EventConsumer.class));
    }

    /**
     * Connects a space provider to its remote location. I.e. essentially calls {@link SpaceProvider#connect()}.
     *
     * @return A JSON object with all the space information. Returns {@code null} otherwise.
     */
    @API
    static String connectSpaceProvider(final String spaceProviderId) {
        final var spaceProvider = DesktopAPI.getDeps(SpaceProviders.class).getProvidersMap().get(spaceProviderId);
        if (spaceProvider != null && spaceProvider.getConnection(false).isEmpty()) {
            return SpaceProvidersUtil.buildSpaceProviderObjectNode(spaceProvider, true).toPrettyString();
        }
        return null;
    }

    /**
     *
     * Disconnects a space provider from its remote location. Essentially calls
     * {@link SpaceProviderConnection#disconnect()}.
     *
     * @param spaceProviderId
     */
    @API
    static void disconnectSpaceProvider(final String spaceProviderId) {
        var spaceProvider = DesktopAPI.getDeps(SpaceProviders.class).getProvidersMap().get(spaceProviderId);
        if (spaceProvider != null) {
            spaceProvider.getConnection(false).ifPresent(SpaceProviderConnection::disconnect);
        }
    }

    /**
     * Checks if the names of the corresponding space items already exists within the destination workflow group. If so,
     * it will present a dialog to select the preferred solution for it.
     *
     * @param spaceProviderId The space provider ID
     * @param spaceId The space ID
     * @param itemIds The space item IDs
     * @param destWorkflowGroupId The destination workflow group ID
     * @return Can be one of the {@link Space.NameCollisionHandling}-values or 'CANCEL'
     */
    @API
    static String getNameCollisionStrategy(final String spaceProviderId, final String spaceId, final Object[] itemIds,
        final String destWorkflowGroupItemId) {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        return determineNameCollisionHandling(space, itemIds, destWorkflowGroupItemId) //
            .map(NameCollisionHandling::toString) //
            .orElse("CANCEL");
    }

    private static Optional<NameCollisionHandling> determineNameCollisionHandling(final Space space,
        final Object[] itemIds, final String destWorkflowGroupItemId) {
        final var nameCollisions = NameCollisionChecker.checkForNameCollisions(space, destWorkflowGroupItemId, itemIds);
        return nameCollisions.isEmpty() ? Optional.of(Space.NameCollisionHandling.NOOP) : NameCollisionChecker //
                    .openDialogToSelectCollisionHandling(space, destWorkflowGroupItemId, nameCollisions);
    }
    /**
     * Copies space items from Local to Hub space or vice versa.
     *
     * @param spaceProviderId provider ID of the source space
     * @param spaceId ID of the source space
     * @param arr array of item IDs
     * @return {@code true} if all files could be uploaded, {@code false} otherwise
     */
    @API
    @SuppressWarnings("java:S2440") // false positive for SpaceDestinationPicker
    static boolean copyBetweenSpaces(final String spaceProviderId, final String spaceId, final Object[] arr) {
        if (arr.length == 0) {
            return true;
        }

        final var spaceProviders = DesktopAPI.getDeps(SpaceProviders.class);
        final var sourceSpaceProvider = getSpaceProvider(spaceProviderId);

        final var sourceSpace = sourceSpaceProvider.getSpace(spaceId);
        final var selection = Arrays.stream(arr) //
                .map(String.class::cast) //
                .map(sourceSpace::toKnimeUrl) //
                .map(ExplorerFileSystem.INSTANCE::getStore) //
                .toList();

        final var isUpload = sourceSpace instanceof LocalWorkspace;
        final var mountIds = !isUpload ? new String[] { LocalWorkspace.LOCAL_WORKSPACE_ID.toUpperCase(Locale.ROOT) }
            : spaceProviders.getProvidersMap().entrySet().stream() //
                .filter(provider -> provider.getValue().getType() != TypeEnum.LOCAL
                    && provider.getValue().getConnection(false).isPresent()) //
                .map(Entry::getKey) //
                .toArray(String[]::new);

        if (mountIds.length == 0) {
            DesktopAPUtil.showWarning("No Hub spaces available", "Please log into the Hub you want to upload to.");
            return false;
        }

        final var destPicker = new SpaceDestinationPicker(mountIds, isUpload ? Operation.UPLOAD : Operation.DOWNLOAD);
        if (!destPicker.open()) {
            return false;
        }
        final var destInfo = destPicker.getSelectedDestination();

        final var destinationStore = destInfo.getDestination();
        final var excludeData = destInfo.isExcludeData();
        final var targetMountId = destinationStore.getMountID();
        final SpaceProvider targetSpaceProvider;
        if (targetMountId.equalsIgnoreCase(LocalWorkspace.LOCAL_WORKSPACE_ID)) {
            targetSpaceProvider = LocalSpaceUtil.createLocalWorkspaceProvider();
        } else {
            targetSpaceProvider = getSpaceProvider(targetMountId);
        }
        final var shellProvider = PlatformUI.getWorkbench().getModalDialogShellProvider();
        return ClassicAPCopyMoveLogic.copy(shellProvider, sourceSpaceProvider, selection, targetSpaceProvider,
            destinationStore, excludeData);
    }

    /**
     * Move or copy a set of space items from one folder into another one inside the same Hub (i.e., space provider).
     *
     * @param spaceProviderId space provider ID of the Hub
     * @param sourceSpaceId space ID of the source items
     * @param doCopy {@code true} for copying, {@code false} for moving
     * @param sourceItemIds array of source item IDs
     * @return {@code true} on success, {@code false} on failure or cancellation
     */
    @API
    static boolean moveOrCopyToSpace(final String spaceProviderId, final String sourceSpaceId, // NOSONAR complexity is OK
            final boolean doCopy, final Object[] sourceItemIds) {
        if (sourceItemIds.length == 0) {
            return true;
        }
        final var sourceSpaceProvider = getSpaceProvider(spaceProviderId);
        final var sourceSpace = sourceSpaceProvider.getSpace(sourceSpaceId);
        // this is really an illegal argument, since we deal with remote copy/move
        if (sourceSpace instanceof LocalWorkspace) {
            final var copyText = doCopy ? "copy" : "move";
            DesktopAPUtil.showError("Cannot %s from the local space".formatted(copyText),
                "Cannot move item(s) from the local space.");
            return false;
        }

        final var optDestination = pickDestinationFolder(spaceProviderId, doCopy);
        if (optDestination.isEmpty()) {
            return false;
        }
        final var destination = optDestination.get();

        final var destinationProvider = getSpaceProvider(destination.spaceProviderId());
        final var destinationWorkflowGroupItemId = destination.itemId();
        final var destinationSpace = destinationProvider.getSpace(destination.spaceId());

        final var optCollisionHandling =
                determineNameCollisionHandling(destinationSpace, sourceItemIds, destinationWorkflowGroupItemId);
        if (optCollisionHandling.isEmpty()) {
            return false;
        }

        try {
            final var itemIds = Arrays.stream(sourceItemIds).map(String.class::cast).toList();
            final var collisionHandling = optCollisionHandling.get();
            destinationSpace.moveOrCopyItems(itemIds, destinationWorkflowGroupItemId, collisionHandling, doCopy);
            return true;
        } catch (final IOException e) {
            DesktopAPUtil.showAndLogError("Unable to %s item".formatted(doCopy ? "copy" : "move"),
                "An unexpected exception occurred while %s the item".formatted(doCopy ? "copying" : "moving"),
                NodeLogger.getLogger(SpaceAPI.class), e);
            return false;
        }
    }

    private static Optional<ItemIds> pickDestinationFolder(final String spaceProviderId, final boolean doCopy) {
        // Obtain the destination space and workflow group item id via the classic SpaceDestinationPicker,
        // but restrict available mount points to the source Hub.
        // When ModernUI provides a destination picker, this detour is not needed anymore.
        final var destPicker = new SpaceDestinationPicker(new String[] { spaceProviderId }, doCopy ? Operation.COPY :
            Operation.MOVE);
        if (!destPicker.open()) {
            return Optional.empty();
        }
        final var destinationInfo = destPicker.getSelectedDestination();
        final var destinationStore = destinationInfo.getDestination();
        final var uri = destinationStore.toURI();
        final var ids = resolveIds(DesktopAPI.getDeps(SpaceProviders.class), uri)
                // we _just_ picked the destination from Hub, so it must be available...
                .orElseThrow();
        return Optional.of(ids);
    }

    /**
     * Resolves an absolute KNIME URL to a triple of space provider ID, space ID and item ID.
     *
     * @param spaceProviders available space providers
     * @param uri URL to be resolved
     * @return triple of IDs if resolution succeeded, {@link Optional#empty()} otherwise
     */
    private static Optional<ItemIds> resolveIds(final SpaceProviders spaceProviders, final URI uri) {
        if (KnimeUrlType.MOUNTPOINT_ABSOLUTE != KnimeUrlType.getType(uri)
            .orElseThrow(() -> new IllegalArgumentException("Not a KNIME URL: \"%s\"".formatted(uri)))) {
            throw new IllegalArgumentException("Not mountpoint-absolute: \"%s\"".formatted(uri));
        }
        final var mountId = uri.getAuthority();
        final var providerId = "LOCAL".equals(mountId) ? SpaceProvider.LOCAL_SPACE_PROVIDER_ID : mountId;
        final var provider = spaceProviders.getProvidersMap().get(providerId);
        final var spaceAndItemIds = provider.resolveSpaceAndItemId(uri);
        return spaceAndItemIds.map(ids -> new ItemIds(providerId, ids.spaceId(), ids.itemId()));
    }

    /**
     * @param spaceProviderId ID of the space provider containing the item
     * @param spaceId ID of the space in provider with ID {@code spaceProviderId} containing the item
     * @param itemId ID of the item contained in space with ID {@code spaceId}
     */
    private record ItemIds(String spaceProviderId, String spaceId, String itemId) {}

    /**
     * Opens the website of an item in the web browser
     *
     * @param spaceProviderId provider ID of the source space
     * @param spaceId ID of the source space
     * @param itemId ID of the selected item
     * @throws NoSuchElementException if there is no space provider, space or item for the given id
     */
    @API
    static void openInBrowser(final String spaceProviderId, final String spaceId, final String itemId) {
        final var sourceSpaceProvider = getSpaceProvider(spaceProviderId);
        String url;
        final var sourceSpace = sourceSpaceProvider.getSpace(spaceId);
        if (sourceSpaceProvider.getType() == TypeEnum.HUB) {
            url = ClassicAPBuildHubURL.getHubURL(itemId, sourceSpaceProvider, sourceSpace);
        } else if (sourceSpaceProvider.getType() == TypeEnum.SERVER) {
            url = ClassicAPBuildServerURL.getWebPortalURL(itemId, sourceSpaceProvider, sourceSpace);
        } else {
            throw new IllegalStateException("Operation not supported for local items");
        }
        WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(url, EclipseUIAPI.class);
    }

    /**
     * Opens the API definition of a workflow (Swagger)
     *
     * @param spaceProviderId provider ID of the source space
     * @param spaceId ID of the source space
     * @param itemId ID of the selected item
     * @throws NoSuchElementException if there is no space provider, space or item for the given id
     */
    @API
    static void openAPIDefinition(final String spaceProviderId, final String spaceId, final String itemId) {
        final var spaceProviders = DesktopAPI.getDeps(SpaceProviders.class);
        final var sourceSpaceProvider = getSpaceProvider(spaceProviderId);
        final var sourceSpace = sourceSpaceProvider.getSpace(spaceId);
        final var url = ClassicAPBuildServerURL.getAPIDefinition(itemId, sourceSpaceProvider, sourceSpace);
        WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(url, EclipseUIAPI.class);
    }

    /**
     * Saves a job as a workflow on the same space.
     *
     * @param spaceProviderId
     * @param spaceId
     * @param itemId
     * @param jobId
     * @return the workflow derived from the job or {@code null} if the workflow could not be saved
     * @throws ResourceAccessException
     * @throws NoSuchElementException if there is no job for the given ids
     */
    @API
    static String saveJobAsWorkflow(final String spaceProviderId, final String spaceId, final String itemId,
        final String jobId, final String jobName) throws ResourceAccessException {

        final var destination = promptDestination(jobName, spaceProviderId);
        if (destination == null) {
            return null;
        }

        var destinationFileStore = destination.fileStore();
        final var destInfo = destinationFileStore.fetchInfo();
        final var isWorkflowGroup = destInfo.isWorkflowGroup();
        // else it's a Workflow (due to Validator)

        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);

        if (!isWorkflowGroup) {
            // workflow, ask for overwrite
            final var ask = DesktopAPUtil.openQuestion("Confirm to overwrite",
                "The following workflow will be overwritten:\n" + destination + "\nAre you sure?");
            if (!ask) {
                return null;
            }
            final var parent = destinationFileStore.getParent();
            final var parentPath = org.eclipse.core.runtime.Path.forPosix(parent.getFullName());
            return encodeSpaceItemEnt(space.saveJobAsWorkflow(parentPath, destinationFileStore.getName(), jobId));
        }

        // selected a workflow group
        if (!destInfo.isModifiable()) {
            DesktopAPUtil.showError("Read-only destination",
                "The workflow cannot be saved since the selected destination is read-only: \""
                        + destinationFileStore.getMountIDWithFullPath() + "\"");
            return null;
        }
        final var name = destination.name();
        if (name == null) {
            throw new IllegalStateException("Missing workflow name");
        }

        final var groupPath = org.eclipse.core.runtime.Path.forPosix(destinationFileStore.getFullName());
        final var workflowGroupItemId = space.getItemIdByURI(destinationFileStore.toURI()).orElseThrow();
        final var nameCollisions = NameCollisionChecker.checkForNameCollisions(space, workflowGroupItemId,
            Stream.of(name));
        if (nameCollisions.isEmpty()) {
            return encodeSpaceItemEnt(space.saveJobAsWorkflow(groupPath, name, jobId));
        }

        final AtomicReference<NameCollisionHandling> collisionHandlingStrategyRef = new AtomicReference<>();
        Display.getDefault().syncExec(() ->
            NameCollisionChecker.openDialogToSelectCollisionHandling(space, workflowGroupItemId, nameCollisions)
                .ifPresent(collisionHandlingStrategyRef::set)
        );
        final var strategy = collisionHandlingStrategyRef.get();
        if (strategy == null) {
            // aborted
            return null;
        }

        if (NameCollisionHandling.OVERWRITE == strategy) {
            return encodeSpaceItemEnt(space.saveJobAsWorkflow(groupPath, name, jobId));
        }

        // It is NameCollisionHandling.AUTORENAME since we got collisions, so it should not be NOOP
        final Predicate<String> taken = testName -> space.containsItemWithName(workflowGroupItemId, testName);
        final var newName = Space.generateUniqueSpaceItemName(taken, name, true);
        return encodeSpaceItemEnt(space.saveJobAsWorkflow(groupPath, newName, jobId));
    }

    private static String encodeSpaceItemEnt(final SpaceItemEnt ent) {
        // This works around the fact that Chromium cannot handle our custom Object return types
        // (e.g. DefaultSpaceItemEnt)
        return ent.getId();
    }

    private static record Destination(String name, RemoteExplorerFileStore fileStore) {
    }

    private static Destination promptDestination(final String defaultWorkflowName, final String spaceProviderId) {
        final var sh = SWTUtilities.getActiveShell();
        final var dialog = new SpaceResourceSelectionDialog(sh, new String[]{spaceProviderId}, null);
        dialog.setNameFieldEnabled(true);
        dialog.setNameFieldDefaultValue(defaultWorkflowName);
        dialog.setTitle("Target workflow group selection");
        dialog.setDescription("Select the location to save the selected job to as a workflow.");
        dialog.setValidator(new Validator() {
            @Override
            public String validateSelectionValue(final AbstractExplorerFileStore selection, final String name) {
                if (selection == null) {
                    return "Select a workflow or workflow group as target";
                }
                AbstractExplorerFileInfo info = selection.fetchInfo();
                boolean isWorkflowGroup = info.isWorkflowGroup();
                boolean isWorkflow = info.isWorkflow();

                if (!isWorkflow && !isWorkflowGroup) {
                    return "Only workflows or workflow groups can be selected as target.";
                } else if (!info.isModifiable()) {
                    return "You have no write permissions for the selected " + (isWorkflow ? "workflow." : "workflow group.");
                }

                dialog.setNameFieldEnabled(isWorkflowGroup);

                // In case a workflow is selected we use _its_ name and not the dialog name
                return isWorkflowGroup ? ExplorerFileSystem.validateFilename(dialog.getNameFieldValue()) : null;
            }
        });
        if (Window.OK == dialog.open()) {
            return new Destination(dialog.getNameFieldValue(), (RemoteExplorerFileStore)dialog.getSelection());
        } else {
            return null;
        }
    }

    @API
    static String editSchedule(final String spaceProviderId, final String spaceId, final String itemId,
            final String scheduleId) throws ResourceAccessException {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        return space.editScheduleInfo(itemId, scheduleId);
    }

    private static SpaceProvider getSpaceProvider(final String spaceProviderId) {
        final var spaceProviders = DesktopAPI.getDeps(SpaceProviders.class);
        if (spaceProviders == null) {
            throw new NoSuchElementException("Available space providers could not be determined.");
        }
        var spaceProvider = spaceProviders.getProvidersMap().get(spaceProviderId);
        if (spaceProvider == null) {
            throw new NoSuchElementException("Space provider '" + spaceProviderId + "' not found.");
        }
        return spaceProvider;
    }
}
