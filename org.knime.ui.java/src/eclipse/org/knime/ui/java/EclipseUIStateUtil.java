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
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IEditorPart;
import org.eclipse.ui.IEditorReference;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.internal.Workbench;
import org.eclipse.ui.internal.e4.compatibility.CompatibilityPart;
import org.knime.core.eclipseUtil.UpdateChecker.UpdateInfo;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.ExecutionMonitor;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.node.workflow.UnsupportedWorkflowVersionException;
import org.knime.core.node.workflow.WorkflowLoadHelper;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor.WorkflowLoadResult;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.util.LoadVersion;
import org.knime.core.util.LockFailedException;
import org.knime.core.util.Pair;
import org.knime.core.util.Version;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppStateProvider.AppState;
import org.knime.gateway.impl.webui.AppStateProvider.AppState.OpenedWorkflow;
import org.knime.gateway.impl.webui.UpdateStateProvider.UpdateState;
import org.knime.product.rcp.intro.UpdateDetector;
import org.knime.workbench.editor2.WorkflowEditor;

/**
 * Utility methods to deal with the state of the Eclipse UI.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 */
@SuppressWarnings("restriction") // Accessing Eclipse-internal APIs
public final class EclipseUIStateUtil {

    /**
     * The part ID of a workflow editor in the Eclipse UI.
     */
    private static final String WORKFLOW_EDITOR_PART_ID = "org.eclipse.e4.ui.compatibility.editor";

    private static final NodeLogger LOGGER = NodeLogger.getLogger(EclipseUIStateUtil.class);

    private EclipseUIStateUtil() {
        // utility class
    }

    /**
     * Checks for release and bugfix updates for the AP.
     *
     * @return The state of the AP in terms of {@link UpdateState}.
     */
    public static UpdateState createUpdateState() {
        List<UpdateInfo> newReleases = new ArrayList<>();
        List<String> bugfixes = new ArrayList<>();
        try {
            UpdateDetector.checkForNewRelease().forEach(info -> newReleases.add(info));
            UpdateDetector.checkForBugfixes().forEach(name -> bugfixes.add(name));
        } catch (IOException | URISyntaxException e) {
            LOGGER.error("Could not check for updates", e);
        }
        return new UpdateState() {
            @Override
            public List<UpdateInfo> getNewReleases() {
                return newReleases;
            }

            @Override
            public List<String> getBugfixes() {
                return bugfixes;
            }
        };
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
        // Collect data before instantiating the AppState, so its changes can be tracked
        var openedWorkflows = collectOpenedWorkflows(modelService, app);
        // Return new AppState instance
        return new AppState() { // NOSONAR
            @Override
            public List<OpenedWorkflow> getOpenedWorkflows() {
                return openedWorkflows;
            }
        };
    }

    private static Pair<WorkflowProject, OpenedWorkflow>
        createOpenedWorkflowAndWorkflowProject(final MPart editorPart) {
        var wfm = getWorkflowManager(editorPart);
        var projectWfm = wfm.flatMap(EclipseUIStateUtil::getProjectManager);
        return zipOptional(wfm, projectWfm) //
            .map(pair -> createOpenedWorkflowAndWorkflowProject(pair.getFirst(), pair.getSecond(), editorPart)) //
            .orElse(null);
    }

