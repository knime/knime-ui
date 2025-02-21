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

import static org.knime.ui.java.api.DesktopAPI.MAPPER;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.core.util.exception.ResourceAccessException;
import org.knime.core.webui.WebUIUtil;
import org.knime.gateway.api.webui.entity.ShowToastEventEnt;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.OperationNotAllowedException;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.ToastService;
import org.knime.gateway.impl.webui.entity.AppStateEntityFactory;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.gateway.impl.webui.spaces.Space.TransferResult;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvider.SpaceProviderConnection;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager.Key;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.ui.java.api.NameCollisionChecker.UsageContext;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.dialogs.SpaceResourceSelectionDialog;
import org.knime.workbench.explorer.dialogs.Validator;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileInfo;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Functions around spaces.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class SpaceAPI {

    private static final String ASYNC_UPLOAD_FEATURE_FLAG = "knime.hub.async_upload";

    private static final String ASYNC_DOWNLOAD_FEATURE_FLAG = "knime.hub.async_download";

    private static boolean systemPropertyIsFalse(final String propertyName) {
        return Boolean.FALSE.toString() //
            .equalsIgnoreCase(System.getProperty(propertyName));
    }

    private static final NodeLogger LOGGER = NodeLogger.getLogger(SpaceAPI.class);

    private SpaceAPI() {
        // stateless
    }

    /**
     * Tries to connect a space provider to its remote location if it's not connected already and returns the space
     * provider information (no matter whether it has been connected already or not).
     *
     * @return A JSON object with all the space provider information.
     * @throws JsonProcessingException if the result couldn't be serialized
     * @throws NoSuchElementException if there is no space provider for the given id
     */
    @API(runInUIThread = false)
    static String connectSpaceProvider(final String spaceProviderId) throws JsonProcessingException {
        final var spaceProvider = DesktopAPI.getDeps(SpaceProvidersManager.class).getSpaceProviders(Key.defaultKey())
            .getSpaceProvider(spaceProviderId);
        if (spaceProvider == null) {
            throw new NoSuchElementException("Space provider '" + spaceProviderId + "' not found.");
        }
        var isConnected = spaceProvider.getConnection(false).isPresent();
        return ObjectMapperUtil.getInstance().getObjectMapper()
            .writeValueAsString(AppStateEntityFactory.buildSpaceProviderEnt(spaceProvider, !isConnected));
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
        var spaceProvider = DesktopAPI.getDeps(SpaceProvidersManager.class).getSpaceProviders(Key.defaultKey())
            .getSpaceProvider(spaceProviderId);
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
     * @param destWorkflowGroupItemId The item ID of the destination workflow group
     * @param context The {@link UsageContext} in string form for this collision check
     * @return Can be one of the {@link Space.NameCollisionHandling}-values or 'CANCEL'
     */
    @API
    static String getNameCollisionStrategy(final String spaceProviderId, final String spaceId, final Object[] itemIds,
        final String destWorkflowGroupItemId, final String context) {
        final var space = DesktopAPI.getSpace(spaceProviderId, spaceId);
        return determineNameCollisionHandling(space, itemIds, destWorkflowGroupItemId, UsageContext.valueOf(context)) //
            .map(NameCollisionHandling::toString) //
            .orElse("CANCEL");
    }

    private static Optional<NameCollisionHandling> determineNameCollisionHandling(final Space space,
        final Object[] itemIds, final String destWorkflowGroupItemId, final UsageContext context) {
        final var nameCollisions = NameCollisionChecker.checkForNameCollisions(space, destWorkflowGroupItemId, itemIds);
        return nameCollisions.isEmpty() ? Optional.of(Space.NameCollisionHandling.NOOP) : NameCollisionChecker //
            .openDialogToSelectCollisionHandling(space, destWorkflowGroupItemId, nameCollisions, context);
    }

    /**
     * Copies space items from Local to Hub space or vice versa.
     *
     * @return {@code true} if all files could be uploaded, {@code false} otherwise
     */
    @API
    @SuppressWarnings({"java:S1941", "java:S1142"})
    static boolean copyBetweenSpaces( //
        final String sourceProviderId, //
        final String sourceSpaceId, //
        final Object[] sourceItemIdsParam, //
        final String destinationProviderId, //
        final String destinationSpaceId, //
        final String destinationItemId, //
        final boolean excludeData //
    ) { // NOSONAR
        final var sources = new Locator.Siblings(sourceProviderId, sourceSpaceId,
            Stream.of(sourceItemIdsParam).map(String.class::cast).toList());
        final var destination = Locator.Destination.of(destinationProviderId, destinationSpaceId, destinationItemId);
        if (sources.itemIds().isEmpty()) {
            return true;
        }

        if (sources.isLocal()) {
            final var opened = findDirtyOpenedWorkflows((LocalSpace)sources.space(), sources.itemIds());
            if (!opened.isEmpty()) {
                showDirtyWorkflowsWarningToUser(opened);
                return false;
            }
        }

        final var asyncUploadDisabled = systemPropertyIsFalse(ASYNC_UPLOAD_FEATURE_FLAG);
        final var asyncDownloadDisabled = systemPropertyIsFalse(ASYNC_DOWNLOAD_FEATURE_FLAG);
        if (!asyncUploadDisabled && sources.isLocal() && destination.isHub()) {
            try {
                return performAsyncHubUpload(sources, destination, excludeData);
            } catch (OperationNotAllowedException e) { // NOSONAR
                // fall through to the default upload
            } catch (Exception ex) { // NOSONAR
                LOGGER.error("Upload error: " + ex.getMessage(), ex);
                showErrorToast("Upload error", ex.getMessage() + "\n\nSee the KNIME Log for details", false);
                return false;
            }
        } else if (!asyncDownloadDisabled && sources.isHub() && destination.isLocal()) {
            try {
                return performAsyncHubDownload(sources, destination);
            } catch (Exception ex) { // NOSONAR
                LOGGER.error("Download error: " + ex.getMessage(), ex);
                showErrorToast("Download error", ex.getMessage() + "\n\nSee the KNIME Log for details", false);
                return false;
            }
        }

        // old upload/download flow
        final var sourceFileStores = sources.itemIds().stream() //
            .map(itemId -> ExplorerMountTable.getFileSystem().getStore(sources.space().toKnimeUrl(itemId))).toList();
        final var destinationFileStore =
            ExplorerMountTable.getFileSystem().getStore((destination.space().toKnimeUrl(destination.itemId())));
        final var shellProvider = PlatformUI.getWorkbench().getModalDialogShellProvider();
        return ClassicAPCopyMoveLogic.copy( //
            shellProvider, //
            sources.provider(), //
            sourceFileStores, //
            destination.provider(), //
            destinationFileStore, //
            excludeData //
        );
    }

    private static boolean performAsyncHubDownload(final Locator.Siblings sources,
        final Locator.Destination destination) throws OperationNotAllowedException {
        final TransferResult result = sources.space().downloadInto( //
            sources.itemIds(), //
            (LocalSpace)destination.space(), //
            destination.itemId()//
        );
        if (result.errorTitleAndDescription() != null) {
            showErrorToast(result.errorTitleAndDescription().getFirst(), result.errorTitleAndDescription().getSecond(),
                false);
        }
        return result.successful();
    }

    private static boolean performAsyncHubUpload(final Locator.Siblings sources, final Locator.Destination destination,
        final boolean excludeData) throws OperationNotAllowedException {
        var uploadDeclined = !showUploadWarning(destination);
        if (uploadDeclined) {
            return false;
        }

        var result = destination.space().uploadFrom( //
            (LocalSpace)sources.space(), //
            sources.itemIds(), //
            destination.itemId(), //
            excludeData //
        );
        if (result.errorTitleAndDescription() != null) {
            showErrorToast(result.errorTitleAndDescription().getFirst(), result.errorTitleAndDescription().getSecond(),
                false);
        }
        return result.successful();
    }

    private static boolean showUploadWarning(final Locator.Destination destination) {
        if (destination.space().toEntity().isPrivate()) { // NOSONAR
            return true;
        }
        var contentProvider = ExplorerMountTable.getMountedContent().values().stream()
            .filter(provider -> provider.getMountID().equals(destination.provider().getId())).findFirst();
        if (contentProvider.isEmpty()) {
            return false;
        }
        var response = contentProvider.get().showUploadWarning(destination.space().getName());
        return response.isOK();
    }

    private static void showErrorToast(final String title, final String message, final boolean autoRemove) {
        DesktopAPI.getDeps(ToastService.class).showToast(ShowToastEventEnt.TypeEnum.ERROR, title, message, autoRemove);
    }

    @Deprecated(forRemoval = true) // this should be done by frontend in the future
    private static void showDirtyWorkflowsWarningToUser(final List<String> opened) {
        final var numOpened = opened.size();
        final var list = opened.stream().limit(5) //
            .map(path -> " • " + StringUtils.abbreviateMiddle(path, "...", 64)) //
            .collect(Collectors.joining("\n"));
        final boolean single = numOpened == 1;
        showErrorToast("Cannot upload unsaved workflows/components",
            (single ? "One item you've selected is currently open with unsaved changes:\n\n"
                : "Some items you've selected are currently open with unsaved changes:\n\n") + list
                + (numOpened > 5 ? ("\n • ... (" + (numOpened - 5) + " more)") : "") + "\n\n"
                + (single ? "Please save it or exclude it from the upload."
                    : "Please save them or exclude them from the upload."),
            false);
    }

    private static List<String> findDirtyOpenedWorkflows(final LocalSpace space, final List<String> itemIds) {
        final var projects = DesktopAPI.getDeps(ProjectManager.class);
        final var spaceRoot = space.getRootPath();
        final var dirtyAndOpen = new ArrayList<String>();
        for (final var itemId : itemIds) {
            var openProjectWithId = projects.getProject( //
                SpaceProvider.LOCAL_SPACE_PROVIDER_ID, //
                LocalSpace.LOCAL_SPACE_ID, //
                itemId //
            );
            var isDirty = openProjectWithId //
                .map(Project::getID) //
                .map(id -> projects.getDirtyProjectsMap().getOrDefault(id, false)).orElse(false);
            if (isDirty) {
                final var localDir = space.toLocalAbsolutePath(null, itemId).orElseThrow();
                final var relPath = spaceRoot.relativize(localDir);
                dirtyAndOpen.add(FilenameUtils.separatorsToUnix(relPath.toString()));
            }
        }
        return dirtyAndOpen;
    }

    /**
     * Move/copy space items within a non-local space provider.
     *
     * @param spaceProviderId space provider ID of the Hub
     * @param sourceSpaceId space ID of the source items
     * @param doCopy {@code true} for copying, {@code false} for moving
     * @param sourceItemIdsParam array of source item IDs
     * @return {@code SUCCESS} if the operation was performed successfully. {@code COLLISION} if no collision handling
     *         strategy was specified but a name collision occured - in this case the caller should try again with a
     *         collision handling strategy. {@code FAILURE} if the operation failed.
     */
    @API
    @SuppressWarnings({"java:S1941"})
    static String moveOrCopyToSpace( //
        final String spaceProviderId, //
        final String sourceSpaceId, //
        final boolean doCopy, //
        final Object[] sourceItemIdsParam, //
        final String destinationSpaceId, //
        final String destinationItemId, //
        final String nameCollisionHandlingParam //
    ) {
        if (sourceItemIdsParam.length == 0) {
            return MoveOrCopyResult.SUCCESS.toString();
        }

        final var sources = new Locator.Siblings(spaceProviderId, sourceSpaceId,
            Arrays.stream(sourceItemIdsParam).map(String.class::cast).toList());
        final var destination = new Locator.Item(spaceProviderId, destinationSpaceId, destinationItemId);

        var collisionHandling = NameCollisionHandling.of(nameCollisionHandlingParam);
        if ( //
        collisionHandling.isEmpty() //
            && NameCollisionChecker.test(destination.space(), destination.itemId(), sources.itemIds()) //
        ) {
            // Clients (frontend) need to try again with a collision handling strategy parameter specified.
            return MoveOrCopyResult.COLLISION.toString();
        }
        // If empty, there is no collision. Perform operation with "NOOP" strategy, which will fail in case
        //  the operation itself determines a collision (unexpected case, this would be an implementation mistake).
        var effectiveCollisionHandling = collisionHandling.orElse(NameCollisionHandling.NOOP);

        try {
            destination.space().moveOrCopyItems(sources.itemIds(), destination.itemId(), effectiveCollisionHandling,
                doCopy);
        } catch (IOException e) {
            DesktopAPUtil.showAndLogError("Unable to %s item".formatted(doCopy ? "copy" : "move"),
                "An unexpected exception occurred while %s the item".formatted(doCopy ? "copying" : "moving"),
                NodeLogger.getLogger(SpaceAPI.class), e);
            return MoveOrCopyResult.FAILURE.toString();
        }
        return MoveOrCopyResult.SUCCESS.toString();
    }

    private enum MoveOrCopyResult {
            SUCCESS, COLLISION, FAILURE
    }

    /**
     * Retrieves ancestor information necessary to reveal a project in the space explorer
     *
     * @return An object containing the ancestor item IDs and a boolean whether the project name has changed or not
     * @throws IOException If the ancestors could not be retrieved
     */
    @API
    static String getAncestorInfo(final String providerId, final String spaceId, final String itemId)
        throws IOException {
        final var space = DesktopAPI.getSpace(providerId, spaceId);
        try {
            final var ancestorItemIds = space.getAncestorItemIds(itemId);
            // The known project name may be outdated. Return the new name to check this e.g. on "Reveal in Space
            // Explorer" and display a notification.
            final var itemName = space.getItemName(itemId);
            return buildAncestorInfo(ancestorItemIds, itemName).toString();
        } catch (ResourceAccessException e) {
            // The project name may have changed on the remote side, so for an informative message, the name as
            // currently known by the application is used.
            final var projectName = DesktopAPI.getDeps(ProjectManager.class) //
                .getProject(providerId, spaceId, itemId) //
                .map(Project::getName) //
                .orElse("the project");
            throw new IOException(
                "Failed to reveal '%s' in space. Maybe it was deleted remotely?".formatted(projectName), e);
        }
    }

    private static ObjectNode buildAncestorInfo(final List<String> ancestorItemIds, final String itemName) {
        final var objectNode = MAPPER.createObjectNode();
        final var arrayNode = objectNode.putArray("ancestorItemIds");
        ancestorItemIds.forEach(arrayNode::add);
        objectNode.put("itemName", itemName);
        return objectNode;
    }

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
        final var sourceSpaceProvider = DesktopAPI.getSpaceProvider(spaceProviderId);
        final var sourceSpace = sourceSpaceProvider.getSpace(spaceId);
        try {
            URI url = sourceSpace.getItemURI(itemId).orElseThrow(() -> new IllegalStateException("Operation not supported for this provider"));
            WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(url.toString(), EclipseUIAPI.class);
        } catch (ResourceAccessException e) {
            // in the future, this could also be handled by exception handling for desktop API calls in the frontend
            showErrorToast("Could not show item in browser", "Check that the item still exists.", true);
            LOGGER.error("Could not open in browser", e);
            throw new IllegalStateException(e);
        }
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
        final var sourceSpaceProvider = DesktopAPI.getSpaceProvider(spaceProviderId);
        final var sourceSpace = sourceSpaceProvider.getSpace(spaceId);
        try {
            URI uri = sourceSpace.getAPIDefinitionURI(itemId).orElseThrow(() -> new IllegalStateException("Operation not supported for this provider"));
            WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(uri.toString(), EclipseUIAPI.class);
        } catch (ResourceAccessException e) {
            // in the future, this could also be handled by exception handling for desktop API calls in the frontend
            showErrorToast("Could not show item in browser", "Check that the item still exists.", true);
            LOGGER.error("Could not open in browser", e);
            throw new IllegalStateException(e);
        }
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
    @SuppressWarnings({"java:S1142"})
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

        final var space = DesktopAPI.getSpace(spaceProviderId, spaceId);

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
        final var nameCollisions =
            NameCollisionChecker.checkForNameCollisions(space, workflowGroupItemId, Stream.of(name));
        if (nameCollisions.isEmpty()) {
            return encodeSpaceItemEnt(space.saveJobAsWorkflow(groupPath, name, jobId));
        }

        final AtomicReference<NameCollisionHandling> collisionHandlingStrategyRef = new AtomicReference<>();
        Display.getDefault()
            .syncExec(() -> NameCollisionChecker
                .openDialogToSelectCollisionHandling(space, workflowGroupItemId, nameCollisions, UsageContext.SAVE)
                .ifPresent(collisionHandlingStrategyRef::set));
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

    private record Destination(String name, RemoteExplorerFileStore fileStore) {
    }

    private static Destination promptDestination(final String defaultWorkflowName, final String spaceProviderId) {
        @SuppressWarnings("restriction")
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
                    return "You have no write permissions for the selected "
                        + (isWorkflow ? "workflow." : "workflow group.");
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
        final var space = DesktopAPI.getSpace(spaceProviderId, spaceId);
        return space.editScheduleInfo(itemId, scheduleId);
    }

}
