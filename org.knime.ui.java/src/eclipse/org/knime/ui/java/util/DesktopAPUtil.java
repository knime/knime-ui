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
 *   Jan 18, 2023 (hornm): created
 */
package org.knime.ui.java.util;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

import org.apache.commons.lang3.function.FailableConsumer;
import org.apache.commons.lang3.function.FailableFunction;
import org.eclipse.core.filesystem.EFS;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.OperationCanceledException;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IEditorInput;
import org.eclipse.ui.PartInitException;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.ide.FileStoreEditorInput;
import org.knime.core.eclipseUtil.UpdateChecker.UpdateInfo;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.ExecutionMonitor;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.util.CheckUtils;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.node.workflow.contextv2.HubSpaceLocationInfo;
import org.knime.core.node.workflow.contextv2.LocationInfo;
import org.knime.core.node.workflow.contextv2.RestLocationInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.util.LockFailedException;
import org.knime.core.util.Pair;
import org.knime.core.util.ProgressMonitorAdapter;
import org.knime.gateway.impl.webui.UpdateStateProvider.UpdateState;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.product.rcp.intro.UpdateDetector;
import org.knime.workbench.editor2.LoadMetaNodeTemplateRunnable;
import org.knime.workbench.editor2.LoadWorkflowRunnable;
import org.knime.workbench.editor2.WorkflowEditor;
import org.knime.workbench.editor2.editparts.GUIWorkflowCipherPrompt;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.RemoteWorkflowInput;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.LocalExplorerFileStore;
import org.knime.workbench.explorer.filesystem.MessageFileStore;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileInfo;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;
import org.knime.workbench.explorer.view.AbstractContentProvider;
import org.knime.workbench.explorer.view.actions.DownloadAndOpenWorkflowAction;
import org.knime.workbench.explorer.view.actions.WorkflowDownload;
import org.knime.workbench.explorer.view.dialogs.SnapshotPanel;

/**
 * Summarizes shared utility methods which are only relevant if the Web UI is run within the desktop AP. Those methods,
 * e.g., either depend on some classic AP logic or they use eclipse UI elements (dialogs, progress bars).
 *
 * @author Leonard Wörteler, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 */
public final class DesktopAPUtil {

    @SuppressWarnings("javadoc")
    public static final String LOADING_WORKFLOW_PROGRESS_MSG = "Loading workflow...";

    private static final NodeLogger LOGGER = NodeLogger.getLogger(DesktopAPUtil.class);

    private DesktopAPUtil() {
        // utility
    }

    /**
     * Loads the workflow for the given item-id from the given space while reporting progress to the given monitor.
     *
     * @param space the space
     * @param itemId the item ID of the workflow
     * @param monitor progress monitor
     * @return the loaded workflow or {@code null} if it couldn't be loaded
     */
    public static WorkflowManager fetchAndLoadWorkflowWithTask(final Space space, final String itemId,
        final IProgressMonitor monitor) {
        monitor.beginTask(LOADING_WORKFLOW_PROGRESS_MSG, IProgressMonitor.UNKNOWN);
        final var exec = DesktopAPUtil.toExecutionMonitor(monitor);
        final var path = space.toLocalAbsolutePath(exec, itemId).orElse(null);
        if (path == null) {
            return null;
        }
        monitor.done();
        final var workflowContext = createWorkflowContext(space, itemId, path);
        return loadWorkflow(monitor, path, workflowContext);
    }

    /**
     * Loads the workflow from the given context while displaying an SWT modal loading indicator
     *
     * @param ctx The workflow context
     * @return The optional workflow manager that has been loaded.
     */
    public static Optional<WorkflowManager> loadWorkflowWithProgress(final WorkflowContextV2 ctx) {
        return runWithProgress(LOADING_WORKFLOW_PROGRESS_MSG, LOGGER,
            progress -> loadWorkflow(progress, ctx.getExecutorInfo().getLocalWorkflowPath(), ctx));
    }

