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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.eclipseUtil.UpdateChecker.UpdateInfo;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.ExecutionMonitor;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.util.LockFailedException;
import org.knime.core.util.ProgressMonitorAdapter;
import org.knime.gateway.impl.webui.UpdateStateProvider.UpdateState;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.product.rcp.intro.UpdateDetector;
import org.knime.workbench.editor2.LoadWorkflowRunnable;

/**
 * Summarizes shared utility methods which are only relevant if the Web UI is run within the desktop AP. Those methods,
 * e.g., either depend on some classic AP logic or they use eclipse UI elements (dialogs, progress bars).
 *
 * @author Leonard Wörteler, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class DesktopAPUtil {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(DesktopAPUtil.class);

    private DesktopAPUtil() {
        // utility
    }

    /**
     * Loads the workflow referenced by the given path using the {@link LoadWorkflowRunnable} and whose a eclipse-based
     * progress bar.
     * @param space
     * @param itemId
     *
     * @return the loaded {@link WorkflowManager} or an empty optional if the loading failed (a warning message dialog
     *         will be shown in that case)
     */
    public static Optional<WorkflowManager> openWorkflowInWebUIPerspectiveOnly(final Space space, final String itemId) {
        return runWithProgress("Loading workflow", LOGGER, monitor -> { // NOSONAR better than inline class
            monitor.beginTask("Loading workflow...", IProgressMonitor.UNKNOWN);
            final var path = space.toLocalAbsolutePath(toExecutionMonitor(monitor), itemId);
            monitor.done();

            final var mountId = space.toKnimeUrl(itemId).getAuthority();
            final var workflowContext = WorkflowContextV2.builder() //
                .withAnalyticsPlatformExecutor(builder -> builder //
                    .withCurrentUserAsUserId() //
                    .withLocalWorkflowPath(path) //
                    .withMountpoint(mountId, space.getLocalRootPath())) //
                .withLocation(space.getLocationInfo(itemId)) //
                .build();

            final var wfFile = path.resolve(WorkflowPersistor.WORKFLOW_FILE).toFile();
            var wfmRef = new AtomicReference<WorkflowManager>();
            new LoadWorkflowRunnable((wfm, doSave) -> { // NOSONAR
                wfmRef.set(wfm);
                if (Boolean.TRUE.equals(doSave)) {
                    var workflowPath = wfm.getContextV2().getExecutorInfo().getLocalWorkflowPath();
                    try {
                        var exec = DesktopAPUtil.toExecutionMonitor(monitor);
                        wfm.save(workflowPath.toFile(), exec, true);
                    } catch (final IOException | CanceledExecutionException | LockFailedException e) {
                        // should never happen
                        LOGGER.error(e);
                    }
                }
            }, wfFile, workflowContext).run(monitor);
            return wfmRef.get();
        });
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
     * @param <T> return type
     * @param name name of the operation for error messages, e.g. {@code "Opening workflow"}
     * @param logger logger to use
     * @param func function to call
     * @return returned value
     */
    public static <T> Optional<T> runWithProgress(final String name, final NodeLogger logger,
            final Function<IProgressMonitor, T> func) {
        try {
            final var ref = new AtomicReference<T>();
            PlatformUI.getWorkbench().getProgressService().busyCursorWhile(monitor -> ref.set(func.apply(monitor)));
            return Optional.ofNullable(ref.get());
        } catch (InvocationTargetException e) {
            // `InvocationTargetException` doesn't have value itself (and often no message), report its cause instead
            final var cause = Optional.ofNullable(e.getCause()).orElse(e);
            showWarningAndLogError(name + " failed", cause.getMessage(), logger, cause);
        } catch (InterruptedException e) {
            logger.warn(name + " interrupted");
            Thread.currentThread().interrupt();
        }
        return Optional.empty();
    }

}
