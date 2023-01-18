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
package org.knime.ui.java.browser.lifecycle;

import java.util.Arrays;
import java.util.function.Predicate;
import java.util.function.Supplier;

import org.knime.core.node.NodeLogger;
import org.knime.gateway.impl.webui.AppStateProvider.AppState;
import org.knime.ui.java.util.AppStatePersistor;

import com.equo.chromium.swt.Browser;

/**
 * Represents the life cycle of the KNIME UI and allows one to step through the different phases of it. A phase is only
 * executed once even if being called multiple times in a row. The phases need to be called in a strict order (see
 * {@link Phase#rank()}). called.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class LifeCycle {

    @SuppressWarnings("javadoc")
    public enum Phase {
            NULL(-1), CREATE(0), INIT(1), PAGE_LOADED(2), PRE_SUSPEND(3), SUSPEND(4), SHUTDOWN(5);

        private final int m_rank;

        Phase(final int rank) {
            m_rank = rank;
        }

        int rank() {
            return m_rank;
        }
    }

    private static LifeCycle instance = null;

    /**
     * @return the singleton lifecycle-instance
     */
    public static LifeCycle get() {
        if (instance == null) {
            instance = new LifeCycle();
        }
        return instance;
    }

    private static final NodeLogger LOGGER = NodeLogger.getLogger(LifeCycle.class);

    private LifeCycleState m_state = null;

    private Phase m_lastPhase = Phase.NULL;

    private LifeCycle() {
        // singleton
    }

    /**
     * Called once at first.
     */
    public void create() {
        runPhase(Phase.CREATE, Create::runPhase, null, Phase.NULL);
    }

    /**
     * Runs the init-phase.
     *
     * @param appStateSupplier can be {@code null} - in that case the app state is loaded from a file (see
     *            {@link AppStatePersistor#loadAppState()}
     * @param browser required to initialize browser functions
     */
    public void init(final Supplier<AppState> appStateSupplier, final Browser browser) {
        runPhase(Phase.INIT, () -> m_state = Init.runPhase(appStateSupplier, browser), null, Phase.CREATE,
            Phase.SUSPEND);
    }

    /**
     * Runs the phase required once the (web-)page is loaded.
     *
     * @param browser
     */
    public void pageLoaded(final Browser browser) {
        runPhase(Phase.PAGE_LOADED, () -> PageLoaded.runPhase(browser), null, Phase.INIT);
    }

    /**
     * Runs the preSuspend-phase.
     */
    public void preSuspend() {
        runPhase(Phase.PRE_SUSPEND, () -> m_state = PreSuspend.runPhase(m_state), s -> !s.workflowsSaved(),
            Phase.PAGE_LOADED);
    }

    /**
     * Runs the suspend-phase.
     */
    public void suspend() {
        runPhase(Phase.SUSPEND, () -> m_state = Suspend.runPhase(m_state), null, Phase.PRE_SUSPEND);
    }

    /**
     * Runs the shutdown-phase.
     */
    public void shutdown() {
        runPhase(Phase.SHUTDOWN, () -> Shutdown.runPhase(m_state), null, Phase.SUSPEND);
    }

    private void runPhase(final Phase nextPhase, final Runnable runPhase, final Predicate<LifeCycleState> abort,
        final Phase... expectedLastPhases) {
        if (nextPhase == m_lastPhase) {
            // avoid the same phase being called multiple times in a row
            return;
        }
        assert Arrays.stream(expectedLastPhases).anyMatch(expectedLastPhase -> expectedLastPhase == m_lastPhase);
        runPhase.run();
        if (abort != null && abort.test(m_state)) {
            LOGGER.info("Phase '" + nextPhase.name() + "' aborted");
            return;
        }
        m_lastPhase = nextPhase;
        LOGGER.info("Phase '" + m_lastPhase.name() + "' finished");
    }

    /**
     * @param phase the phase to check
     * @return {@code true} if the passed phase is the last phase that was run, otherwise {@code false}
     */
    public boolean isLastPhase(final Phase phase) {
        return m_lastPhase == phase;
    }

    /**
     * @param phase the phase to check
     * @return {@code true} if the passed phase is strictly before the last phase that was run, otherwise {@code false}
     */
    public boolean isBeforePhase(final Phase phase) {
        return m_lastPhase.rank() < phase.rank();
    }

}