    private static WorkflowManager loadWorkflow(final IProgressMonitor monitor, final Path path,
        final WorkflowContextV2 workflowContext) {
        final var wfFile = path.resolve(WorkflowPersistor.WORKFLOW_FILE);
        var isComponentProject = path.resolve(WorkflowPersistor.TEMPLATE_FILE).toFile().exists();

        if (isComponentProject) {
            try {
                return loadComponentProject(monitor, wfFile, workflowContext);
            } catch (OperationCanceledException e) { // If a locked component cannot be opened
                LOGGER.error(e);
                return null;
            }
        }

        var wfmRef = new AtomicReference<WorkflowManager>();
        final BiConsumer<WorkflowManager, Boolean> wfmLoadedCallback = (wfm, doSave) -> {
            wfmRef.set(wfm);
            if (Boolean.TRUE.equals(doSave)) {
                doSaveWorkflowWithWorkflowManager(wfm, monitor);
            }
        };
        final var runnable = new LoadWorkflowRunnable(wfmLoadedCallback, wfFile.toFile(), workflowContext);
        runnable.run(monitor); // Sets the workflow reference using the callback as a side effect

        return wfmRef.get();
    }

    private static void doSaveWorkflowWithWorkflowManager(final WorkflowManager wfm, final IProgressMonitor monitor) {
        var workflowPath = wfm.getContextV2().getExecutorInfo().getLocalWorkflowPath();
        try {
            var exec = DesktopAPUtil.toExecutionMonitor(monitor);
            wfm.save(workflowPath.toFile(), exec, true);
        } catch (final IOException | CanceledExecutionException | LockFailedException e) {
            // should never happen
            LOGGER.error(e);
        }
    }

    private static WorkflowManager loadComponentProject(final IProgressMonitor monitor, final Path wfFile,
        final WorkflowContextV2 workflowContext) throws OperationCanceledException {
        final var wfmRef = new AtomicReference<WorkflowManager>();

        // The detour via `File` is needed to make Windows network mounts like `\\MyNAS\workspace\My Component` work,
        // it creates `file:////MyNAS/workspace/My%20Component` instead of `file://MyNAS/workspace/My%20Component`.
        final var fileUri = wfFile.toFile().toURI();
        final var runnable = new LoadMetaNodeTemplateRunnable(wfmRef::set, fileUri, workflowContext, false, true);
        runnable.run(monitor); // Sets the workflow reference using the callback as a side effect
        final var wfm = wfmRef.get();

        if (wfm != null && wfm.isEncrypted()) { // In case a locked component is opened
            final var prompt = new GUIWorkflowCipherPrompt(true);
            var unlocked = Display.getDefault().syncCall(() -> wfm.unlock(prompt));
            if (!unlocked) { // If a locked component cannot be opened
                final var title = "Component could not be opened";
                final var message = "Component could not be opened: Access denied";
                showError(title, message);
                throw new OperationCanceledException(message);
            }
        }

        return wfm;
    }

    private static WorkflowContextV2 createWorkflowContext(final Space space, final String itemId, final Path path) {
        final var mountId = space.toKnimeUrl(itemId).getAuthority();
        final var location = space.getLocationInfo(itemId);

        // TODO A local space root makes no sense for temp-copy mode, remove this workaround when AP-22097 is closed.
        final var localSpaceRoot = location instanceof RestLocationInfo ? path.getParent() : space.getLocalRootPath();
        return WorkflowContextV2.builder() //
            .withAnalyticsPlatformExecutor(builder -> builder //
                .withCurrentUserAsUserId() //
                .withLocalWorkflowPath(path) //
                .withMountpoint(mountId, localSpaceRoot)) //
            .withLocation(location) //
            .build();
    }

    /**
     * Checks for release and bugfix updates for the AP.
     *
     * @return The state of the AP in terms of {@link UpdateState}.
     */
    public static UpdateState checkForUpdate() {
        List<UpdateInfo> newReleases = new ArrayList<>();
        List<String> bugfixes = new ArrayList<>();
        try {
            UpdateDetector.checkForNewRelease().forEach(newReleases::add);
            UpdateDetector.checkForBugfixes().forEach(bugfixes::add);
        } catch (IOException | URISyntaxException e) {
            NodeLogger.getLogger(DesktopAPUtil.class).error("Could not check for updates", e);
        }
        return new UpdateState() {
            @Override
            public List<UpdateInfo> getNewReleases() {
                return newReleases;
            }

            @Override
            public List<String> getBugfixes() {
                return bugfixes;
            }
        };
    }

