
package org.knime.ui.java;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import javax.inject.Inject;

import org.eclipse.e4.core.di.annotations.Optional;
import org.eclipse.e4.core.di.extensions.EventTopic;
import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.advanced.MPerspective;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.e4.ui.model.application.ui.basic.MTrimmedWindow;
import org.eclipse.e4.ui.workbench.UIEvents;
import org.eclipse.e4.ui.workbench.UIEvents.EventTags;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IEditorReference;
import org.eclipse.ui.internal.e4.compatibility.CompatibilityPart;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeID;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.util.Pair;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppState;
import org.knime.gateway.impl.webui.service.DefaultApplicationService;
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
			updateAppState(m_modelService, m_app);
			setTrimsAndMenuVisible(false, m_modelService, m_app);
			callOnKnimeBrowserView(KnimeBrowserView::setUrl);
		} else if (oldPerspective == webUIPerspective) {
			setTrimsAndMenuVisible(true, m_modelService, m_app);
			callOnKnimeBrowserView(KnimeBrowserView::clearUrl);
		} else {
			//
		}
	}

	private void callOnKnimeBrowserView(final Consumer<KnimeBrowserView> call) {
		List<MPart> views = m_modelService.findElements(m_app, "org.knime.ui.java.browser.view", MPart.class);
		for (MPart view : views) {
			if (view.getObject() instanceof KnimeBrowserView) {
				call.accept((KnimeBrowserView) view.getObject());
			} else {
				NodeLogger.getLogger(this.getClass()).warn("Element found for 'org.knime.ui.java.browser.view'"
						+ " which is not the expected KNIME browser view.");
			}
		}
		if (views.size() > 1) {
			NodeLogger.getLogger(this.getClass()).warn(views.size()
					+ " web-ui views have been found while switching the perspective, but only one is expected!");

		}
	}

	static void setTrimsAndMenuVisible(final boolean visible, final EModelService modelService, final MApplication app) {
		modelService.find("org.eclipse.ui.trim.status", app).setVisible(visible);
		modelService.find("org.eclipse.ui.main.toolbar", app).setVisible(visible);
		MTrimmedWindow window = (MTrimmedWindow) app.getChildren().get(0);
		window.getMainMenu().setToBeRendered(visible);
	}

	private static void updateAppState(final EModelService modelService, final MApplication app) {
		Set<String> workflowProjectIds = new HashSet<>();
		Set<Pair<String, NodeID>> activeWorkflowIds = new HashSet<>();
		collectOpenWorkflows(workflowProjectIds, activeWorkflowIds, modelService, app);

		DefaultApplicationService.getInstance().updateAppState(new AppState() {

			@Override
			public Set<String> getLoadedWorkflowProjectIds() {
				return workflowProjectIds;
			}

			@Override
			public Set<Pair<String, NodeID>> getActiveWorkflowIds() {
				return activeWorkflowIds;
			}

		});
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
		return wfm.getProjectWFM().getNameWithID();
	}

	private static WorkflowManager getWorkflowManager(final MPart editorPart) {
		if (editorPart.getObject() instanceof CompatibilityPart) {
			final IEditorReference ref = (IEditorReference) ((CompatibilityPart) editorPart.getObject()).getReference();
			final AtomicReference<WorkflowManager> wfm = new AtomicReference<>();
			Display.getDefault()
					.syncExec(() -> wfm.set(((WorkflowEditor) ref.getEditor(true)).getWorkflowManager().orElse(null)));
			return wfm.get() == null ? null : wfm.get();
		} else {
			return null;
		}
	}

}