    private static Pair<WorkflowProject, OpenedWorkflow> createOpenedWorkflowAndWorkflowProject(
        final WorkflowManager childWfm, final WorkflowManager projWfm, final MPart editorPart) {
        WorkflowProject wp =
            WorkflowProjectManager.getInstance().getWorkflowProject(projWfm.getNameWithID()).orElse(null);
        if (wp == null) {
            wp = createWorkflowProject(editorPart, projWfm);
        }
        if (wp != null) {
            var ow = createOpenedWorkflow(wp.getID(),
                new NodeIDEnt(childWfm.getID(), projWfm.getProjectComponent().isPresent()).toString(),
                isEditorPartSelectedElement(editorPart));
            return Pair.create(wp, ow);
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
        var workflows = editorParts.stream().map(EclipseUIStateUtil::createOpenedWorkflowAndWorkflowProject) //
            .filter(Objects::nonNull);

        var resolved = resolveDuplicates(workflows,
            // Determine duplicates by project ID
            p -> p.getFirst().getID(),
            // Among duplicates, prefer picking one that is not visible
            group -> group.stream().min( //
                (p1, p2) -> Boolean.compare(!p1.getSecond().isVisible(), !p2.getSecond().isVisible()) //
            ).get() // NOSONAR: group is never empty (result of groupBy)
        );

        return resolved.map(p -> {
            WorkflowProject wp = p.getFirst();
            WorkflowProjectManager.getInstance().addWorkflowProject(wp.getID(), wp);
            return p.getSecond();
        }).collect(Collectors.toList());
    }

    /**
     * Given a stream of objects,
     * <ol>
     * <li>Determine duplicates based on the given function <code>keySelector</code></li>
     * <li>For each group of duplicates, pick one representative determined by <code>valueSelector</code></li>
     * </ol>
     *
     * @implNote This function preserves the ordering of the input data.
     * @param data The input data
     * @param keySelector The function to determine the key based on which equality is determined
     * @param valueSelector The function to pick a representative from a list of duplicates (never empty)
     * @param <V> The value type of the input list
     * @param <K> The type of the key to group by
     * @return A list with duplicates resolved as described above.
     */
    private static <V, K> Stream<V> resolveDuplicates(final Stream<V> data, final Function<V, K> keySelector,
        final Function<List<V>, V> valueSelector) {
        LinkedHashMap<K, List<V>> groups =
            data.collect(Collectors.groupingBy(keySelector, LinkedHashMap::new, Collectors.toList()));
        return groups.values().stream().map(valueSelector);
    }

    private static boolean isEditorPartSelectedElement(final MPart editorPart) {
        return editorPart.getParent().getSelectedElement() == editorPart;
    }

    /**
     * Make the given editor part the selected element in its hierarchy
     *
     * @param editorPart The editor part to make active
     */
    public static void setEditorPartActive(final MPart editorPart) {
        editorPart.getParent().setSelectedElement(editorPart);
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

    private static Optional<WorkflowManager> getProjectManager(final WorkflowManager wfm) {
        WorkflowManager project = wfm.getProjectWFM();
        if (project == WorkflowManager.ROOT) {
            return wfm.getProjectComponent().map(SubNodeContainer::getWorkflowManager);
        }
        return Optional.ofNullable(project);
    }

    private static Optional<WorkflowManager> getWorkflowManager(final MPart editorPart) {
        return Optional.of(editorPart).filter(p -> p.getObject() instanceof CompatibilityPart)
            .flatMap(p -> getWorkflowEditor((CompatibilityPart)p.getObject()))
            .flatMap(WorkflowEditor::getWorkflowManager);
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
     * Determine all workflow editors that are currently part of the application model.
     *
     * @param modelService
     * @param app
     * @return list of all opened workflow editors
     */
    public static List<WorkflowEditor> getOpenWorkflowEditors(final EModelService modelService,
        final MApplication app) {
        return getOpenWorkflowEditorParts(modelService, app) //
            .map(p -> getWorkflowEditor((CompatibilityPart)p.getObject())) //
            .flatMap(Optional::stream) //
            .collect(Collectors.toList());
    }

    /**
     * Obtain the {@link WorkflowEditor} for a given {@link WorkflowManager} by looking through the currently open
     * editors.
     *
     * @param targetWfm The workflow manager to retrieve the editor for
     * @return An {@code Optional} containing the workflow editor for the given target workflow manager, or an empty
     *         optional if no such editor could be unambiguously determined
     */
    public static Optional<WorkflowEditor> getOpenWorkflowEditor(final WorkflowManager targetWfm) {
        var matchedEditors = getOpenWorkflowEditors().stream() //
            .filter(wfEd -> wfEd.getWorkflowManager() //
                .map(e -> Objects.equals(e, targetWfm)) //
                .orElse(false) //
            );
        return expectSingleOf(matchedEditors);
    }

    private static Optional<WorkflowEditor> getWorkflowEditor(final CompatibilityPart part) {
        AtomicReference<WorkflowEditor> ref = new AtomicReference<>();
        Display.getDefault().syncExec(() -> {
            IEditorPart editor = ((IEditorReference)part.getReference()).getEditor(true);
            if (editor instanceof WorkflowEditor) {
                ref.set((WorkflowEditor)editor);
            }
        });
        return java.util.Optional.ofNullable(ref.get());
    }

    /**
     * Determine all workflow editor parts that are currently part of the application model.
     *
     * @param modelService
     * @param app
     * @return
     */
    private static Stream<MPart> getOpenWorkflowEditorParts(final EModelService modelService, final MApplication app) {
        return modelService.findElements(app, WORKFLOW_EDITOR_PART_ID, MPart.class).stream()
            .filter(p -> p.getObject() instanceof CompatibilityPart);
    }

    /**
     * Obtain the workflow editor {@code MPart} for a given {@link WorkflowManager} by looking through the currently
     * open editors.
     *
     * @param targetWfm The workflow manager to retrieve the editor part for
     * @return An {@code Optional} containing the workflow editor part for the given target workflow manager, or an
     *         empty {@code Optional} if no such editor could be unambiguously determined.
     */
    public static Optional<MPart> getOpenWorkflowEditorPart(final WorkflowManager targetWfm) {
        var workbench = (Workbench)PlatformUI.getWorkbench();
        var matchedParts =
            getOpenWorkflowEditorParts(workbench.getService(EModelService.class), workbench.getApplication())
                .filter(p -> getWorkflowManager(p) //
                    .filter(edWfm -> Objects.equals(edWfm, targetWfm)) //
                    .isPresent() //
                );
        return expectSingleOf(matchedParts);
    }

    static WorkflowManager loadTempWorkflow(final File wfDir) throws IOException, InvalidSettingsException,
        CanceledExecutionException, UnsupportedWorkflowVersionException, LockFailedException {
        WorkflowLoadHelper loadHelper =
            new WorkflowLoadHelper(WorkflowContextV2.forTemporaryWorkflow(wfDir.toPath(), null)) {
                @Override
                public UnknownKNIMEVersionLoadPolicy getUnknownKNIMEVersionLoadPolicy(
                    final LoadVersion workflowKNIMEVersion, final Version createdByKNIMEVersion,
                    final boolean isNightlyBuild) {
                    return UnknownKNIMEVersionLoadPolicy.Try;
                }
            };

        WorkflowLoadResult loadRes = WorkflowManager.loadProject(wfDir, new ExecutionMonitor(), loadHelper);
        return loadRes.getWorkflowManager();
    }

    /**
     * Extract the single element of a stream if it contains only one, otherwise return an empty {@code Optional}.
     *
     * @param data A stream of values
     * @param <V> The value type
     * @return An {@code Optional} containing the single value if the stream contained just one element, an empty
     *         {@code Optional} otherwise.
     */
    private static <V> Optional<V> expectSingleOf(final Stream<V> data) {
        var els = data.collect(Collectors.toList());
        if (els.size() == 1) {
            return Optional.of(els.get(0));
        } else {
            return Optional.empty();
        }
    }

    /**
     * Zip two {@code Optional}s.
     *
     * @param left
     * @param right
     * @param <V> The value type
     * @return An {@code Optional} containing the pair of the two values if both are present, or an empty
     *         {@code Optional} otherwise.
     */
    @SuppressWarnings("java:S3553")
    private static <V> Optional<Pair<V, V>> zipOptional(final Optional<V> left, final Optional<V> right) {
        if (left.isEmpty() || right.isEmpty()) {
            return Optional.empty();
        } else {
            return Optional.of(Pair.create(left.get(), right.get()));
        }
    }
}
