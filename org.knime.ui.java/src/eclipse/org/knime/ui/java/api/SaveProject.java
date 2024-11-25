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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.node.workflow.contextv2.RestLocationInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2.LocationType;
import org.knime.core.util.LockFailedException;
import org.knime.core.util.Pair;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.DesktopAPUtil.OverwriteRemotelyResult;
import org.knime.workbench.explorer.filesystem.FreshFileStoreResolver;
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
     * Save the project workflow manager identified by a given project ID.
     *
     * @param projectId ID of the project
     * @param projectSVG SVG of the project, should not be {@code null}.
     * @param localOnly if {@code true}, the project is only saved locally even if it is a temporary copy from Hub
     */
    static void saveProject(final String projectId, final String projectSVG, final boolean localOnly) {
        if (projectSVG == null) {
            LOGGER.warn("Saving the project without a workflow preview. This is unexpected and should not happen.");
        }

        var projectWfm = DefaultServiceUtil.getWorkflowManager(projectId, NodeIDEnt.getRootID());
        if (isExecutionInProgress(projectWfm)) {
            // Show a warning otherwise
            DesktopAPUtil.showWarning("Workflow in execution", "Executing nodes are not saved!");
        } else {
            saveProjectWithProgressBar(projectWfm, projectSVG, localOnly);
            // Emit a ProjectDirtyStateEvent
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        }
    }

    private static boolean isExecutionInProgress(final WorkflowManager wfm) {
        var state = wfm.getNodeContainerState();
        return state.isExecutionInProgress() || state.isExecutingRemotely();
    }

    private static void saveProjectWithProgressBar(final WorkflowManager wfm, final String svg,
            final boolean localOnly) {
        try {
            PlatformUI.getWorkbench().getProgressService().busyCursorWhile(
                monitor -> saveProject(monitor, wfm, svg, localOnly));
        } catch (InvocationTargetException e) {
            LOGGER.error("Saving the workflow or saving the SVG failed", e);
        } catch (InterruptedException e) {
            LOGGER.warn("Interrupted the saving process");
            Thread.currentThread().interrupt();
        }
    }

    static boolean saveProject(final IProgressMonitor monitor, final WorkflowManager wfm, final String svg,
        final boolean localOnly) {
        if (!localOnly //
            && wfm.getContextV2().getLocationInfo() instanceof RestLocationInfo //
            && !saveBackToServerOrHub(monitor, wfm, svg)) {
            wfm.setDirty();
            return false;
        }
        return saveLocalProject(monitor, wfm, svg);
    }

    private static boolean saveLocalProject(final IProgressMonitor monitor, final WorkflowManager wfm,
        final String svg) {
        if (wfm.isComponentProjectWFM()) {
            return saveComponentTemplate(monitor, wfm);
        } else {
            return saveRegularWorkflow(monitor, wfm, svg);
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
    private static boolean saveRegularWorkflow(final IProgressMonitor monitor, final WorkflowManager wfm,
            final String svg) {
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

        saveWorkflowSvg(wfm.getName(), svg, workflowPath);
        monitor.done();
        return true;
    }

    /**
     * Saves the workflow SVG to the workflow's directory.
     *
     * @param name workflow name
     * @param svg workflow SVG
     * @param workflowPath workflow path
     */
    public static void saveWorkflowSvg(final String name, final String svg, final Path workflowPath) {
        if (svg == null) {
            DesktopAPUtil.showWarning("Failed to save workflow preview",
                String.format("The workflow preview (svg) couldn't be saved for workflow %s", name));
        } else {
            try {
                Files.writeString(workflowPath.resolve(WorkflowPersistor.SVG_WORKFLOW_FILE), svg,
                    StandardCharsets.UTF_8);
            } catch (IllegalArgumentException | IOException | UnsupportedOperationException | SecurityException e) {
                Display.getDefault().syncExec(() -> DesktopAPUtil.showWarningAndLogError("SVG save attempt",
                    "Saving the SVG didn't work", LOGGER, e));
            }
        }
    }

    private static boolean saveBackToServerOrHub(final IProgressMonitor monitor, final WorkflowManager wfm,
            final String svg) {
        final var context = wfm.getContextV2();
        if (!context.isTemporyWorkflowCopyMode()) {
            throw new IllegalStateException("Can only save temporary copies to Server or Hub.");
        }

        var remoteMountpointURI = context.getMountpointURI().orElseThrow();
        var remoteStore = FreshFileStoreResolver.resolveAndRefreshWithProgress(remoteMountpointURI);

        final var fetchedInfo = remoteStore.fetchInfo();
        if (fetchedInfo.exists()) {
            if (!fetchedInfo.isModifiable()) {
                DesktopAPUtil.showError("Workflow not writable",
                    "You don't have permissions to overwrite the workflow. Use \"Save As...\" in order to save it to "
                    + "a different location.");
                return false;
            }

            final var location = context.getLocationType() == LocationType.SERVER_REPOSITORY ? "Server" : "Hub";
            final var resultRef = new AtomicReference<Pair<OverwriteRemotelyResult, String>>();
            Display.getDefault().syncExec(
                () -> resultRef.set(DesktopAPUtil.openOverwriteRemotelyDialog(remoteStore, location)));
            final var dialogResult = resultRef.get();
            final var answer = dialogResult.getFirst();

            if (answer == OverwriteRemotelyResult.CANCEL) {
                return false;
            }

            if (answer == OverwriteRemotelyResult.OVERWRITE_WITH_SNAPSHOT) {
                try {
                    ((RemoteExplorerFileStore)remoteStore).createSnapshot(dialogResult.getSecond());
                } catch (final CoreException e) {
                    final var msg = "Unable to create snapshot before overwriting the workflow:\n" + e.getMessage()
                            + "\n\nUpload was canceled.";
                    DesktopAPUtil.showAndLogError(location + " Error", msg, LOGGER, e);
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

        // selected a remote location: save + upload
        saveLocalProject(monitor, wfm, svg);

        final var spaceProviders = DesktopAPI.getDeps(SpaceProviders.class).getProvidersMap();
        final var spaceProvider = Optional.ofNullable(spaceProviders.get(remoteMountpointURI.getAuthority())) //
                .orElseThrow(() -> new IllegalStateException("Space provider '" + remoteMountpointURI.getAuthority()
                          + "' not found."));
        final var workflowPath = wfm.getContextV2().getExecutorInfo().getLocalWorkflowPath();
        var uploaded = false;
        try {
            spaceProvider.syncUploadWorkflow(workflowPath, remoteMountpointURI, false, false, monitor);
            uploaded = true;
        } catch (final CoreException | IOException e) {
            final var message = "Failed to upload the workflow to its remote location\n(" + e.getMessage() + ")";
            DesktopAPUtil.showAndLogError("Upload has failed", message, LOGGER, e);
        }
        return uploaded;
    }
}
