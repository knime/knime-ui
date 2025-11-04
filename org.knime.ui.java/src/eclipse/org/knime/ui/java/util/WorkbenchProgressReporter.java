package org.knime.ui.java.util;

import java.util.Optional;

import org.knime.core.node.NodeLogger;
import org.knime.gateway.api.util.ProgressReporter;

/**
 * Implementation of {@link ProgressReporter} for the Eclipse Workbench environment. Delegates progress reporting to
 * {@link DesktopAPUtil#runWithProgress} for executing tasks with progress monitoring.
 *
 */
public class WorkbenchProgressReporter implements ProgressReporter {

    @Override
    public <R> Optional<R> getWithProgress(final String name, final NodeLogger logger,
                                           final FunctionWithProgress<R> task) {
        return DesktopAPUtil.runWithProgress(name, logger, task);
    }
}
