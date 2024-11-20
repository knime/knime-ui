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
 *   Sep 9, 2024 (hornm): created
 */
package org.knime.ui.java.browser;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map.Entry;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.js.cef.CEFUtils;
import org.knime.ui.java.api.SaveAndCloseProjects;

import com.equo.chromium.ChromiumBrowser;
import com.equo.chromium.swt.Browser;

/**
 * Checks for the browser health in a regular time interval. Allows the user to recover from a unresponsive browser
 * without loosing work (by still being able to save the projects in that case).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class KnimeBrowserHealthChecker {

    private static final String EMPTY_SVG =
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1\" height=\"1\"/>";

    private static final int INTERVAL_IN_MS = 10_000;

    private static Timer browerHealthCheckTimer;

    static void setup(final Browser browser) {
        if (Boolean.getBoolean("org.knime.ui.disable_healthchecker")) {
            return;
        }

        browerHealthCheckTimer = new Timer("KNIME Browser Health Checker", true); // Daemon thread
        browerHealthCheckTimer.scheduleAtFixedRate(new TimerTask() {

            @Override
            public void run() {
                if (!KnimeBrowserView.isInitialized || browser == null) {
                    return;
                }
                try {
                    CEFUtils.evaluateInBrowser((ChromiumBrowser)browser.getWebBrowser(), "return true;",
                        Duration.ofSeconds(5));
                } catch (TimeoutException ex) { // NOSONAR
                    Display.getDefault().syncExec(() -> {
                        var dialog = createMessageDialog();
                        var returnCode = dialog.open();
                        handleUserInput(returnCode);
                    });
                }
            }
        }, INTERVAL_IN_MS, INTERVAL_IN_MS);
    }

    private static void handleUserInput(final int returnCode) {
        if (returnCode == 0) {
            saveAndCloseProjects();
            PlatformUI.getWorkbench().restart();
        }
    }

    private static void saveAndCloseProjects() {
        var projectIds = ProjectManager.getInstance().getDirtyProjectsMap().entrySet().stream()
            .filter(e -> e.getValue().booleanValue()).map(Entry::getKey).toArray(String[]::new);
        // save and close projects
        var svgs = new String[projectIds.length];
        Arrays.fill(svgs, EMPTY_SVG);
        var progressService = PlatformUI.getWorkbench().getProgressService();
        SaveAndCloseProjects.saveProjectsWithProgressBar(projectIds, svgs, new AtomicReference<>(), progressService);
    }

    private static MessageDialog createMessageDialog() {
        return new MessageDialog(SWTUtilities.getActiveShell(), "User interface is not responding", null,
            "An unresponsive user interface has been detected", MessageDialog.ERROR,
            new String[]{"Save and restart", "Wait for the UI to respond"}, 1);
    }

    static void cancel() {
        if (browerHealthCheckTimer != null) {
            browerHealthCheckTimer.cancel();
            browerHealthCheckTimer = null;
        }
    }

    private KnimeBrowserHealthChecker() {
        // utility
    }

}
