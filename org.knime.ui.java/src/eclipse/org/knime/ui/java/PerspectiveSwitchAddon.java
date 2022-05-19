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

import static org.eclipse.ui.internal.IWorkbenchConstants.PERSPECTIVE_STACK_ID;
import static org.knime.ui.java.PerspectiveUtil.BROWSER_VIEW_PART_ID;

import java.util.List;
import java.util.function.Consumer;
import java.util.function.Supplier;

import javax.inject.Inject;

import org.eclipse.e4.core.contexts.IEclipseContext;
import org.eclipse.e4.core.di.annotations.Optional;
import org.eclipse.e4.core.di.extensions.EventTopic;
import org.eclipse.e4.ui.css.swt.theme.ITheme;
import org.eclipse.e4.ui.css.swt.theme.IThemeEngine;
import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.advanced.MPerspective;
import org.eclipse.e4.ui.model.application.ui.advanced.MPerspectiveStack;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.e4.ui.model.application.ui.basic.MTrimmedWindow;
import org.eclipse.e4.ui.workbench.UIEvents;
import org.eclipse.e4.ui.workbench.UIEvents.EventTags;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.workbench.editor2.WorkflowEditor;
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
 */
public final class PerspectiveSwitchAddon {

    private static final String PROP_CHROMIUM_EXTERNAL_MESSAGE_PUMP = "chromium.external_message_pump";

    private static final NodeLogger LOGGER = NodeLogger.getLogger(PerspectiveSwitchAddon.class);

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

        previousPerspectiveId = oldPerspective.getElementId();

        if (newPerspective == webUIPerspective) {
            onSwitchToWebUI();
        } else if (oldPerspective == webUIPerspective) {
            onSwitchToJavaUI();
        }
    }

    /**
     * On reset of the Web UI perspective, re-add dynamically added elements.
     *
     * @see PerspectiveSwitchAddon#addSharedEditorAreaToWebUIPerspective()
     * @param event ignored
     */
    @Inject
    @org.eclipse.e4.core.di.annotations.Optional
    public void listenResetPerspective(@EventTopic(UIEvents.UILifeCycle.PERSPECTIVE_RESET) final Event event) {
        MPerspectiveStack perspectiveStack = (MPerspectiveStack)m_modelService.find(PERSPECTIVE_STACK_ID, m_app);
        var activePerspective = perspectiveStack.getSelectedElement();
        var webUIPerspective = PerspectiveUtil.getWebUIPerspective(m_app, m_modelService);
        if (activePerspective == webUIPerspective) {
            PerspectiveUtil.addSharedEditorAreaToWebUIPerspective(m_modelService, m_app);
        }
    }

    private void onSwitchToWebUI() {
        NodeTimer.GLOBAL_TIMER.incWebUIPerspectiveSwitch();
        PerspectiveUtil.addSharedEditorAreaToWebUIPerspective(m_modelService, m_app);
        setTrimsAndMenuVisible(false, m_modelService, m_app);
        Supplier<AppStateProvider.AppState> supplier = () -> EclipseUIStateUtil.createAppState(m_modelService, m_app);
        KnimeBrowserView.addActivatedCallback(v -> {
            var eventConsumer = v.createEventConsumer();
            var appStateProvider = new AppStateProvider(supplier);
            DefaultServicesUtil.setDefaultServiceDependencies(appStateProvider, eventConsumer);
            v.initBrowserFunctions(appStateProvider);
        });
        KnimeBrowserView.addActivatedCallback(KnimeBrowserView::setUrl);
        switchToWebUITheme();
        // fixes a drag'n'drop issue on windows; doesn't have an effect on linux or mac
        // (see NXTEXT-137)
        System.setProperty(PROP_CHROMIUM_EXTERNAL_MESSAGE_PUMP, "false");
    }

    private void onSwitchToJavaUI() {
        callOnKnimeBrowserView(KnimeBrowserView::clearUrl);
        DefaultServicesUtil.disposeDefaultServices();
        setTrimsAndMenuVisible(true, m_modelService, m_app);
        switchToJavaUITheme();
        // the color of the workflow editor canvas changes when switching back
        // -> this is a workaround to compensate for it
        // (couldn't be solved via css styling because the background color differs if the respective workflow
        // is write protected)
        EclipseUIStateUtil.getOpenWorkflowEditors(m_modelService, m_app)
            .forEach(WorkflowEditor::updateEditorBackgroundColor);
        System.clearProperty(PROP_CHROMIUM_EXTERNAL_MESSAGE_PUMP);
    }

    private void callOnKnimeBrowserView(final Consumer<KnimeBrowserView> call) {
        List<MPart> views = m_modelService.findElements(m_app, BROWSER_VIEW_PART_ID, MPart.class);
        for (MPart view : views) {
            if (view.getObject() instanceof KnimeBrowserView) {
                call.accept((KnimeBrowserView)view.getObject());
            } else {
                LOGGER.warn("Element found for '" + BROWSER_VIEW_PART_ID + "'"
                    + " which is not the expected KNIME browser view.");
            }
        }
        if (views.size() > 1) {
            LOGGER.warn(views.size()
                + " web-ui views have been found while switching the perspective, but only one is expected!");

        }
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
            LOGGER.error("The web ui css theme couldn't be found");
            return;
        }
        engine.setTheme(webUITheme, true);
    }

    static void setTrimsAndMenuVisible(final boolean visible, final EModelService modelService,
        final MApplication app) {
        modelService.find("org.eclipse.ui.trim.status", app).setVisible(visible);
        modelService.find("org.eclipse.ui.main.toolbar", app).setVisible(visible);
        MTrimmedWindow window = (MTrimmedWindow)app.getChildren().get(0);
        window.getMainMenu().setToBeRendered(visible);
    }

    /**
     * @return The ID of the Eclipse workbench perspective that was active previous to the currently active one.
     */
    public static java.util.Optional<String> getPreviousPerspectiveId() {
        return java.util.Optional.ofNullable(previousPerspectiveId);
    }
}
