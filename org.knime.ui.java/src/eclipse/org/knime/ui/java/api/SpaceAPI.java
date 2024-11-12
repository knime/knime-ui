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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.core.util.exception.ResourceAccessException;
import org.knime.core.webui.WebUIUtil;
import org.knime.gateway.api.webui.entity.ShowToastEventEnt;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.OperationNotAllowedException;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.ToastService;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.gateway.impl.webui.spaces.Space.TransferResult;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvider.SpaceProviderConnection;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.api.NameCollisionChecker.UsageContext;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.SpaceProvidersUtil;
import org.knime.workbench.explorer.dialogs.SpaceResourceSelectionDialog;
import org.knime.workbench.explorer.dialogs.Validator;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileInfo;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;

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
     * Provides infos on all available {@link SpaceProviders}. It's a browser function because this functionality is
     * only available in the desktop AP (the desktop AP, e.g., can connect to multiple hubs).
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
     * @param context The {@link UsageContext} in string form for this collision check
     * @return Can be one of the {@link Space.NameCollisionHandling}-values or 'CANCEL'
     */
    @API
    static String getNameCollisionStrategy(final String spaceProviderId, final String spaceId, final Object[] itemIds,
        final String destWorkflowGroupItemId, final String context) {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
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
     * @param sourceProviderId provider ID of the source space
     * @param sourceSpaceId ID of the source space
     * @param sourceItemIdsParam array of item IDs
     * @return {@code true} if all files could be uploaded, {@code false} otherwise
     */
    @API
    static boolean copyBetweenSpaces( //
        final String sourceProviderId, //
        final String sourceSpaceId, //
        final Object[] sourceItemIdsParam, //
        final String destinationProviderId, //
        final String destinationSpaceId, //
        final String destinationItemId, //
        final boolean excludeData //
    ) { // NOSONAR
        final var sources = new SiblingItemLocators(sourceProviderId, sourceSpaceId,
            Stream.of(sourceItemIdsParam).map(String.class::cast).toList());
        final var destination = new ItemLocator(destinationProviderId, destinationSpaceId, destinationItemId);
        if (sources.itemIds().isEmpty()) {
            return true;
        }

        if (sources.isLocal()) {
            final var opened = findDirtyOpenedWorkflows((LocalWorkspace)sources.space(), sources.itemIds());
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
        final var shellProvider = PlatformUI.getWorkbench().getModalDialogShellProvider();
        return ClassicAPCopyMoveLogic.copy( //
            shellProvider, //
            sources.provider(), //
            toFileStores(sources), //
            destination.provider(), //
            toFileStore(destination), //
            excludeData //
        );
    }

    private static boolean performAsyncHubDownload(SiblingItemLocators source, ItemLocator destination)
        throws OperationNotAllowedException {
        final TransferResult result =
            source.space().downloadInto(source.itemIds(), (LocalWorkspace)destination.space(), destination.itemId());
        if (result.errorTitleAndDescription() != null) {
            showErrorToast(result.errorTitleAndDescription().getFirst(), result.errorTitleAndDescription().getSecond(),
                false);
        }
        return result.successful();
    }

    private static List<AbstractExplorerFileStore> toFileStores(final SiblingItemLocators itemLocators) {
        var space = itemLocators.space();
        return itemLocators.itemIds().stream().map(item -> toFileStore(space, item)).toList();
    }

    private static AbstractExplorerFileStore toFileStore(final ItemLocator itemLocator) {
        return toFileStore(itemLocator.space(), itemLocator.itemId());
    }

    private static AbstractExplorerFileStore toFileStore(final Space space, final String itemId) {
        return ExplorerFileSystem.INSTANCE.getStore(space.toKnimeUrl(itemId));
    }

    private static boolean performAsyncHubUpload(SiblingItemLocators source, ItemLocator destination,
        boolean excludeData) throws OperationNotAllowedException {
        // show upload warning for public spaces
        final var spaceEnt = destination.space().toEntity();
        if (!spaceEnt.isPrivate()) {
            var status = toFileStore(destination).getContentProvider().showUploadWarning(spaceEnt.getName());
            if (!status.isOK()) {
                return false;
            }
        }

        final var result = destination.space().uploadFrom((LocalWorkspace)source.space(), source.itemIds(),
            destination.itemId(), excludeData);
        if (result.errorTitleAndDescription() != null) {
            showErrorToast(result.errorTitleAndDescription().getFirst(), result.errorTitleAndDescription().getSecond(),
                false);
        }
        return result.successful();
    }

    private static void showErrorToast(final String title, final String message, final boolean autoRemove) {
        DesktopAPI.getDeps(ToastService.class).showToast(ShowToastEventEnt.TypeEnum.ERROR, title, message, autoRemove);
    }

    private static void showDirtyWorkflowsWarningToUser(final List<String> opened) {
        final var numOpened = opened.size();
        final var list = opened.stream().limit(5) //
            .map(path -> " \u2022 " + StringUtils.abbreviateMiddle(path, "...", 64)) //
            .collect(Collectors.joining("\n"));
        final boolean single = numOpened == 1;
        showErrorToast("Cannot upload unsaved workflows/components",
            (single ? "One item you've selected is currently open with unsaved changes:\n\n"
                : "Some items you've selected are currently open with unsaved changes:\n\n") + list
                + (numOpened > 5 ? ("\n \u2022 ... (" + (numOpened - 5) + " more)") : "") + "\n\n"
                + (single ? "Please save it or exclude it from the upload."
                    : "Please save them or exclude them from the upload."),
            false);
    }

    private static List<String> findDirtyOpenedWorkflows(final LocalWorkspace localSource, final List<String> itemIds) {
        final var projects = DesktopAPI.getDeps(ProjectManager.class);
        final var workspaceRoot = localSource.getLocalRootPath();
        final var opened = new ArrayList<String>();
        for (final var itemId : itemIds) {
            final var localDir = localSource.toLocalAbsolutePath(null, itemId).orElseThrow();
            final var relPath = workspaceRoot.relativize(localDir);
            if (projects.getLocalProject(relPath) //
                .filter(id -> projects.getDirtyProjectsMap().getOrDefault(id, false)) //
                .isPresent()) {
                opened.add(FilenameUtils.separatorsToUnix(relPath.toString()));
            }
        }
        return opened;
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

        final var sources = new SiblingItemLocators(spaceProviderId, sourceSpaceId,
            Arrays.stream(sourceItemIdsParam).map(String.class::cast).toList());
        final var destination = new ItemLocator(spaceProviderId, destinationSpaceId, destinationItemId);

        if (sources.isLocal()) {
            // this is really an illegal argument, since we deal with remote copy/move
            final var copyText = doCopy ? "copy" : "move";
            DesktopAPUtil.showError("Cannot %s from the local space".formatted(copyText),
                "Cannot move item(s) from the local space.");
            return MoveOrCopyResult.FAILURE.toString();
        }

        var collisionHandling = NameCollisionHandling.of(nameCollisionHandlingParam);
        Supplier<Boolean> hasCollision =
            () -> NameCollisionChecker.test(destination.space(), destination.itemId(), sources.itemIds());
        if (collisionHandling.isEmpty() && hasCollision.get()) {
            // Clients (frontend) need to try again with a collision handling strategy parameter specified.
            return MoveOrCopyResult.COLLISION.toString();
        }

        try {
            destination.space().moveOrCopyItems(sources.itemIds(), destination.itemId(),
                collisionHandling.orElseThrow(), doCopy);
        } catch (IOException e) {
            DesktopAPUtil.showAndLogError("Unable to %s item".formatted(doCopy ? "copy" : "move"),
                "An unexpected exception occurred while %s the item".formatted(doCopy ? "copying" : "moving"),
                NodeLogger.getLogger(SpaceAPI.class), e);
            return MoveOrCopyResult.FAILURE.toString();
        }
        return MoveOrCopyResult.SUCCESS.toString();
    }

    private enum MoveOrCopyResult {
            SUCCESS, COLLISION, FAILURE;
    }

    private static final class ItemLocator extends SpaceLocator {

        private final String itemId;

        /**
         * @param providerId ID of the space provider containing the item
         * @param spaceId ID of the space in provider with ID {@code spaceProviderId} containing the item
         * @param itemId ID of the item contained in space with ID {@code spaceId}
         */
        private ItemLocator(String providerId, String spaceId, String itemId) {
            super(providerId, spaceId);
            this.itemId = itemId;
        }

        public String itemId() {
            return itemId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o)
                return true;
            if (o == null || getClass() != o.getClass())
                return false;
            ItemLocator that = (ItemLocator)o;
            return new EqualsBuilder().appendSuper(super.equals(o)).append(itemId, that.itemId).isEquals();
        }

        @Override
        public int hashCode() {
            return new HashCodeBuilder(17, 37).appendSuper(super.hashCode()).append(itemId).toHashCode();
        }
    }

    private static final class SiblingItemLocators extends SpaceLocator {
        private final List<String> itemIds;

        SiblingItemLocators(String providerId, String spaceId, List<String> itemIds) {
            super(providerId, spaceId);
            this.itemIds = itemIds;
        }

        public List<String> itemIds() {
            return itemIds;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o)
                return true;
            if (o == null || getClass() != o.getClass())
                return false;
            SiblingItemLocators that = (SiblingItemLocators)o;
            return new EqualsBuilder().appendSuper(super.equals(o)).append(itemIds, that.itemIds).isEquals();
        }

        @Override
        public int hashCode() {
            return new HashCodeBuilder(17, 37).appendSuper(super.hashCode()).append(itemIds).toHashCode();
        }
    }

    private static class SpaceLocator {
        private final String m_providerId;

        private final String m_spaceId;

        private SpaceLocator(String providerId, String spaceId) {
            this.m_providerId = providerId;
            this.m_spaceId = spaceId;
        }

        SpaceProvider provider() {
            return SpaceAPI.getSpaceProvider(this.providerId());
        }

        Space space() {
            return this.provider().getSpace(this.spaceId());
        }

        boolean isLocal() {
            return provider().getType() == TypeEnum.LOCAL;
        }

        boolean isHub() {
            return provider().getType() == TypeEnum.HUB;
        }

        public String providerId() {
            return m_providerId;
        }

        public String spaceId() {
            return m_spaceId;
        }

        @Override
        public boolean equals(Object obj) {
            if (obj == this)
                return true;
            if (obj == null || obj.getClass() != this.getClass())
                return false;
            var that = (SpaceLocator)obj;
            return Objects.equals(this.m_providerId, that.m_providerId)
                && Objects.equals(this.m_spaceId, that.m_spaceId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(m_providerId, m_spaceId);
        }

        @Override
        public String toString() {
            return "SpaceLocator[" + "spaceProviderId=" + m_providerId + ", " + "spaceId=" + m_spaceId + ']';
        }

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

    private static record Destination(String name, RemoteExplorerFileStore fileStore) {
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

    /**
     * Retrieves ancestor information necessary to reveal a project in the space explorer
     *
     * @param spaceProviderId
     * @param spaceId
     * @param itemId
     * @param projectName
     * @return An object containing the ancestor item IDs and a boolean whether the project name has changed or not
     * @throws IOException If the ancestors could not be retrieved
     */
    @API
    static String getAncestorInfo(final String spaceProviderId, final String spaceId, final String itemId,
        final String projectName) throws IOException {
        try {
            final var space =
                SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
            final var ancestorItemIds = space.getAncestorItemIds(itemId);
            final var mostRecentProjectName = space.getItemName(itemId);
            final var hasNameChanged = !projectName.equals(mostRecentProjectName);

            return buildAncestorInfo(ancestorItemIds, hasNameChanged).toString();
        } catch (ResourceAccessException e) {
            throw new IOException(
                "Failed to reveal '%s' in space. Maybe it was deleted remotely?".formatted(projectName), e);
        }
    }

    private static ObjectNode buildAncestorInfo(final List<String> ancestorItemIds, final boolean hasNameChanged) {
        final var objectNode = MAPPER.createObjectNode();
        final var arrayNode = objectNode.putArray("ancestorItemIds");
        ancestorItemIds.forEach(arrayNode::add);
        return objectNode.put("hasNameChanged", hasNameChanged);
    }

}
