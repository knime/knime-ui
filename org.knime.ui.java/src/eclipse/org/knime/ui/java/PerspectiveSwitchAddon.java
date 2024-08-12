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
 */
package org.knime.ui.java;

import javax.inject.Inject;

import org.eclipse.e4.core.contexts.IEclipseContext;
import org.eclipse.e4.core.di.annotations.Optional;
import org.eclipse.e4.core.di.extensions.EventTopic;
import org.eclipse.e4.ui.css.swt.theme.ITheme;
import org.eclipse.e4.ui.css.swt.theme.IThemeEngine;
import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.advanced.MPerspective;
import org.eclipse.e4.ui.model.application.ui.basic.MTrimmedWindow;
import org.eclipse.e4.ui.workbench.UIEvents;
import org.eclipse.e4.ui.workbench.UIEvents.EventTags;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.NodeTimer.GlobalNodeStats;
import org.knime.js.cef.CEFSystemProperties;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.ui.java.browser.lifecycle.LifeCycle;
import org.knime.ui.java.browser.lifecycle.LifeCycle.StateTransition;
import org.knime.ui.java.prefs.KnimeUIPreferences;
import org.knime.ui.java.util.ClassicWorkflowEditorUtil;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.workbench.editor2.LoadWorkflowRunnable;
import org.knime.workbench.editor2.WorkflowEditor;
import org.knime.workbench.explorer.view.actions.OpenKnimeUrlAction;
import org.knime.workbench.ui.navigator.ProjectWorkflowMap;
import org.osgi.service.event.Event;

/**
 * Registered as fragment with the application model. Listens to perspective switch events in order to remove/add stuff
 * (e.g. toolbars, trims etc.).
 *
 * Done via listener in order to add/remove that stuff no matter how the perspective is changed (e.g. via toolbar
 * action, perspective switch shortcut, etc.).
 *
 * <br/>
 * <br/>
 * For a quick intro to the e4 application model please read 'E4_Application_Model.md'.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH
 */
public final class PerspectiveSwitchAddon {

    /**
     * The ID of the perspective that was active before the current one. {@code null} if not known.
     */
    private static String previousPerspectiveId;

    @Inject
    private EModelService m_modelService;

    @Inject
    private MApplication m_app;

    @Inject
    @Optional
    public void listen(@EventTopic(UIEvents.ElementContainer.TOPIC_SELECTEDELEMENT) final Event event) {
        Object newValue = event.getProperty(EventTags.NEW_VALUE);
        if (!(newValue instanceof MPerspective)) {
            return;
        }

        MPerspective oldPerspective = (MPerspective)event.getProperty(EventTags.OLD_VALUE);
        MPerspective newPerspective = (MPerspective)newValue;
        MPerspective webUIPerspective = PerspectiveUtil.getWebUIPerspective(m_app, m_modelService);

        if (oldPerspective != null) {
            previousPerspectiveId = oldPerspective.getElementId();
        }

        if (newPerspective == webUIPerspective && oldPerspective == null) {
            // make sure the web ui perspective is initialized correctly if visible on start-up
            setTrimsAndMenuVisible(false, m_modelService, m_app);
        } else if (newPerspective == webUIPerspective) {
            onSwitchToWebUI();
        } else if (oldPerspective == webUIPerspective) {
            onSwitchToJavaUI();
        }
    }

    private void onSwitchToWebUI() {
        NodeTimer.GLOBAL_TIMER.incWebUIPerspectiveSwitch();
        NodeTimer.GLOBAL_TIMER.setLastUsedPerspective(KnimeUIPreferences.getSelectedNodeCollection());
        PerspectiveUtil.setClassicPerspectiveActive(false);
        OpenKnimeUrlAction.setEventHandlingActive(false);

        ClassicWorkflowEditorUtil.closeAllActiveEditors();

        setTrimsAndMenuVisible(false, m_modelService, m_app);

        KnimeBrowserView.activateViewInitializer(false);
        PerspectiveUtil.toggleClassicPerspectiveKeyBindings(false);
        switchToWebUITheme();
        CEFSystemProperties.setExternalMessagePump();
        LoadWorkflowRunnable.doPostLoadCheckForMetaNodeUpdates = false;
    }

    private void onSwitchToJavaUI() {
        NodeTimer.GLOBAL_TIMER.incJavaUIPerspectiveSwitch();
        NodeTimer.GLOBAL_TIMER.setLastUsedPerspective(GlobalNodeStats.CLASSIC_PERSPECTIVE_PLACEHOLDER);
        KnimeBrowserView.clearView();
        // this needs to happen before lifeCycle.suspend is called
        ProjectWorkflowMap.isActive = true;
        var lifeCycle = LifeCycle.get();
        if (lifeCycle.isNextStateTransition(StateTransition.SAVE_STATE)) {
            lifeCycle.saveState();
            lifeCycle.suspend();
        }

        // TODO: Is this still needed?
        setTrimsAndMenuVisible(true, m_modelService, m_app);

        PerspectiveUtil.toggleClassicPerspectiveKeyBindings(true);
        switchToJavaUITheme();
        PerspectiveUtil.setClassicPerspectiveActive(true);
        OpenKnimeUrlAction.setEventHandlingActive(true);

        // The color of the workflow editor canvas changes when switching back
        // -> this is a workaround to compensate for it
        // (couldn't be solved via css styling because the background color differs if the respective workflow
        // is write protected)
        ClassicWorkflowEditorUtil.getOpenWorkflowEditors(m_modelService, m_app)
            .forEach(WorkflowEditor::updateEditorBackgroundColor);

        // Keeps Classic UI in sync with the file system
        PerspectiveUtil.refreshLocalWorkspaceContentProvider();

        CEFSystemProperties.clearExternalMessagePump();

        LoadWorkflowRunnable.doPostLoadCheckForMetaNodeUpdates = true;
    }

    private void switchToWebUITheme() {
        switchTheme("org.knime.ui.java.theme");
    }

    private void switchToJavaUITheme() {
        switchTheme("org.knime.product.theme.knime");
    }

    private void switchTheme(final String themeId) {
        IEclipseContext context = m_app.getContext();
        IThemeEngine engine = context.get(IThemeEngine.class);
        ITheme webUITheme = engine.getThemes().stream().filter(t -> t.getId().equals(themeId)).findFirst().orElse(null);
        if (webUITheme == null) {
            NodeLogger.getLogger(PerspectiveSwitchAddon.class).error("The web ui css theme couldn't be found");
            return;
        }
        engine.setTheme(webUITheme, true);
    }

    static void setTrimsAndMenuVisible(final boolean visible, final EModelService modelService,
        final MApplication app) {
        modelService.find("org.eclipse.ui.trim.status", app).setVisible(visible);
        modelService.find("org.eclipse.ui.main.toolbar", app).setVisible(visible);
        if (!Boolean.getBoolean("org.knime.ui.dev.showMenu")) {
            MTrimmedWindow window = (MTrimmedWindow)app.getChildren().get(0);
            window.getMainMenu().setToBeRendered(visible);
        }
    }

    /**
     * @return The ID of the Eclipse workbench perspective that was active previous to the currently active one.
     */
    public static java.util.Optional<String> getPreviousPerspectiveId() {
        return java.util.Optional.ofNullable(previousPerspectiveId);
    }


}
