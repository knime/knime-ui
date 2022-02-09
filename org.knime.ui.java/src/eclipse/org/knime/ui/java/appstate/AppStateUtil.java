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
 *   Jan 7, 2021 (hornm): created
 */
package org.knime.ui.java.appstate;

import java.io.File;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

import org.eclipse.core.resources.ResourcesPlugin;
import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IEditorPart;
import org.eclipse.ui.IEditorReference;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.internal.Workbench;
import org.eclipse.ui.internal.e4.compatibility.CompatibilityPart;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.ExecutionMonitor;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.UnsupportedWorkflowVersionException;
import org.knime.core.node.workflow.WorkflowContext;
import org.knime.core.node.workflow.WorkflowLoadHelper;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor.WorkflowLoadResult;
import org.knime.core.util.LoadVersion;
import org.knime.core.util.LockFailedException;
import org.knime.core.util.Pair;
import org.knime.core.util.Version;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.api.util.CoreUtil;
import org.knime.gateway.api.webui.service.ApplicationService;
import org.knime.gateway.api.webui.service.WorkflowService;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppState;
import org.knime.gateway.impl.webui.AppState.OpenedWorkflow;
import org.knime.gateway.impl.webui.service.DefaultApplicationService;
import org.knime.gateway.impl.webui.service.DefaultEventService;
import org.knime.workbench.editor2.WorkflowEditor;

