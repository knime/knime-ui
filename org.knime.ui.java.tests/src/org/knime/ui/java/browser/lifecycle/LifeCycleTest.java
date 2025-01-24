/*
 * ------------------------------------------------------------------------
 *
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.org; Email: contact@knime.org
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
 *   Mar 2, 2023 (hornm): created
 */
package org.knime.ui.java.browser.lifecycle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.function.BiConsumer;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.knime.core.webui.node.dialog.NodeDialogManager;
import org.knime.core.webui.node.port.PortViewManager;
import org.knime.core.webui.node.view.NodeViewManager;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.service.ServiceInstances;
import org.knime.js.cef.CEFPlugin;
import org.knime.testing.util.WorkflowManagerUtil;
import org.knime.ui.java.api.DesktopAPI;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.ui.java.browser.lifecycle.LifeCycle.StateTransition;
import org.knime.ui.java.util.AppStatePersistorTest;
import org.knime.ui.java.util.PerspectiveUtil;
import org.mockito.Mockito;
import org.osgi.framework.BundleContext;
import org.osgi.framework.FrameworkUtil;

import com.equo.comm.api.ICommService;
import com.equo.middleware.api.IMiddlewareService;

/**
 * Tests logic related to {@link LifeCycle}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class LifeCycleTest {

    @BeforeEach
    void initICommService() {
      BundleContext ctx = FrameworkUtil.getBundle(ICommService.class).getBundleContext();
      var commServiceMock = Mockito.mock(ICommService.class);
      ctx.registerService(ICommService.class, commServiceMock, null);
    }

    @Test
    void testHappyPath() {
        PerspectiveUtil.setClassicPerspectiveActive(false);

        var lc = LifeCycle.get();
        assertThat(lc.isNextStateTransition(StateTransition.STARTUP))//
            .as("STARTUP is the next state transition")//
            .isTrue();

        lc.startup();
        assertStateTransition(lc, StateTransition.STARTUP, StateTransition.CREATE);
        assertThat(System.getProperty(PerspectiveUtil.PERSPECTIVE_SYSTEM_PROPERTY))//
            .as("System property is set correctly")//
            .isEqualTo(PerspectiveUtil.WEB_UI_PERSPECTIVE_ID);

        var middlewareServiceMock = Mockito.mock(IMiddlewareService.class);
        CEFPlugin.setMiddlewareService(middlewareServiceMock);
        lc.create(mock(BiConsumer.class));
        assertStateTransition(lc, StateTransition.CREATE, StateTransition.INIT);
        verify(middlewareServiceMock).addResourceHandler(eq("https"), eq(KnimeBrowserView.DOMAIN_NAME), any());
        verify(middlewareServiceMock).addResourceHandler(eq("https"),
            eq(NodeDialogManager.getInstance().getPageResourceManager().getDomainName()), any());
        verify(middlewareServiceMock).addResourceHandler(eq("https"),
            eq(NodeViewManager.getInstance().getPageResourceManager().getDomainName()), any());
        verify(middlewareServiceMock).addResourceHandler(eq("https"),
            eq(PortViewManager.getInstance().getPageResourceManager().getDomainName()), any());

        lc.init(true);
        assertStateTransition(lc, StateTransition.INIT, StateTransition.WEB_APP_LOADED);
        assertThat(ServiceInstances.areServicesInitialized())//
            .as("Services aren't initialized")//
            .isFalse();
        assertThat(DesktopAPI.areDependenciesInjected())//
            .as("Desktop API dependecies are injected")//
            .isTrue();

        // test that multiple calls of the same life cycle transitions doesn't have an effect
        lc.init(true);
        lc.init(true);
        lc.init(true);

        lc.webAppLoaded();
        assertStateTransition(lc, StateTransition.WEB_APP_LOADED, StateTransition.SAVE_STATE);

        lc.reload();
        assertStateTransition(lc, StateTransition.WEB_APP_LOADED, StateTransition.SAVE_STATE);

        AppStatePersistorTest.openWorkflowProject(false);
        lc.saveState(null);
        assertStateTransition(lc, StateTransition.SAVE_STATE, StateTransition.SUSPEND);

        lc.suspend();
        assertStateTransition(lc, StateTransition.SUSPEND, StateTransition.SHUTDOWN);
        assertThat(ServiceInstances.areServicesInitialized())//
            .as("Services aren't initialized")//
            .isFalse();
        assertThat(DesktopAPI.areDependenciesInjected())//
            .as("Desktop API dependecies aren't injected")//
            .isFalse();

        lc.shutdown();
         AppStatePersistorTest.assertAppStateFileExists();
    }

    @Test
    void testIllegalStateTransitions() { // NOSONAR
        var lc = LifeCycle.get();
        var biConsumer = mock(BiConsumer.class);

        lc.startup();
        lc.shutdown(); // allowed directly after startup

        lc.resetLifeCycleState();

        lc.startup();
        assertFails(() -> lc.init(false));
        assertFails(lc::webAppLoaded);
        assertFails(() -> lc.saveState(null));
        assertFails(lc::suspend);

        CEFPlugin.setMiddlewareService(mock(IMiddlewareService.class));
        lc.create(biConsumer);
        assertFails(lc::startup);
        assertFails(lc::webAppLoaded);
        assertFails(lc::reload);
        assertFails(() -> lc.saveState(null));
        assertFails(lc::suspend);
        assertFails(lc::shutdown);

        lc.init(false);
        assertFails(lc::startup);
        assertFails(() -> lc.create(biConsumer));
        assertFails(lc::reload);
        assertFails(() -> lc.saveState(null));
        assertFails(lc::suspend);
        assertFails(lc::shutdown);

        lc.webAppLoaded();
        assertFails(lc::startup);
        assertFails(() -> lc.init(false));
        assertFails(() -> lc.create(biConsumer));
        assertFails(lc::suspend);
        assertFails(lc::shutdown);

        lc.saveState(null);
        assertFails(lc::startup);
        assertFails(() -> lc.init(false));
        assertFails(() -> lc.create(biConsumer));
        assertFails(lc::webAppLoaded);
        assertFails(lc::reload);
        assertFails(lc::shutdown);

        lc.suspend();
        assertFails(lc::startup);
        assertFails(() -> lc.create(biConsumer));
        assertFails(lc::webAppLoaded);
        assertFails(lc::reload);
        assertFails(() -> lc.saveState(null));
        lc.init(false); // init is allowed here again

        lc.setStateTransition(StateTransition.SUSPEND);
        assertThat(lc.isLastStateTransition(StateTransition.SUSPEND))//
            .as("Last state transition is SUSPEND")//
            .isTrue();

        lc.shutdown();
        assertFails(() -> lc.create(biConsumer));
        assertFails(() -> lc.init(false));
        assertFails(lc::webAppLoaded);
        assertFails(lc::reload);
        assertFails(() -> lc.saveState(null));
        assertFails(lc::suspend);
    }

    /**
     * Tests {@link LifeCycle#forceShutdown()} which can be called any time.
     */
    @Test
    void testForceShutdown() { // NOSONAR we check that nothing is thrown
        var lc = LifeCycle.get();

        lc.setStateTransition(StateTransition.CREATE);
        lc.forceShutdown();

        lc.setStateTransition(StateTransition.INIT);
        lc.forceShutdown();

        lc.setStateTransition(StateTransition.WEB_APP_LOADED);
        lc.forceShutdown();

        lc.setStateTransition(StateTransition.SUSPEND);
        lc.forceShutdown();
    }

    private static void assertFails(final Executable executable) {
        var message = assertThrows(IllegalStateException.class, executable, "Throws incorrect exception").getMessage();
        assertThat(message)//
            .as("Correct message contained in thrown exception")//
            .contains("wrong life cycle state transition");
    }

    private static void assertStateTransition(final LifeCycle lc, final StateTransition last,
        final StateTransition next) {
        if (last != null) {
            assertThat(lc.isLastStateTransition(last))//
                .as("Last state transition really is final")//
                .isTrue();
        }
        assertThat(lc.isBeforeStateTransition(next))//
            .as("Life cycle state really is before next transition")//
            .isTrue();
        assertThat(lc.isNextStateTransition(next))//
            .as("Next state transition really is next")//
            .isTrue();
    }

    @AfterEach
    void cleanUp() {
        LifeCycle.get().resetLifeCycleState();
        ServiceInstances.disposeAllServiceInstancesAndDependencies();
        DesktopAPI.disposeDependencies();
        var wpm = ProjectManager.getInstance();
        wpm.getProjectIds().forEach(id -> wpm.removeProject(id, WorkflowManagerUtil::disposeWorkflow));
    }

}
