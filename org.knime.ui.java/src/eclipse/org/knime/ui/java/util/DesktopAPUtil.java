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
import java.util.concurrent.atomic.AtomicReference;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.ui.PlatformUI;
import org.knime.core.eclipseUtil.UpdateChecker.UpdateInfo;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.node.workflow.contextv2.LocalLocationInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.impl.webui.UpdateStateProvider.UpdateState;
import org.knime.product.rcp.intro.UpdateDetector;
import org.knime.ui.java.browser.function.OpenWorkflowBrowserFunction;
import org.knime.workbench.editor2.LoadWorkflowRunnable;

/**
 * Summarizes shared utility methods which are only relevant if the Web UI is run within the desktop AP. Those methods,
 * e.g., either depend on some classic AP logic or they use eclipse UI elements (dialogs, progress bars).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class DesktopAPUtil {

    private DesktopAPUtil() {
        // utility
    }

    /**
     * Loads the workflow referenced by the given path using the {@link LoadWorkflowRunnable} and whose a eclipse-based
     * progress bar.
     *
     * @param absoluteLocalPath
     *
     * @return the loaded {@link WorkflowManager} or an empty optional if the loading failed (a warning message dialog
     *         will be shown in that case)
     */
    public static Optional<WorkflowManager> openWorkflowInWebUIPerspectiveOnly(final Path absoluteLocalPath) {
        var workflowContext = WorkflowContextV2.builder()
            .withAnalyticsPlatformExecutor(builder -> builder.withCurrentUserAsUserId() //
                .withLocalWorkflowPath(absoluteLocalPath)) //
            .withLocation(LocalLocationInfo.getInstance(null)) //
            .build();
        final var progressService = PlatformUI.getWorkbench().getProgressService();
        var wfmRef = new AtomicReference<WorkflowManager>();
        var loadWorkflowRunnable = new LoadWorkflowRunnable(wfmRef::set,
            absoluteLocalPath.resolve(WorkflowPersistor.WORKFLOW_FILE).toFile(), workflowContext);
        // TODO use leos utilitly method
        try {
            progressService.busyCursorWhile(loadWorkflowRunnable);
            return Optional.ofNullable(wfmRef.get());
        } catch (InvocationTargetException e) {
            showWarningAndLogError("Opening workflow failed", e.getMessage(),
                NodeLogger.getLogger(OpenWorkflowBrowserFunction.class), e);
        } catch (InterruptedException e) {
            NodeLogger.getLogger(OpenWorkflowBrowserFunction.class).warn("Opening workflow interrupted");
            Thread.currentThread().interrupt();
        }
        return Optional.empty();
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
     * Shows a warning message dialog.
     *
     * @param title
     * @param message
     */
    public static void showWarning(final String title, final String message) {
        var sh = SWTUtilities.getActiveShell();
        MessageDialog.openWarning(sh, title, message);
    }

    /**
     * Shows a message warning dialog and logs an error.
     *
     * @param title
     * @param message
     * @param logger
     * @param e
     */
    public static void showWarningAndLogError(final String title, final String message, final NodeLogger logger,
        final Exception e) {
        logger.error(title + ": " + message, e);
        showWarning(title, message);
    }

}