    /**
     * Shows a question dialog.
     * @param title dialog title
     * @param message question
     * @return {@code true} if the user accepted the question, {@code false} otherwise
     */
    public static boolean openQuestion(final String title, final String message) {
        final AtomicBoolean res = new AtomicBoolean();
        Display.getDefault().syncExec(() -> {
            @SuppressWarnings("restriction")
            var sh = org.knime.core.ui.util.SWTUtilities.getActiveShell();
            res.set(MessageDialog.openQuestion(sh, title, message));
        });
        return res.get();
    }

    /**
     * Shows an SWT warning.
     *
     * @param title warning title
     * @param message warning message
     */
    public static void showWarning(final String title, final String message) {
        Display.getDefault().syncExec(() -> {
            @SuppressWarnings("restriction")
            var sh = org.knime.core.ui.util.SWTUtilities.getActiveShell();
            MessageDialog.openWarning(sh, title, message);
        });
    }

    /** Answer to the question dialog asking whether a remote workflow should be overwritten. */
    public enum OverwriteRemotelyResult {
        /** Abort upload. */
        CANCEL,
        /** Overwrite workflow without creating a snapshot. */
        OVERWRITE,
        /** First create a snapshot and then upload the workflow. */
        OVERWRITE_WITH_SNAPSHOT
    }

    /**
     * Opens a dialog asking whether a remote workflow should be overwritten.
     *
     * @param remoteStore file store representing the remote workflow
     * @param location location name, either {@code "Hub"} or {@code "Server"}
     * @return pair of answer and the comment to be used if the answer is
     *        {@link OverwriteRemotelyResult#OVERWRITE_WITH_SNAPSHOT}
     */
    public static Pair<OverwriteRemotelyResult, String> openOverwriteRemotelyDialog(
            final AbstractExplorerFileStore remoteStore, final String location) {
        final var snapshotPanelRef = new AtomicReference<SnapshotPanel>();
        @SuppressWarnings("restriction")
        final var shell = org.knime.core.ui.util.SWTUtilities.getActiveShell();
        final var dialog = new MessageDialog(shell, "Overwrite on " + location + "?", null,
            "The workflow\n\n\t" + remoteStore.getMountIDWithFullPath()
                + "\n\nalready exists on the " + location + ". Do you want to overwrite it?\n",
            MessageDialog.QUESTION, new String[] { IDialogConstants.NO_LABEL, IDialogConstants.YES_LABEL }, 1) {
            @Override
            protected Control createCustomArea(final Composite parent) {
                final var contentProvider = remoteStore.getContentProvider();
                if (contentProvider.supportsSnapshots()) {
                    final var forceSnapshot = contentProvider.isForceSnapshotCreation();
                    final var panel = new SnapshotPanel(parent, SWT.NONE, forceSnapshot);
                    panel.setEnabled(true);
                    snapshotPanelRef.set(panel);
                    return panel;
                } else {
                    return null;
                }
            }
        };

        if (dialog.open() != 1) {
            return Pair.create(OverwriteRemotelyResult.CANCEL, null);
        }

        final var snapshotPanel = snapshotPanelRef.get();
        if (snapshotPanel != null && snapshotPanel.createSnapshot()) {
            return Pair.create(OverwriteRemotelyResult.OVERWRITE_WITH_SNAPSHOT, snapshotPanel.getComment());
        } else {
            return Pair.create(OverwriteRemotelyResult.OVERWRITE, null);
        }
    }

    /**
     * Shows an SWT error.
     *
     * @param title error title
     * @param message error message
     */
    public static void showError(final String title, final String message) {
        Display.getDefault().syncExec(() -> {
            @SuppressWarnings("restriction")
            var sh = org.knime.core.ui.util.SWTUtilities.getActiveShell();
            MessageDialog.openError(sh, title, message);
        });
    }

    /**
     * Logs a warning in addition to showing a warning using {@link #showWarning(String, String)}.
     *
     * @param title title of warning and log message
     * @param message warning message
     * @param logger logger to use
     * @param e exception to log
     */
    public static void showWarningAndLogError(final String title, final String message, final NodeLogger logger,
            final Throwable e) {
        logger.error(title + ": " + message, e);
        showWarning(title, message);
    }

