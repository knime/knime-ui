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
import org.knime.core.node.util.CheckUtils;
import org.knime.gateway.impl.webui.AppStateProvider.AppState;
import org.knime.ui.java.util.AppStatePersistor;

import com.equo.chromium.swt.Browser;

/**
 * Represents the life cycle (which is a finite state machine) of the KNIME UI and allows one to step through the
 * different phases/states of it. A state-transition is only executed once even if being called multiple times in a row.
 * The state transitions need to be called in a strict order (see {@link StateTransition#rank()}). called.
 *
 * <pre>
 * NULL ┌─────┐ SHUTDOWN ┌─────────┐      SUSPEND     ┌─────────┐
 * ─────►Null ◄──────────┤Suspended◄──────────────────┤Persisted│
 *      └──┬──┘          └────┬────┘                  └────▲────┘
 *   CREATE│                  │INIT                        │SAVE_STATE
 *     ┌───▼───┐   INIT ┌─────▼─────┐ WEB_APP_LOADED ┌─────┴─────┐
 *     │Created├────────►Initialized├────────────────►Operational│
 *     └───────┘        └───────────┘                └───────────┘
 * </pre>
 * (created with asciiflow)
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class LifeCycle {

    /**
     * All the state transitions to move from one life-cycle state to the other. The state transitions must be executed
     * in a strict order (see {@link #rank()}. Each enum-value corresponds to a method in this class.
     */
    @SuppressWarnings("javadoc")
    public enum StateTransition {
            NULL(-1), CREATE(0), INIT(1), WEB_APP_LOADED(2), SAVE_STATE(3), SUSPEND(4), SHUTDOWN(5);

        private final int m_rank;

        StateTransition(final int rank) {
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

    private StateTransition m_lastStateTransition = StateTransition.NULL;

    private LifeCycle() {
        // singleton
    }

    /**
     * Called once at first.
     */
    public void create() {
        doStateTransition(StateTransition.CREATE, Create::run, null, StateTransition.NULL);
    }

    /**
     * Runs the init-state-transition.
     *
     * @param appStateSupplier can be {@code null} - in that case the app state is loaded from a file (see
     *            {@link AppStatePersistor#loadAppState()}
     * @param browser required to initialize browser functions
     */
    public void init(final Supplier<AppState> appStateSupplier, final Browser browser) {
        doStateTransition(StateTransition.INIT, () -> m_state = Init.run(appStateSupplier, browser), null,
            StateTransition.CREATE, StateTransition.SUSPEND);
    }

    /**
     * Runs the state transition required once the web app (web page) is loaded.
     *
     * @param browser
     */
    public void webAppLoaded(final Browser browser) {
        doStateTransition(StateTransition.WEB_APP_LOADED, () -> WebAppLoaded.runPhase(browser), null,
            StateTransition.INIT);
    }

    /**
     * Runs the save-state-state-transition.
     */
    public void saveState() {
        doStateTransition(StateTransition.SAVE_STATE, () -> m_state = SaveState.run(m_state), s -> !s.workflowsSaved(),
            StateTransition.WEB_APP_LOADED);
    }

    /**
     * Runs the suspend-state-transition.
     */
    public void suspend() {
        doStateTransition(StateTransition.SUSPEND, () -> m_state = Suspend.run(m_state), null,
            StateTransition.SAVE_STATE);
    }

    /**
     * Runs the shutdown-state-transition.
     */
    public void shutdown() {
        doStateTransition(StateTransition.SHUTDOWN, () -> Shutdown.run(m_state), null, StateTransition.SUSPEND);
    }

    private void doStateTransition(final StateTransition nextStateTransition, final Runnable runStateTransition,
        final Predicate<LifeCycleState> abort, final StateTransition... expectedLastStateTransitions) {
        if (nextStateTransition == m_lastStateTransition) {
            // avoid the same state transition being called multiple times in a row
            return;
        }

        checkExpectedLastStateTransition(m_lastStateTransition, nextStateTransition, expectedLastStateTransitions);

        runStateTransition.run();
        if (abort != null && abort.test(m_state)) {
            LOGGER.info("Phase '" + nextStateTransition.name() + "' aborted");
            return;
        }
        m_lastStateTransition = nextStateTransition;
        LOGGER.info("Phase '" + m_lastStateTransition.name() + "' finished");
    }

    private static void checkExpectedLastStateTransition(final StateTransition lastStateTransition,
        final StateTransition nextStateTransition, final StateTransition... expectedLastStateTransitions) {
        boolean match = Arrays.stream(expectedLastStateTransitions)
            .anyMatch(expectedLastPhase -> expectedLastPhase == lastStateTransition);
        CheckUtils.checkState(match,
            "Life cycle state transition '%s' failed; wrong life cycle state transition. Last state transition: '%s'. "
                + "Expected last state transition(s): %s",
            nextStateTransition, lastStateTransition, Arrays.toString(expectedLastStateTransitions));
    }

    /**
     * @param stateTransition the state transition to check
     * @return {@code true} if the passed state transition is the last state transition that was run, otherwise
     *         {@code false}
     */
    public boolean isLastStateTransition(final StateTransition stateTransition) {
        return m_lastStateTransition == stateTransition;
    }

    /**
     * @param stateTransition the state transition to check
     * @return {@code true} if the passed state transition is strictly before the last state transition that was run,
     *         otherwise {@code false}
     */
    public boolean isBeforeStateTransition(final StateTransition stateTransition) {
        return m_lastStateTransition.rank() < stateTransition.rank();
    }

}
