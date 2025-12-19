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

import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.hc.core5.net.URIBuilder;
import org.eclipse.core.runtime.IPath;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.util.CheckUtils;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.core.webui.WebUIUtil;
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.api.webui.entity.ShowToastEventEnt;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.gateway.api.webui.service.util.MutableServiceCallException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.LoggedOutException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NetworkException;
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
import org.knime.ui.java.api.Locator.Siblings;
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

/**
 * Functions around spaces.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class SpaceAPI {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(SpaceAPI.class);

    private SpaceAPI() {
        // stateless
    }

    /**
     * Tries to connect a space provider to its remote location if it's not connected already and returns the space
     * provider information (no matter whether it has been connected already or not).
     *
     * @return A JSON object with all the space provider information.
     * @throws RuntimeException if the result couldn't be serialized
     * @throws NoSuchElementException if there is no space provider for the given id
     */
    @API(runInUIThread = false)
    static String connectSpaceProvider(final String spaceProviderId) {
        final var spaceProvider = DesktopAPI.getDeps(SpaceProvidersManager.class).getSpaceProviders(Key.defaultKey())
            .getSpaceProvider(spaceProviderId);
        if (spaceProvider == null) {
            throw new NoSuchElementException("Space provider '" + spaceProviderId + "' not found.");
        }
        var isConnected = spaceProvider.getConnection(false).isPresent();
        try {
            return ObjectMapperUtil.getInstance().getObjectMapper()
                    .writeValueAsString(AppStateEntityFactory.buildSpaceProviderEnt(spaceProvider, !isConnected));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize space provider.", e);
        }
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
     * @throws GatewayException -
     */
    @API
    static String getNameCollisionStrategy(final String spaceProviderId, final String spaceId, final Object[] itemIds,
        final String destWorkflowGroupItemId, final String context) throws GatewayException {
        final var space = DesktopAPI.getSpace(spaceProviderId, spaceId);
        final var usageContext = UsageContext.valueOf(context);
        try {
            return determineNameCollisionHandling(space, itemIds, destWorkflowGroupItemId, usageContext) //
                .map(NameCollisionHandling::toString) //
                .orElse("CANCEL");
        } catch (final MutableServiceCallException e) {
            throw e.toGatewayException("Failed to determine name collision strategy");
        }
    }

    private static Optional<NameCollisionHandling> determineNameCollisionHandling(final Space space,
        final Object[] itemIds, final String destWorkflowGroupItemId, final UsageContext context)
        throws GatewayException, MutableServiceCallException {
        final var nameCollisions = NameCollisionChecker.checkForNameCollisions(space, destWorkflowGroupItemId, itemIds);
        return nameCollisions.isEmpty() ? Optional.of(Space.NameCollisionHandling.NOOP) : NameCollisionChecker //
            .openDialogToSelectCollisionHandling(space, destWorkflowGroupItemId, nameCollisions, context);
    }

    @API
    @SuppressWarnings({"java:S1941"})
    static boolean downloadFromSpace(final String sourceProviderId, final String sourceSpaceId,
        final Object[] sourceItemIdsParam, final String destinationProviderId, final String destinationSpaceId,
        final String destinationItemId) throws GatewayException {

        final var sources = new Locator.Siblings(sourceProviderId, sourceSpaceId,
            Stream.of(sourceItemIdsParam).map(String.class::cast).toList());
        final var destination = Locator.Destination.of(destinationProviderId, destinationSpaceId, destinationItemId);

        if (sources.itemIds().isEmpty()) {
            return true;
        }

        // the UI never offered "Download" to non-local -- let's make this assumption explicit here
        CheckUtils.checkArgument(destination.isLocal(), "Unexpected download to non-local space");
        try {
            if (sources.isHub()) {
                // always use HubClient SDK for downloads from Hub spaces, let it handle backwards-compatibility
                return performAsyncHubDownload(sources, destination);
            }
            return legacyCopyBetweenSpaces(sources, destination, false);
        } catch (MutableServiceCallException e) { // NOSONAR
            throw e.toGatewayException( //
                "Failed to download item%s".formatted(sourceItemIdsParam.length == 1 ? "" : "s"));
        }
    }

    /**
     * Copies space items from Local to Hub space or vice versa.
     *
     * @return ids of the items that have been successfully uploaded or an empty list if the upload wasn't successful
     *         (or the item ids couldn't be determined)
     * @throws GatewayException -
     */
    @API
    @SuppressWarnings({"java:S1941"})
    static List<String> uploadToSpace(final String sourceProviderId, final String sourceSpaceId,
        final Object[] sourceItemIdsParam, final String destinationProviderId, final String destinationSpaceId,
        final String destinationItemId, final boolean excludeData) throws GatewayException {

        final var sources = new Locator.Siblings(sourceProviderId, sourceSpaceId,
            Stream.of(sourceItemIdsParam).map(String.class::cast).toList());
        final var destination = Locator.Destination.of(destinationProviderId, destinationSpaceId, destinationItemId);

        if (sources.itemIds().isEmpty()) {
            return List.of();
        }

        if (sources.isLocal()) {
            final LocalSpace localSpace;
            try {
                localSpace = (LocalSpace)sources.space();
            } catch (final MutableServiceCallException e) {
                throw e.toGatewayException("Failed to upload item(s)");
            }
            final var opened = findDirtyOpenedWorkflows(localSpace, sources.itemIds());
            if (!opened.isEmpty()) {
                showDirtyWorkflowsWarningToUser(opened);
                return List.of();
            }
        }

        try {
            return performUpload(sources, destination, excludeData);
        } catch (final MutableServiceCallException e) {
            throw e.toGatewayException("Failed to upload item%s".formatted(sourceItemIdsParam.length == 1 ? "" : "s"));
        }
    }

    private static List<String> performUpload(final Locator.Siblings sources, final Locator.Destination destination,
        final boolean excludeData) throws GatewayException, MutableServiceCallException {
        // the UI never offered "Upload" from non-local -- let's make this assumption explicit here
        CheckUtils.checkArgument(sources.isLocal(), "Unexpected upload from non-local space");
        if (destination.isHub()) {
            // always use HubClient SDK for uploads to Hub spaces, let it handle backwards-compatibility
            return performAsyncHubUpload(sources, destination, excludeData);
        }

        legacyCopyBetweenSpaces(sources, destination, excludeData);
        return List.of();
    }

    private static boolean performAsyncHubDownload(final Locator.Siblings sources,
        final Locator.Destination destination) throws GatewayException, MutableServiceCallException {
        final var remoteSpace = sources.space();
        final var localSpace = (LocalSpace)destination.space();
        final TransferResult result = remoteSpace.downloadInto(sources.itemIds(), localSpace, destination.itemId());
        if (result.errorTitleAndDescription() != null) {
            showErrorToast(result.errorTitleAndDescription().getFirst(), result.errorTitleAndDescription().getSecond(),
                false);
        }
        return result.successful();
    }

    private static List<String> performAsyncHubUpload(final Locator.Siblings sources,
        final Locator.Destination destination, final boolean excludeData)
        throws GatewayException, MutableServiceCallException {

        var uploadDeclined = !showUploadWarning(destination);
        if (uploadDeclined) {
            return List.of();
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

        if (result.successful() && result.itemPaths() != null) {
            var sourceItemNames = result.itemPaths().stream().map(itemPath -> itemPath.segment(0)).distinct().toList();
            return itemNamesToItemIds(destination, sourceItemNames);
        }
        return List.of();
    }

    private static boolean showUploadWarning(final Locator.Destination destination)
        throws GatewayException, MutableServiceCallException {

        final var remoteTargetSpace = destination.space();
        if (Boolean.TRUE.equals(remoteTargetSpace.toEntity().isPrivate())) {
            return true;
        }
        var contentProvider = ExplorerMountTable.getMountedContent().values().stream()
            .filter(provider -> provider.getMountID().equals(destination.provider().getId())).findFirst();
        if (contentProvider.isEmpty()) {
            return false;
        }
        var response = contentProvider.get().showUploadWarning(remoteTargetSpace.getName());
        return response.isOK();
    }

    static void showErrorToast(final String title, final String message, final boolean autoRemove) {
        DesktopAPI.getDeps(ToastService.class).showToast(ShowToastEventEnt.TypeEnum.ERROR, title, message, autoRemove);
    }

    private static List<String> itemNamesToItemIds(final Locator.Destination destination, final List<String> itemNames)
        throws GatewayException, MutableServiceCallException {

        var destinationWfGroup = destination.space().listWorkflowGroup(destination.itemId());
        return destinationWfGroup.getItems().stream() //
                .filter(item -> itemNames.stream().anyMatch(sourceName -> item.getName().equals(sourceName))) //
                .map(SpaceItemEnt::getId) //
                .toList();
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
            var isDirty = openProjectWithId.isPresent()
                && Boolean.TRUE.equals(projects.getDirtyProjectsMap().get(openProjectWithId.get().getID()));
            if (isDirty) {
                final var localDir = space.toLocalAbsolutePath(itemId).orElseThrow();
                final var relPath = spaceRoot.relativize(localDir);
                dirtyAndOpen.add(FilenameUtils.separatorsToUnix(relPath.toString()));
            }
        }
        return dirtyAndOpen;
    }

    private static boolean legacyCopyBetweenSpaces(final Siblings sources, final Locator.Destination destination,
        final boolean excludeData) throws GatewayException, MutableServiceCallException {
        final var space = sources.space();
        final var sourceFileStores = sources.itemIds().stream() //
            .map(itemId -> ExplorerMountTable.getFileSystem().getStore(space.toKnimeUrl(itemId))).toList();
        final var destinationFileStore =
            ExplorerMountTable.getFileSystem().getStore((destination.space().toKnimeUrl(destination.itemId())));
        return ClassicAPCopyLogic.copy( //
            PlatformUI.getWorkbench().getModalDialogShellProvider(), //
            sources.provider(), //
            sourceFileStores, //
            destination.provider(), //
            destinationFileStore, //
            destination.space().getId(), //
            excludeData //
        );
    }

    /**
     * Opens the website of an item in the web browser
     *
     * @param spaceProviderId provider ID of the source space
     * @param spaceId ID of the source space
     * @param itemId ID of the selected item
     * @throws GatewayException -
     * @throws IllegalStateException
     * @throws NoSuchElementException if there is no space provider, space or item for the given id
     */
    @API
    static void openInBrowser(final String spaceProviderId, final String spaceId, final String itemId,
        final String queryString) throws GatewayException {
        final var sourceSpaceProvider = DesktopAPI.getSpaceProvider(spaceProviderId);
        try {
            final var sourceSpace = sourceSpaceProvider.getSpace(spaceId);
            final var uriBuilder = new URIBuilder(sourceSpace.getItemUrl(itemId)
                .orElseThrow(() -> new IllegalStateException("Operation not supported for this provider")));

            if (queryString != null && !uriBuilder.isQueryEmpty()) {
                throw new IllegalStateException("Cannot set custom queryString: ItemUrl already contains a query");
            }

            Optional.ofNullable(queryString).ifPresent(uriBuilder::setCustomQuery);

            WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(uriBuilder.build().toString(), EclipseUIAPI.class);
        } catch (IllegalStateException | URISyntaxException e) {
            // In the future, this could also be handled by exception handling for desktop API calls in the frontend,
            // see NXT-2092.
            showErrorToast("Could not show item page in browser", "Check that the item still exists.", true);
            LOGGER.error("Could not open in browser", e);
            throw new IllegalStateException(e);
        } catch (final MutableServiceCallException e) { // NOSONAR exception is being propagated
            throw e.toGatewayException("Could not show item page in browser");
        }
    }

    /**
     * Opens the API definition of a workflow (Swagger)
     *
     * @param spaceProviderId provider ID of the source space
     * @param spaceId ID of the source space
     * @param itemId ID of the selected item
     * @throws GatewayException -
     * @throws NoSuchElementException if there is no space provider, space or item for the given id
     */
    @API
    static void openAPIDefinition(final String spaceProviderId, final String spaceId, final String itemId)
        throws GatewayException {
        final var sourceSpaceProvider = DesktopAPI.getSpaceProvider(spaceProviderId);
        try {
            final var sourceSpace = sourceSpaceProvider.getSpace(spaceId);
            final var url = sourceSpace.getAPIDefinitionUrl(itemId)
                .orElseThrow(() -> new IllegalStateException("Operation not supported for this provider"));
            WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(url.toString(), EclipseUIAPI.class);
        } catch (MutableServiceCallException e) { // NOSONAR
            throw e.toGatewayException("Could not show item in browser");
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
     * @throws GatewayException -
     * @throws NoSuchElementException if there is no job for the given ids
     */
    @API
    @SuppressWarnings({"java:S1142"})
    static String saveJobAsWorkflow(final String spaceProviderId, final String spaceId, final String itemId,
        final String jobId, final String jobName) throws GatewayException {

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

        String workflowGroupItemId;
        try {
            workflowGroupItemId = space.getItemIdByURI(destinationFileStore.toURI()).orElseThrow();
        } catch (MutableServiceCallException e) { // NOSONAR
            throw e.toGatewayException("Failed to save job");
        }

        final var groupPath = IPath.forPosix(destinationFileStore.getFullName());
        final List<String> nameCollisions;
        try {
            nameCollisions = NameCollisionChecker.checkForNameCollisions(space, workflowGroupItemId, Stream.of(name));
            if (nameCollisions.isEmpty()) {
                return encodeSpaceItemEnt(space.saveJobAsWorkflow(groupPath, name, jobId));
            }
        } catch (final MutableServiceCallException e) { // NOSONAR exception is being propagated
            throw e.toGatewayException("Failed to check for name collisions");
        }

        final var collisionHandlingStrategyRef = new AtomicReference<NameCollisionHandling>();
        final var gatewayExceptionRef = new AtomicReference<GatewayException>();
        Display.getDefault().syncExec(() -> {
            try {
                NameCollisionChecker
                    .openDialogToSelectCollisionHandling(space, workflowGroupItemId, nameCollisions, UsageContext.SAVE)
                    .ifPresent(collisionHandlingStrategyRef::set);
            } catch (GatewayException e) {
                gatewayExceptionRef.set(e);
            } catch (MutableServiceCallException e) {
                gatewayExceptionRef.set(e.toGatewayException("Failed to determine collision handling strategy"));
            }
        });

        if (gatewayExceptionRef.get() != null) {
            throw gatewayExceptionRef.get();
        }

        final var strategy = collisionHandlingStrategyRef.get();
        if (strategy == null) {
            // aborted
            return null;
        }

        if (NameCollisionHandling.OVERWRITE == strategy) {
            return encodeSpaceItemEnt(space.saveJobAsWorkflow(groupPath, name, jobId));
        }

        // It is NameCollisionHandling.AUTORENAME since we got collisions, so it should not be NOOP
        final Predicate<String> taken = testName -> {
            try {
                return space.containsItemWithName(workflowGroupItemId, testName);
            } catch (NetworkException | LoggedOutException | MutableServiceCallException e) {
                // this is safe here because the surrounding method declared all of these exceptions
                final GatewayException ge =
                    e instanceof MutableServiceCallException csce
                        ? csce.toGatewayException("Failed to check folder for collisions") : (GatewayException)e;
                throw ExceptionUtils.asRuntimeException(ge);
            }
        };
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
        final String scheduleId) throws GatewayException {
        final var space = DesktopAPI.getSpace(spaceProviderId, spaceId);
        try {
            return space.editScheduleInfo(itemId, scheduleId);
        } catch (MutableServiceCallException e) { // NOSONAR
            throw e.toGatewayException("Failed to edit schedule");
        }
    }

}