    /**
     * Logs an error in addition to showing it using {@link #showError(String, String)}.
     *
     * @param title title of warning and log message
     * @param message warning message
     * @param logger logger to use
     * @param e exception to log
     */
    public static void showAndLogError(final String title, final String message, final NodeLogger logger,
            final Throwable e) {
        logger.error(title + ": " + message, e);
        showError(title, message);
    }

    /**
     * Adapts the given {@link IProgressMonitor} to be able to signal cancellation as an {@link ExecutionMonitor}.
     *
     * @param monitor progress monitor to adapt
     * @return execution monitor adapter
     */
    public static ExecutionMonitor toExecutionMonitor(final IProgressMonitor monitor) {
        return new ExecutionMonitor(new ProgressMonitorAdapter(monitor));
    }

    /**
     * Runs the given function while showing a modal SWT dialog with progress information.
     *
     * @param <R> Result type of the task
     * @param name name of the operation for error messages, e.g. {@code "Opening workflow"}
     * @param logger logger to use
     * @param task Task to perform
     * @return returned value
     */
    public static <R> Optional<R> runWithProgress(final String name, final NodeLogger logger,
        final FailableFunction<IProgressMonitor, R, InvocationTargetException> task) {
        return composedRunWithProgress(name, logger, task,
            cause -> showWarningAndLogError(name + " failed", cause.getMessage(), logger, cause));
    }

    /**
     * Runs the given function while showing a modal SWT dialog with progress information but no SWT warning dialog.
     *
     * @param <R> Result type of the task
     * @param name name of the operation for progress information
     * @param logger logger to use
     * @param task function to call
     * @return returned value
     */
    public static <R> Optional<R> runWithProgressWithoutWarnings(final String name, final NodeLogger logger,
        final FailableFunction<IProgressMonitor, R, InvocationTargetException> task) {
        return composedRunWithProgress(name, logger, task,
            cause -> logger.error("%s failed: %s".formatted(name, cause.getMessage())));
    }

    /**
     * @param name Name of the operation for progress information
     * @param logger Logger to use
     * @param task
     * @param errorHandler
     * @return An Optional containing the result of the task
     * @param <R> Result type of the task
     */
    private static <R> Optional<R> composedRunWithProgress(final String name, final NodeLogger logger,
        final FailableFunction<IProgressMonitor, R, InvocationTargetException> task,
        final Consumer<Throwable> errorHandler) {
        try {
            final var result = new AtomicReference<R>();
            PlatformUI.getWorkbench().getProgressService().busyCursorWhile(monitor -> result.set(task.apply(monitor)));
            return Optional.ofNullable(result.get());
        } catch (InvocationTargetException e) {
            // `InvocationTargetException` doesn't have value itself (and often no message), report its cause instead
            errorHandler.accept(Optional.ofNullable(e.getCause()).orElse(e));
        } catch (InterruptedException e) {
            logger.warn(name + " interrupted");
            Thread.currentThread().interrupt();
        }
        return Optional.empty();
    }

