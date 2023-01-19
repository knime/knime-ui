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
 *   Jan 18, 2023 (leonard.woerteler): created
 */
package org.knime.ui.java.util;

import java.lang.reflect.InvocationTargetException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.browser.BrowserFunction;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.DefaultNodeProgressMonitor;
import org.knime.core.node.ExecutionMonitor;
import org.knime.core.node.NodeLogger;

/**
 * Utilities for opening legacy AP dialog elements from  {@link BrowserFunction}s.
 *
 * @author Leonard Wörteler, KNIME GmbH, Konstanz, Germany
 */
public final class BrowserFunctionUtil {

    private BrowserFunctionUtil() {
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
            showWarningAndLogError(name + " failed", e.getMessage(), logger, e);
        } catch (InterruptedException e) {
            logger.warn(name + " interrupted");
            Thread.currentThread().interrupt();
        }
        return Optional.empty();
    }

    /**
     * Shows an SWT warning.
     *
     * @param title warning title
     * @param message warning message
     */
    public static void showWarning(final String title, final String message) {
        @SuppressWarnings("restriction")
        var sh = org.knime.core.ui.util.SWTUtilities.getActiveShell();
        MessageDialog.openWarning(sh, title, message);
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
            final Exception e) {
        logger.error(title + ": " + message, e);
        showWarning(title, message);
    }

    /**
     * Adapts the given {@link IProgressMonitor} to be able to signal cancellation as an {@link ExecutionMonitor}.
     *
     * @param monitor progress monitor to adapt
     * @return execution monitor adapter
     */
    public static ExecutionMonitor toExecutionMonitor(final IProgressMonitor monitor) {
        return new ExecutionMonitor(new DefaultNodeProgressMonitor() {

            @Override
            protected boolean isCanceled() {
                return super.isCanceled() || monitor.isCanceled();
            }

            @Override
            public synchronized void reset() {
                throw new IllegalStateException("Reset not supported");
            }
        });
    }
}
