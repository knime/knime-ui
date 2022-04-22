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
package org.knime.ui.java;

import java.io.File;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

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
import org.knime.core.node.port.PortType;
import org.knime.core.node.port.PortTypeRegistry;
import org.knime.core.node.workflow.SubNodeContainer;
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
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppStateProvider.AppState;
import org.knime.gateway.impl.webui.AppStateProvider.AppState.OpenedWorkflow;
import org.knime.workbench.editor2.WorkflowEditor;

/**
 * Utility methods to deal with the state of the Eclipse UI.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 */
public final class EclipseUIStateUtil {

    /**
     * The part ID of a workflow editor in the Eclipse UI.
     */
    private static final String WORKFLOW_EDITOR_PART_ID = "org.eclipse.e4.ui.compatibility.editor";

    private EclipseUIStateUtil() {
        // utility class
    }

    /**
     * Describe the current application state based on the state of the Eclipse UI.
     *
     * @param modelService
     * @param app
     *
     * @return The state of the Eclipse UI in terms of {@link AppState}.
     */
    public static AppState createAppState(final EModelService modelService, final MApplication app) {
        return new AppState() {
            @Override
            public List<OpenedWorkflow> getOpenedWorkflows() {
                return collectOpenedWorkflows(modelService, app);
            }

            @Override
            public Set<PortType> getAvailablePortTypes() {
                return PortTypeRegistry.getInstance().availablePortTypes().stream()
                        .filter(pt -> !pt.isHidden())
                        .collect(Collectors.toSet());
            }

            @Override
            public List<PortType> getRecommendedPortTypes() {
                return CoreUtil.RECOMMENDED_PORT_TYPES;
            }
        };
    }

    private static Pair<WorkflowProject, OpenedWorkflow>
        createOpenedWorkflowAndWorkflowProject(final MPart editorPart) {
        var wfm = getWorkflowManager(editorPart);
        WorkflowManager projectWfm = wfm != null ? getProjectManager(wfm) : null;
        if (projectWfm != null) {
            WorkflowProject wp =
                WorkflowProjectManager.getInstance().getWorkflowProject(projectWfm.getNameWithID()).orElse(null);
            if (wp == null) {
                wp = createWorkflowProject(editorPart, projectWfm);
            }
            if (wp != null) {
                var ow = createOpenedWorkflow(wp.getID(),
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
        List<MPart> editorParts = modelService.findElements(app, WORKFLOW_EDITOR_PART_ID, MPart.class);
        Set<String> loadedProjectIds = new HashSet<>();
        return editorParts.stream().map(EclipseUIStateUtil::createOpenedWorkflowAndWorkflowProject)//
            .filter(Objects::nonNull)//
            // ('non-visible' projects are removed first)
            .sorted((p1, p2) -> Boolean.compare(p2.getSecond().isVisible(), p1.getSecond().isVisible()))//
            .filter(p ->
                // keep ids of loaded project and filter duplicates
                // ('non-visible' projects are removed first)
                loadedProjectIds.add(p.getFirst().getID())//
            ).map(p -> {
                WorkflowProject wp = p.getFirst();
                WorkflowProjectManager.getInstance().addWorkflowProject(wp.getID(), wp);
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
            return new WorkflowProject() {

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
        }
        return null;
    }

    private static WorkflowManager getProjectManager(final WorkflowManager wfm) {
        WorkflowManager project = wfm.getProjectWFM();
        if (project == WorkflowManager.ROOT) {
            project = wfm.getProjectComponent().map(SubNodeContainer::getWorkflowManager).orElse(null);
        }
        return project;
    }

    private static WorkflowManager getWorkflowManager(final MPart editorPart) {
        if (editorPart.getObject() instanceof CompatibilityPart) {
            return getWorkflowEditor((CompatibilityPart)editorPart.getObject())
                .flatMap(WorkflowEditor::getWorkflowManager).orElse(null);
        } else {
            return null;
        }
    }

    /**
     * Determines all opened workflow editors (in the classic KNIME perspective). Determines model service and
     * application model via the {@link Workbench}.
     *
     * @return list of all opened workflow editors
     */
    public static List<WorkflowEditor> getOpenWorkflowEditors() {
        var workbench = (Workbench)PlatformUI.getWorkbench();
        return getOpenWorkflowEditors(workbench.getService(EModelService.class), workbench.getApplication());
    }

    /**
     * Determines all opened workflow editors (in the classic KNIME perspective).
     *
     * @param modelService
     * @param app
     * @return list of all opened workflow editors
     */
    public static List<WorkflowEditor> getOpenWorkflowEditors(final EModelService modelService,
        final MApplication app) {
        return modelService.findElements(app, WORKFLOW_EDITOR_PART_ID, MPart.class).stream()
            .filter(p -> p.getObject() instanceof CompatibilityPart)
            .map(p -> getWorkflowEditor((CompatibilityPart)p.getObject()).orElse(null)).filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    /**
     * Obtain the {@link WorkflowEditor} for a given {@link WorkflowManager} by looking through
     * the currently open editors.
     * @param targetWfm The workflow manager to retrieve the editor for
     * @return An optional containing the workflow editor for the given target workflow manager, or an empty optional
     *  if no such editor could be unambiguously determined
     */
    public static Optional<WorkflowEditor> getEditorForManager(final WorkflowManager targetWfm) {
        var matchedEditors = getOpenWorkflowEditors().stream()
                .filter(wfEd -> wfEd.getWorkflowManager()
                        .map(e -> Objects.equals(e, targetWfm))
                        .orElse(false)
                )
                .collect(Collectors.toList());
        if (matchedEditors.size() == 1) {
            return Optional.of(matchedEditors.get(0));
        } else {
            return Optional.empty();
        }
    }

    private static java.util.Optional<WorkflowEditor> getWorkflowEditor(final CompatibilityPart part) {
        AtomicReference<WorkflowEditor> ref = new AtomicReference<>();
        Display.getDefault().syncExec(() -> {
            IEditorPart editor = ((IEditorReference)part.getReference()).getEditor(true);
            if (editor instanceof WorkflowEditor) {
                ref.set((WorkflowEditor)editor);
            }
        });
        return java.util.Optional.ofNullable(ref.get());
    }

    static WorkflowManager loadWorkflow(final File workflowDir) throws IOException, InvalidSettingsException,
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
