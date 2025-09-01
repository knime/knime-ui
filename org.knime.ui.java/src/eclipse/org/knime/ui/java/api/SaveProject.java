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
 *   Jan 5, 2022 (hornm): created
 */
package org.knime.ui.java.api;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.SubMonitor;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.contextv2.HubSpaceLocationInfo;
import org.knime.core.node.workflow.contextv2.RestLocationInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2.LocationType;
import org.knime.core.util.LockFailedException;
import org.knime.core.util.Pair;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.ResetOnUploadEnum;
import org.knime.gateway.api.webui.service.util.MutableServiceCallException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.LoggedOutException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NetworkException;
import org.knime.gateway.impl.service.util.WorkflowManagerResolver;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager.Key;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.DesktopAPUtil.OverwriteRemotelyResult;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;

/**
 * Save the project workflow manager identified by a given project ID.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class SaveProject {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(SaveProject.class);

    private SaveProject() {
        // utility
    }

    /**
     * Override, see {@link this#saveProject(String, String, boolean, boolean)}
     *
     * @param projectId -
     * @param localOnly -
     * @return -
     */
    static boolean saveProject(final String projectId, final boolean localOnly) {
        return saveProject(projectId, localOnly, true);
    }

    /**
     * Save the project workflow manager identified by a given project ID.
     *
     * TODO NXT-3634 de-duplicate with browser save logic (NOSONAR)
     *
     * @param projectId ID of the project
     * @param localOnly if {@code true}, the project is only saved locally even if it is a temporary copy from Hub
     * @param allowOverwritePrompt -
     * @return A boolean indicating whether the project was saved.
     */
    static boolean saveProject(final String projectId, final boolean localOnly, final boolean allowOverwritePrompt) {
        var projectWfm = WorkflowManagerResolver.get(projectId, NodeIDEnt.getRootID());
        if (isExecutionInProgress(projectWfm)) {
            // Show a warning otherwise
            DesktopAPUtil.showWarning("Workflow in execution", "Executing nodes are not saved!");
            return false;
        } else {
            var wasSaveSuccessful = saveProjectWithProgressBar(projectWfm, localOnly, allowOverwritePrompt);
            // Emit a ProjectDirtyStateEvent
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
            return wasSaveSuccessful;
        }
    }

    private static boolean isExecutionInProgress(final WorkflowManager wfm) {
        var state = wfm.getNodeContainerState();
        return state.isExecutionInProgress() || state.isExecutingRemotely();
    }

    private static Boolean saveProjectWithProgressBar(final WorkflowManager wfm, final boolean localOnly,
        final boolean allowOverwritePrompt) {
        var wasSaveSuccessful = new AtomicBoolean();
        try {
            PlatformUI.getWorkbench().getProgressService().busyCursorWhile(
                monitor -> wasSaveSuccessful.set(saveProject(monitor, wfm, localOnly, allowOverwritePrompt)));
        } catch (InvocationTargetException e) {
            LOGGER.error("Saving the workflow or saving the SVG failed", e);
        } catch (InterruptedException e) {
            LOGGER.warn("Interrupted the saving process");
            Thread.currentThread().interrupt();
        }
        return wasSaveSuccessful.get();
    }

    static boolean saveProject(final IProgressMonitor monitor, final WorkflowManager wfm, final boolean localOnly) {
        return saveProject(monitor, wfm, localOnly, true);
    }

    static boolean saveProject(final IProgressMonitor monitor, final WorkflowManager wfm, final boolean localOnly,
        final boolean allowOverwritePrompt) {
        // use the flag and try/catch to make sure that the workflow is also set to dirty if any exception is thrown
        var success = false;
        try {
            if (!localOnly && wfm.getContextV2().getLocationInfo() instanceof RestLocationInfo restInfo) {
                success = saveBackToServerOrHub(monitor, wfm, restInfo, allowOverwritePrompt);
            } else {
                success = saveLocalProject(monitor, wfm);
            }
        } catch (Throwable t) { // NOSONAR: Just to make sure no exception is missed
            LOGGER.error("Error occured while saving the project", t);
        } finally {
            if (!success) {
                wfm.setDirty();
            }
        }
        return success; // To make sure we always return something
    }

    private static boolean saveLocalProject(final IProgressMonitor monitor, final WorkflowManager wfm) {
        if (wfm.isComponentProjectWFM()) {
            return saveComponentTemplate(monitor, wfm);
        } else {
            return saveRegularWorkflow(monitor, wfm);
        }
    }

    private static boolean saveComponentTemplate(final IProgressMonitor monitor, final WorkflowManager wfm) {
        try {
            ((SubNodeContainer)wfm.getDirectNCParent()).saveTemplate(DesktopAPUtil.toExecutionMonitor(monitor));
        } catch (IOException | CanceledExecutionException | LockFailedException | InvalidSettingsException e) {
            DesktopAPUtil.showWarningAndLogError("Component save attempt", "Saving the component failed", LOGGER, e);
            monitor.done();
            return false;
        }
        monitor.done();
        return true;
    }

    /**
     * Save regular workflow
     */
    private static boolean saveRegularWorkflow(final IProgressMonitor monitor, final WorkflowManager wfm) {
        monitor.beginTask("Saving a workflow", IProgressMonitor.UNKNOWN);
        var workflowPath = wfm.getContextV2().getExecutorInfo().getLocalWorkflowPath();

        try {
            var exec = DesktopAPUtil.toExecutionMonitor(monitor);
            wfm.save(workflowPath.toFile(), exec, true);
        } catch (final IOException | CanceledExecutionException | LockFailedException e) {
            DesktopAPUtil.showWarningAndLogError("Workflow save attempt",
                "Saving the workflow didn't work: " + e.getMessage(), LOGGER, e);
            monitor.done();
            return false; // Abort if saving the workflow fails
        }

        monitor.done();
        return true;
    }

    private static boolean saveBackToServerOrHub(final IProgressMonitor rootMonitor, final WorkflowManager wfm,
        final RestLocationInfo remoteLocation, final boolean allowOverwritePrompt) throws GatewayException {
        final var context = wfm.getContextV2();
        if (!context.isTemporyWorkflowCopyMode()) {
            throw new IllegalStateException("Can only save temporary copies to Server or Hub.");
        }

        @SuppressWarnings("java:S1941") // can't move the line because it sets the main task
        final var subMonitor = SubMonitor.convert(rootMonitor, 1_000);

        final var remoteMountpointURI = context.getMountpointURI().orElseThrow();
        final var spaceProviders = DesktopAPI.getDeps(SpaceProvidersManager.class).getSpaceProviders(Key.defaultKey());
        final var mountId = remoteMountpointURI.getAuthority();
        final SpaceProvider spaceProvider = Optional.ofNullable(spaceProviders.getSpaceProvider(mountId)) //
            .orElseThrow(() -> new IllegalStateException("Space provider '" + mountId + "' not found."));

        final boolean preCheckResult;
        final Space space;
        try {
            if (remoteLocation instanceof HubSpaceLocationInfo hubInfo) {
                space = spaceProvider.getSpace(hubInfo.getSpaceItemId());
                preCheckResult = checkHubUpload(mountId, hubInfo, space, allowOverwritePrompt);
            } else {
                space = spaceProvider.getSpace(Space.ROOT_ITEM_ID);
                preCheckResult = checkServerUpload(remoteMountpointURI);
            }
        } catch (final MutableServiceCallException e) {
            e.addDetails("Pre-check for upload failed");
            throw e.toGatewayException("Failed to upload item(s)");
        }

        if (!preCheckResult) {
            return false;
        }

        // selected a remote location: save + upload
        subMonitor.setTaskName("Saving local workflow");
        saveLocalProject(subMonitor.newChild(0), wfm);

        try {
            subMonitor.setTaskName(
                "Uploading workflow to " + (context.getLocationType() == LocationType.HUB_SPACE ? "Hub" : "Server"));
            final var workflowPath = wfm.getContextV2().getExecutorInfo().getLocalWorkflowPath();
            final var excludeData = spaceProvider.getConnection(false) //
                .map(SpaceProvider.SpaceProviderConnection::getResetOnUploadMode) //
                .map(ResetOnUploadEnum.MANDATORY::equals) //
                .orElse(false);
            return space.saveBackTo(workflowPath, remoteMountpointURI, excludeData, subMonitor);
        } catch (Exception e) { // NOSONAR
            final var message = "Failed to upload the workflow to its remote location\n(" + e.getMessage() + ")";
            Display.getDefault().syncExec(() -> DesktopAPUtil.showAndLogError("Upload has failed", message, LOGGER, e));
            return false;
        }
    }

    private static boolean checkHubUpload(final String mountId, final HubSpaceLocationInfo hubInfo,
        final Space hubSpace, final boolean allowOverwritePrompt) throws GatewayException {

        try {
            if (allowOverwritePrompt && hubItemExists(hubInfo, hubSpace)) {
                final var resultRef = new AtomicReference<Pair<OverwriteRemotelyResult, String>>();
                Display.getDefault().syncExec(() -> resultRef.set(//
                    DesktopAPUtil.openOverwriteRemotelyDialog(mountId + ':' + hubInfo.getWorkflowPath(), null, "Hub")));
                final var dialogResult = resultRef.get();
                final var answer = dialogResult.getFirst();
                if (answer == OverwriteRemotelyResult.CANCEL) {
                    return false;
                }
            }
            return true;
        } catch (final MutableServiceCallException e) {
            throw e.toGatewayException("Failed to upload item(s)");
        }
    }

    private static boolean hubItemExists(final HubSpaceLocationInfo hubInfo, final Space space)
        throws NetworkException, LoggedOutException, MutableServiceCallException {
        try {
            space.getItemType(hubInfo.getWorkflowItemId());
            return true;
        } catch (final NoSuchElementException ex) { // NOSONAR we expect this here
            return false;
        }
    }

    private static boolean checkServerUpload(final URI mountpointUri) {
        final var remoteStore = (RemoteExplorerFileStore)ExplorerMountTable.getFileSystem().getStore(mountpointUri);
        final var fetchedInfo = remoteStore.fetchInfo();
        if (fetchedInfo.exists()) {
            if (!fetchedInfo.isModifiable()) {
                DesktopAPUtil.showError("Workflow not writable",
                    "You don't have permissions to overwrite the workflow. Use \"Save As...\" in order to save it to "
                        + "a different location.");
                return false;
            }

            final var resultRef = new AtomicReference<Pair<OverwriteRemotelyResult, String>>();
            Display.getDefault().syncExec(() -> resultRef.set( //
                DesktopAPUtil.openOverwriteRemotelyDialog(remoteStore.getMountIDWithFullPath(), //
                    remoteStore.getContentProvider(), "Server")));
            final var dialogResult = resultRef.get();
            final var answer = dialogResult.getFirst();

            if (answer == OverwriteRemotelyResult.CANCEL) {
                return false;
            }

            if (answer == OverwriteRemotelyResult.OVERWRITE_WITH_SNAPSHOT) {
                try {
                    remoteStore.createSnapshot(dialogResult.getSecond());
                } catch (final CoreException e) {
                    final var msg = "Unable to create snapshot before overwriting the workflow:\n" + e.getMessage()
                        + "\n\nUpload was canceled.";
                    DesktopAPUtil.showAndLogError("Server Error", msg, LOGGER, e);
                    return false;
                }
            }
        } else {
            final var parent = remoteStore.getParent();
            if (parent == null || !parent.fetchInfo().isModifiable()) {
                DesktopAPUtil.showError("Workflow not writable", "You don't have permissions to write into the "
                    + "workflow's parent folder. Use \"Save As...\" in order to save it to a different location.");
                return false;
            }
        }
        return true;
    }
}
