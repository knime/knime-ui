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

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import javax.inject.Inject;

import org.eclipse.e4.core.contexts.IEclipseContext;
import org.eclipse.e4.core.di.annotations.Optional;
import org.eclipse.e4.core.di.extensions.EventTopic;
import org.eclipse.e4.ui.css.swt.theme.ITheme;
import org.eclipse.e4.ui.css.swt.theme.IThemeEngine;
import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.advanced.MPerspective;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.e4.ui.model.application.ui.basic.MTrimmedWindow;
import org.eclipse.e4.ui.workbench.UIEvents;
import org.eclipse.e4.ui.workbench.UIEvents.EventTags;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IEditorPart;
import org.eclipse.ui.IEditorReference;
import org.eclipse.ui.internal.e4.compatibility.CompatibilityPart;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeContainer;
import org.knime.core.node.workflow.NodeID;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.util.Pair;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppState;
import org.knime.gateway.impl.webui.service.DefaultApplicationService;
import org.knime.gateway.impl.webui.service.DefaultEventService;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.workbench.editor2.WorkflowEditor;
import org.osgi.service.event.Event;

/**
 * Registered as fragemnt with the application model. Listens to perspective
 * switch events in order to remove/add stuff (e.g. toolbars, trims etc.).
 *
 * Done via listener in order to add/remove that stuff no matter how the
 * perspective is changed (e.g. via toolbar action, perspective switch shortcut,
 * etc.).
 *
 * <br/><br/>
 * For a quick intro to the e4 application model please read 'E4_Application_Model.md'.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class PerspectiveSwitchAddon {

	private static final NodeLogger LOGGER = NodeLogger.getLogger(PerspectiveSwitchAddon.class);

	private static Supplier<AppState> appStateSupplier;

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

		MPerspective oldPerspective = (MPerspective) event.getProperty(EventTags.OLD_VALUE);
		MPerspective newPerspective = (MPerspective) newValue;
		MPerspective webUIPerspective = SwitchToWebUIHandler.getWebUIPerspective(m_app, m_modelService);

		if (newPerspective == webUIPerspective) {
			switchToWebUI();
		} else if (oldPerspective == webUIPerspective) {
			switchToJavaUI();
		} else {
			//
		}
	}

	private void switchToWebUI() {
		registerAppStateSupplier(m_modelService, m_app);
		setTrimsAndMenuVisible(false, m_modelService, m_app);
		callOnKnimeBrowserView(KnimeBrowserView::setUrl);
		switchToWebUITheme();
	}

	private void switchToJavaUI() {
		DefaultEventService.getInstance().removeAllEventListeners();
		callOnKnimeBrowserView(KnimeBrowserView::clearUrl);
		setTrimsAndMenuVisible(true, m_modelService, m_app);
		switchToJavaUITheme();
		// the color of the workflow editor canvas changes when switching back
		// -> this is a workaround to compensate for it
		// (couldn't be solved via css styling because the background color differs if the respective workflow
		// is write protected)
		getOpenWorkflowEditors(m_modelService, m_app).forEach(WorkflowEditor::updateEditorBackgroundColor);
	}

	private void callOnKnimeBrowserView(final Consumer<KnimeBrowserView> call) {
		List<MPart> views = m_modelService.findElements(m_app, "org.knime.ui.java.browser.view", MPart.class);
		for (MPart view : views) {
			if (view.getObject() instanceof KnimeBrowserView) {
				call.accept((KnimeBrowserView) view.getObject());
			} else {
				LOGGER.warn("Element found for 'org.knime.ui.java.browser.view'"
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

	static void setTrimsAndMenuVisible(final boolean visible, final EModelService modelService, final MApplication app) {
		modelService.find("org.eclipse.ui.trim.status", app).setVisible(visible);
		modelService.find("org.eclipse.ui.main.toolbar", app).setVisible(visible);
		MTrimmedWindow window = (MTrimmedWindow) app.getChildren().get(0);
		window.getMainMenu().setToBeRendered(visible);
	}

	private static void registerAppStateSupplier(final EModelService modelService, final MApplication app) {
		if (appStateSupplier == null) {
			appStateSupplier = () -> getAppState(modelService, app);
			DefaultApplicationService.getInstance().setAppStateSupplier(appStateSupplier);
		}
	}

	private static AppState getAppState(final EModelService modelService, final MApplication app) {
		Set<String> workflowProjectIds = new HashSet<>();
		Set<Pair<String, NodeID>> activeWorkflowIds = new HashSet<>();
		collectOpenWorkflows(workflowProjectIds, activeWorkflowIds, modelService, app);
		return new AppState() {

			@Override
			public Set<String> getLoadedWorkflowProjectIds() {
				return workflowProjectIds;
			}

			@Override
			public Set<Pair<String, NodeID>> getActiveWorkflowIds() {
				return activeWorkflowIds;
			}

		};
	}

	private static void collectOpenWorkflows(final Set<String> workflowProjectIds,
			final Set<Pair<String, NodeID>> activeWorkflowIds, final EModelService modelService,
			final MApplication app) {
		List<MPart> editorParts = modelService.findElements(app, "org.eclipse.e4.ui.compatibility.editor", MPart.class);
		for (MPart editorPart : editorParts) {
			WorkflowManager wfm = getWorkflowManager(editorPart);
			if (wfm != null) {
				WorkflowProject wp = WorkflowProjectManager.getWorkflowProject(getProjectId(wfm)).orElse(null);
				if (wp == null) {
					wp = createWorkflowProject(editorPart, wfm);
				}
				if (wp != null) {
					workflowProjectIds.add(wp.getID());
				}

				if (isSelectedEditor(editorPart) && wfm != null) {
					activeWorkflowIds.add(Pair.create(getProjectId(wfm), wfm.getID()));
				}
			}
		}
	}

	private static boolean isSelectedEditor(final MPart editorPart) {
		return editorPart.getParent().getSelectedElement() == editorPart;
	}

	private static WorkflowProject createWorkflowProject(final MPart editorPart, final WorkflowManager wfm) {
		if (editorPart.getObject() instanceof CompatibilityPart) {
			// TODO editors with no workflow loaded (i.e. opened tabs after
			// the KNIME start which haven't been touched, yet) are ignored
			// atm
			WorkflowProject wp = new WorkflowProject() {

				@Override
				public String getName() {
					return wfm.getName();
				}

				@Override
				public String getID() {
					return getProjectId(wfm);
				}

				@Override
				public WorkflowManager openProject() {
					return wfm;
				}

			};
			WorkflowProjectManager.addWorkflowProject(wp.getID(), wp);
			return wp;
		}
		return null;
	}

	private static String getProjectId(final WorkflowManager wfm) {
		NodeContainer project = wfm.getProjectWFM();
		if(project == WorkflowManager.ROOT) {
			project = wfm.getProjectComponent().orElse(null);
		}
		return project != null ? project.getNameWithID() : null;
	}

	private static WorkflowManager getWorkflowManager(final MPart editorPart) {
		if (editorPart.getObject() instanceof CompatibilityPart) {
			return getWorkflowEditor((CompatibilityPart) editorPart.getObject())
					.flatMap(WorkflowEditor::getWorkflowManager).orElse(null);
		} else {
			return null;
		}
	}

	private static java.util.Optional<WorkflowEditor> getWorkflowEditor(final CompatibilityPart part) {
		AtomicReference<WorkflowEditor> ref = new AtomicReference<>();
		Display.getDefault().syncExec(() -> {
			IEditorPart editor = ((IEditorReference) part.getReference()).getEditor(true);
			if (editor instanceof WorkflowEditor) {
				ref.set((WorkflowEditor) editor);
			}
		});
		return java.util.Optional.ofNullable(ref.get());
	}

	private static List<WorkflowEditor> getOpenWorkflowEditors(final EModelService modelService,
			final MApplication app) {
		return modelService.findElements(app, "org.eclipse.e4.ui.compatibility.editor", MPart.class).stream()
				.filter(p -> p.getObject() instanceof CompatibilityPart)
				.map(p -> getWorkflowEditor((CompatibilityPart) p.getObject()).orElse(null)).filter(Objects::nonNull)
				.collect(Collectors.toList());
	}

}