    /**
     * Run the given {@code consumer} (function with argument and void return type), re-throwing any exceptions that
     * occur during its execution but only logging an interrupt.
     *
     * @param name The name of the consumer task.
     * @param logger The logger to use.
     * @param consumer The task to perform.
     * @throws Throwable Throwable thrown by the consumer task (checked or unchecked).
     */
    @SuppressWarnings("unchecked")
    public static <T extends Throwable> void consumerWithProgress(final String name, final NodeLogger logger,
        final FailableConsumer<IProgressMonitor, T> consumer) throws T {
        try {
            PlatformUI.getWorkbench().getProgressService().busyCursorWhile(monitor -> {
                try {
                    consumer.accept(monitor);
                } catch (Throwable e) {
                    // arguments to `busyCursorWhile` are only allowed to throw InvocationTargetExceptions
                    throw new InvocationTargetException(e);
                }
            });
        } catch (InvocationTargetException e) { // NOSONAR: Will be logged one level up
            // recover original exception (cause) from consumer
            throw (T)e.getCause();
        } catch (InterruptedException e) {
            logger.warn(name + " interrupted");
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Downloads a remote workflow into a temporary directory.
     *
     * @param remoteFileStore
     * @param locationInfo if {@code null} it will be inferred from 'remoteFileStore'
     * @return an empty optional if the download or opening the workflow failed
     */
    public static Optional<RemoteWorkflowInput> downloadWorkflowWithProgress(
        final RemoteExplorerFileStore remoteFileStore, final HubSpaceLocationInfo locationInfo) {
        return runWithProgress(LOADING_WORKFLOW_PROGRESS_MSG, LOGGER,
            progress -> downloadWorkflowFromMountpoint(progress, remoteFileStore, locationInfo));
    }

    /**
     * Downloads a remote workflow into a temporary directory, but warnings suppressed.
     *
     * @param remoteFileStore
     * @param locationInfo if {@code null} it will be inferred from 'remoteFileStore'
     * @return an empty optional if the download or opening the workflow failed
     */
    public static Optional<RemoteWorkflowInput> downloadWorkflowWithProgressWithoutWarnings(
        final RemoteExplorerFileStore remoteFileStore, final HubSpaceLocationInfo locationInfo) {
        return runWithProgressWithoutWarnings(LOADING_WORKFLOW_PROGRESS_MSG, LOGGER,
            progress -> downloadWorkflowFromMountpoint(progress, remoteFileStore, locationInfo));
    }

    /**
     * Downloads a remote workflow into a temporary directory. This code is heavily inspired by the
     * {@link DownloadAndOpenWorkflowAction}.
     *
     * @param progress
     * @param source source file store
     * @param locationInfo inferred from {@code source} if null.
     * @return
     * @throws InterruptedException
     */
    private static RemoteWorkflowInput downloadWorkflowFromMountpoint(final IProgressMonitor progress,
        final RemoteExplorerFileStore source, final LocationInfo locationInfo) {
        final LocalExplorerFileStore tmpDestDir;
        try {
            // It's possible to out-run the KNIME-Explorer fetcher in here, and then the workflow can't be downloaded
            if (!waitForMountpointToFinishFetching(progress, source)) {
                // user has aborted
                return null;
            }

            // fetch the actual name from the remote side because `source.getName()` may only return the repository ID
            // at that is not always a valid directory name
            final var name = source.fetchInfo().getName();
            tmpDestDir = ExplorerMountTable.createExplorerTempDir(name).getChild(name);
            tmpDestDir.mkdir(EFS.NONE, progress);
        } catch (CoreException e1) {
            throw new IllegalStateException(e1);
        } catch (InterruptedException e1) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e1);
        }

        final String[] content;
        try {
            new WorkflowDownload(source, tmpDestDir, false, null, progress).runSync(progress);
            content = tmpDestDir.childNames(EFS.NONE, progress);
            if (content == null || content.length == 0) {
                tmpDestDir.delete(EFS.NONE, progress);
                throw new IllegalStateException("Error during download: No content available.");
            }
        } catch (CoreException e) {
            throw new IllegalStateException(e);

        }

        // it is weird if the length is not 1 (because we downloaded one item)
        var workflowDir = content.length == 1 ? tmpDestDir.getChild(content[0]) : tmpDestDir;
        if (workflowDir.fetchInfo().isDirectory()) {
            final LocalExplorerFileStore wf = workflowDir.getChild(WorkflowPersistor.WORKFLOW_FILE);
            if (wf.fetchInfo().exists()) {
                workflowDir = wf;
            } else {
                // directories that are not workflows cannot be opened
                throw new IllegalStateException("Cannot open downloaded content: Directory doesn't contain a workflow");
            }
        }

        final WorkflowContextV2 context;
        try {
            final var localWorkflowPath = workflowDir.getParent().toLocalFile().toPath();
            final var mountpointRoot = workflowDir.getContentProvider().getRootStore().toLocalFile().toPath();
            var effectiveLocationInfo = locationInfo == null ? source.locationInfo().orElse(null) : locationInfo;
            CheckUtils.checkNotNull(effectiveLocationInfo, "Location info could not be determined for " + source);
            context = WorkflowContextV2.builder() //
                .withAnalyticsPlatformExecutor(builder -> builder //
                    .withCurrentUserAsUserId() //
                    .withLocalWorkflowPath(localWorkflowPath) //
                    .withMountpoint(source.getMountID(), mountpointRoot)) //
                .withLocation(effectiveLocationInfo) //
                .build(); //
        } catch (CoreException e) {
            throw new IllegalStateException(e);
        }

        return new RemoteWorkflowInput(workflowDir, context);
    }