/**
 * Provides utility methods to deal with the application's state (see also
 * {@link DefaultApplicationService} and {@link AppState}).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class AppStateUtil {

	private static final NodeLogger LOGGER = NodeLogger.getLogger(AppStateUtil.class);

	private static final Set<String> LOADED_PROJECT_IDS = new HashSet<>();

	private static Set<String> loadedWorkflowsForTesting;

	private AppStateUtil() {
		// utility class
	}

	/**
	 * Makes the application state available to the
	 * {@link DefaultApplicationService}-implementation. The app state is
	 * created on demand whenever requested by the application service. The app
	 * state is derived from the opened workflow editors (using the eclipse
	 * application model to retrieve those).
	 *
	 * @param modelService required to retrieve the opened workflow editors
	 * @param app required to retrieve the opened workflow editors
	 */
	public static void initAppState(final EModelService modelService, final MApplication app) {
		clearAppState();
		DefaultApplicationService appService = DefaultApplicationService.getInstance();
		appService.setAppStateSupplier(() -> createAppState(collectOpenedWorkflows(modelService, app)));
	}

	/**
	 * Once called, the {@link DefaultApplicationService} won't have access to
	 * an app state anymore. It also clears references to workflow projects.
	 */
	public static void clearAppState() {
		DefaultApplicationService.getInstance().clearAppStateSupplier();
		DefaultEventService.getInstance().removeAllEventListeners();
		disposeAllLoadedWorkflowProjects();
	}

	private static void disposeAllLoadedWorkflowProjects() {
		if (loadedWorkflowsForTesting != null) {
			for (String id : loadedWorkflowsForTesting) {
				WorkflowManager wfm = WorkflowProjectManager.openAndCacheWorkflow(id).orElse(null);
				try {
					CoreUtil.cancelAndCloseLoadedWorkflow(wfm);
				} catch (InterruptedException ex) { // NOSONAR should never happen
					throw new IllegalStateException(ex);
				}
			}
			loadedWorkflowsForTesting.clear();
		}

		for (String id : LOADED_PROJECT_IDS) {
			WorkflowProjectManager.removeWorkflowProject(id);
		}
		LOADED_PROJECT_IDS.clear();
	}

	private static AppState createAppState(final List<OpenedWorkflow> openedWorkflows) {
		return () -> openedWorkflows;
	}

	private static Pair<WorkflowProject, OpenedWorkflow> createOpenedWorkflowAndWorkflowProject(
			final MPart editorPart) {
		WorkflowManager wfm = getWorkflowManager(editorPart);
		WorkflowManager projectWfm = wfm != null ? getProjectManager(wfm) : null;
		if (projectWfm != null) {
			WorkflowProject wp = WorkflowProjectManager.getWorkflowProject(projectWfm.getNameWithID()).orElse(null);
			if (wp == null) {
				wp = createWorkflowProject(editorPart, projectWfm);
			}
			if (wp != null) {
				OpenedWorkflow ow = createOpenedWorkflow(wp.getID(),
						new NodeIDEnt(wfm.getID(), projectWfm.getProjectComponent().isPresent()).toString(),
						isSelectedEditor(editorPart));
				return Pair.create(wp, ow);
			}
		}
		return null;
	}

	private static OpenedWorkflow createOpenedWorkflow(final String projectId, final String wfId,
			final boolean isVisible) {
		return new OpenedWorkflow() {

			@Override
			public String getWorkflowId() {
				return wfId;
			}

			@Override
			public String getProjectId() {
				return projectId;
			}

			@Override
			public boolean isVisible() {
				return isVisible;
			}
		};
	}

	private static List<OpenedWorkflow> collectOpenedWorkflows(final EModelService modelService,
			final MApplication app) {
		List<MPart> editorParts = modelService.findElements(app, "org.eclipse.e4.ui.compatibility.editor", MPart.class);

		return editorParts.stream().map(AppStateUtil::createOpenedWorkflowAndWorkflowProject)//
				.filter(Objects::nonNull)//
				.sorted((p1, p2) -> Boolean.compare(p2.getSecond().isVisible(), p1.getSecond().isVisible()))//
				.filter(p -> {
					// keep ids of loaded project and filters duplicates
					// ('non-visible' projects are removed first)
					return LOADED_PROJECT_IDS.add(p.getFirst().getID());
				}).map(p -> {
					WorkflowProject wp = p.getFirst();
					WorkflowProjectManager.addWorkflowProject(wp.getID(), wp);
					return p.getSecond();
				})//
				.collect(Collectors.toList());
	}

	private static boolean isSelectedEditor(final MPart editorPart) {
		return editorPart.getParent().getSelectedElement() == editorPart;
	}

	private static WorkflowProject createWorkflowProject(final MPart editorPart, final WorkflowManager wfm) {
		if (editorPart.getObject() instanceof CompatibilityPart) {
			// Editors with no workflow loaded (i.e. opened tabs after
			// the KNIME start which haven't been touched, yet) are ignored atm
			WorkflowProject wp = new WorkflowProject() {

				@Override
				public String getName() {
					return wfm.getName();
				}

				@Override
				public String getID() {
					return wfm.getNameWithID();
				}

				@Override
				public WorkflowManager openProject() {
					return wfm;
				}

			};
			return wp;
		}
		return null;
	}

	private static WorkflowManager getProjectManager(final WorkflowManager wfm) {
		WorkflowManager project = wfm.getProjectWFM();
		if (project == WorkflowManager.ROOT) {
			project = wfm.getProjectComponent().map(snc -> snc.getWorkflowManager()).orElse(null);
		}
		return project;
	}

	private static WorkflowManager getWorkflowManager(final MPart editorPart) {
		if (editorPart.getObject() instanceof CompatibilityPart) {
			return getWorkflowEditor((CompatibilityPart) editorPart.getObject())
					.flatMap(WorkflowEditor::getWorkflowManager).orElse(null);
		} else {
			return null;
		}
	}

	/**
	 * Determines all opened workflow editors (in the classic KNIME
	 * perspective). Determines model service and application model
	 * via the {@link Workbench}.
	 *
	 * @return list of all opened workflow editors
	 */
	public static List<WorkflowEditor> getOpenWorkflowEditors() {
		var workbench = (Workbench)PlatformUI.getWorkbench();
		return getOpenWorkflowEditors(
				workbench.getService(EModelService.class),
				workbench.getApplication()
		);
	}

	/**
	 * Determines all opened workflow editors (in the classic KNIME
	 * perspective).
	 *
	 * @param modelService
	 * @param app
	 * @return list of all opened workflow editors
	 */
	public static List<WorkflowEditor> getOpenWorkflowEditors(final EModelService modelService,
			final MApplication app) {
		return modelService.findElements(app, "org.eclipse.e4.ui.compatibility.editor", MPart.class).stream()
				.filter(p -> p.getObject() instanceof CompatibilityPart)
				.map(p -> getWorkflowEditor((CompatibilityPart) p.getObject()).orElse(null)).filter(Objects::nonNull)
				.collect(Collectors.toList());
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

	/**
	 * Makes the passed app state available to the
	 * {@link DefaultApplicationService} implementation and registers the
	 * referenced workflows such that they are available to the service
	 * implementations.
	 *
	 * It assumes that referenced workflows are available at the workspace's
	 * root level with the name matching the project id
	 * ({@link OpenedWorkflow#getProjectId()}).
	 *
	 * Once a workflow for a certain project-id is requested (e.g. via the
	 * {@link ApplicationService} or {@link WorkflowService}), the workflow is
	 * loaded into memory from the workspace location.
	 *
	 * @param appState the app state to use
	 */
	public static void initAppStateForTesting(final AppState appState) {
		clearAppState();
		DefaultApplicationService appService = DefaultApplicationService.getInstance();
		appService.clearAppStateSupplier();
		appState.getOpenedWorkflows().forEach(AppStateUtil::addToProjectManagerForTesting);
		appService.setAppStateSupplier(() -> appState);
	}

	private static void addToProjectManagerForTesting(final OpenedWorkflow workflow) {
		LOADED_PROJECT_IDS.add(workflow.getProjectId());
		WorkflowProjectManager.addWorkflowProject(workflow.getProjectId(), new WorkflowProject() {

			@Override
			public WorkflowManager openProject() {
				return loadWorkflowForTesting(workflow);
			}

			@Override
			public String getName() {
				return workflow.getProjectId();
			}

			@Override
			public String getID() {
				return workflow.getProjectId();
			}
		});
	}

	private static WorkflowManager loadWorkflowForTesting(final OpenedWorkflow workflow) {
		var file = new File(ResourcesPlugin.getWorkspace().getRoot().getLocation().toFile(), workflow.getProjectId());
		try {
			WorkflowManager wfm = loadWorkflow(file);
			if (loadedWorkflowsForTesting == null) {
				loadedWorkflowsForTesting = new HashSet<>();
			}
			loadedWorkflowsForTesting.add(workflow.getProjectId());
			return wfm;
		} catch (IOException | InvalidSettingsException | CanceledExecutionException
				| UnsupportedWorkflowVersionException | LockFailedException ex) {
			LOGGER.error("Workflow at '" + file + "' couldn't be loaded", ex);
			return null;
		}
	}

    private static WorkflowManager loadWorkflow(final File workflowDir) throws IOException, InvalidSettingsException,
        CanceledExecutionException, UnsupportedWorkflowVersionException, LockFailedException {
        WorkflowLoadHelper loadHelper = new WorkflowLoadHelper() {
            @Override
            public WorkflowContext getWorkflowContext() {
                var fac = new WorkflowContext.Factory(workflowDir);
                return fac.createContext();
            }

            @Override
            public UnknownKNIMEVersionLoadPolicy getUnknownKNIMEVersionLoadPolicy(
                final LoadVersion workflowKNIMEVersion, final Version createdByKNIMEVersion,
                final boolean isNightlyBuild) {
                return UnknownKNIMEVersionLoadPolicy.Try;
            }
        };

        WorkflowLoadResult loadRes = WorkflowManager.loadProject(workflowDir, new ExecutionMonitor(), loadHelper);
        return loadRes.getWorkflowManager();
    }

}