    /**
     * We have to wait for the mountpoint to finish its initial fetching process, otherwise the {@link WorkflowDownload}
     * receives a {@link RemoteExplorerFileInfo} which claims that it is neither for a workflow nor for a component.
     * Since we can't access anything from here which could tell us directly when the mountpoint is finished loading, we
     * ask {@link AbstractContentProvider} for the source workflow's (hypothetical) children instead and check whether a
     * message with a specific string content is returned.
     *
     * @param fileStore source file store
     * @return newly fetch file store
     */
    public static boolean waitForMountpointToFinishFetching(final AbstractExplorerFileStore fileStore) {
        final var provider = fileStore.getContentProvider();
        if (fileStore instanceof RemoteExplorerFileStore && isMountpointFetching(provider, fileStore)) {
            return runWithProgress("Fetching remote contents...", LOGGER, progress -> {
                try {
                    return waitForMountpointToFinishFetching(progress, fileStore);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            }).orElse(false);
        }
        return true;
    }

    /**
     * We have to wait for the mountpoint to finish its initial fetching process, otherwise the {@link WorkflowDownload}
     * receives a {@link RemoteExplorerFileInfo} which claims that it is neither for a workflow nor for a component.
     * Since we can't access anything from here which could tell us directly when the mountpoint is finished loading, we
     * ask {@link AbstractContentProvider} for the source workflow's (hypothetical) children instead and check whether a
     * message with a specific string content is returned.
     *
     * @param progress progress monitor
     * @param fileStore source file store
     * @return newly fetch file store
     * @throws InterruptedException if the waiting was interrupted
     */
    public static boolean waitForMountpointToFinishFetching(final IProgressMonitor progress,
            final AbstractExplorerFileStore fileStore) throws InterruptedException {
        // TODO AP-22079 remove this immediately after the "hybrid mode" of CUI and MUI has been retired
        final var provider = fileStore.getContentProvider();
        if (fileStore instanceof RemoteExplorerFileStore) {
            progress.subTask("Waiting for remote directory to load...");
            for (var i = 0; i < 600; i++) {
                if (progress.isCanceled()) {
                    return false;
                }
                if (!isMountpointFetching(provider, fileStore)) {
                    break;
                }
                Thread.sleep(500);
            }
        }
        return true;
    }

    private static boolean isMountpointFetching(final AbstractContentProvider provider,
            final AbstractExplorerFileStore filestore) {
        final var children = provider.getChildren(filestore);
        return children.length == 1 && children[0] instanceof MessageFileStore msg
                && "Fetching content...".equals(msg.getName());
    }

    /**
     * Open an editor for the given file store in the shared editor area.
     *
     * @param fileStore The file store for the editor.
     * @param locationInfo if {@code null} it will be inferred from 'fileStore'
     * @return A boolean indicating whether the project has been opened successfully or not.
     * @throws PartInitException If the editor part could not be initialized.
     */
    public static boolean openEditor(final AbstractExplorerFileStore fileStore, final HubSpaceLocationInfo locationInfo)
        throws PartInitException {
        final IEditorInput input;
        if (fileStore instanceof RemoteExplorerFileStore remoteFileStore) {
            final var tempInput = downloadWorkflowWithProgressWithoutWarnings(remoteFileStore, locationInfo);

            if (tempInput.isEmpty()) {
                return false; // Since an empty optional means downloading failed
            }

            input = tempInput.get();
        } else {
            input = new FileStoreEditorInput(fileStore.getChild(WorkflowPersistor.WORKFLOW_FILE));
        }
        var page = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage();
        page.openEditor(input, WorkflowEditor.ID, false);

        return true;
    }

}
