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
package org.knime.ui.java.util;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;
import java.util.stream.Stream;

import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IEditorReference;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchPage;
import org.eclipse.ui.IWorkbenchWindow;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.internal.Workbench;
import org.eclipse.ui.internal.e4.compatibility.CompatibilityPart;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.ExecutionMonitor;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.workflow.UnsupportedWorkflowVersionException;
import org.knime.core.node.workflow.WorkflowLoadHelper;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor.WorkflowLoadResult;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.util.LoadVersion;
import org.knime.core.util.LockFailedException;
import org.knime.core.util.Version;
import org.knime.ui.java.api.SaveAndCloseProjects;
import org.knime.workbench.editor2.WorkflowEditor;

/**
 * Utility methods around the classic {@link WorkflowEditor}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH
 */
@SuppressWarnings("restriction") // Accessing Eclipse-internal APIs
public final class ClassicWorkflowEditorUtil {

    /**
     * The part ID of a workflow editor in the Eclipse UI.
     */
    private static final String WORKFLOW_EDITOR_PART_ID = "org.eclipse.e4.ui.compatibility.editor";

    private ClassicWorkflowEditorUtil() {
        // utility class
    }

    /**
     * Determines all opened workflow editors (in the classic KNIME perspective). Determines model service and
     * application model via the {@link Workbench}.
     *
     * @return Stream of all opened workflow editors
     */
    private static Stream<WorkflowEditor> getOpenWorkflowEditors() {
        var workbench = (Workbench)PlatformUI.getWorkbench();
        return getOpenWorkflowEditors(workbench.getService(EModelService.class), workbench.getApplication());
    }

    /**
     * Determine all workflow editors that are currently part of the application model.
     *
     * @param modelService
     * @param app
     * @return Stream of all opened workflow editors
     */
    private static Stream<WorkflowEditor> getOpenWorkflowEditors(final EModelService modelService,
        final MApplication app) {
        return getOpenWorkflowEditorParts(modelService, app) //
            .map(p -> getWorkflowEditor((CompatibilityPart)p.getObject())) //
            .flatMap(Optional::stream);
    }

    private static Optional<WorkflowEditor> getWorkflowEditor(final CompatibilityPart part) {
        return Display.getDefault()
            .syncCall(() -> editorRefenceToWorkflowEditor((IEditorReference)part.getReference(), true));
    }

    private static Optional<WorkflowEditor> editorRefenceToWorkflowEditor(final IEditorReference reference,
        final boolean restoreEditor) {
        return Optional.of(reference)//
            .map(ref -> ref.getEditor(restoreEditor))//
            .filter(WorkflowEditor.class::isInstance)//
            .map(WorkflowEditor.class::cast);
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

        WorkflowLoadResult loadResult = WorkflowManager.loadProject(wfDir, new ExecutionMonitor(), loadHelper);
        return loadResult.getWorkflowManager();
    }

    private static WorkflowManager[] getDirtyWorkflowManagers() {
        return getOpenWorkflowEditors()//
            .map(WorkflowEditor::getWorkflowManager)//
            .flatMap(Optional::stream)//
            .filter(WorkflowManager::isDirty)//
            .toArray(WorkflowManager[]::new);
    }

    /**
     * Close all open editors with a user prompt.
     *
     * @return Whether all editors where closed successfully.
     */
    public static boolean closeAllEditorsWithPrompt() {
        return Optional.ofNullable(PlatformUI.getWorkbench())//
            .map(IWorkbench::getActiveWorkbenchWindow)//
            .map(IWorkbenchWindow::getActivePage)//
            .map(page -> {
                final var dirtyWfms = getDirtyWorkflowManagers();
                final var dialogResponse = SaveAndCloseProjects.promptWhetherToSaveProjects(dirtyWfms);
                return switch (dialogResponse) {
                    case YES -> page.saveAllEditors(false) && page.closeAllEditors(false);
                    case NO -> page.closeAllEditors(false);
                    default -> false;
                };
            })//
            .orElse(true); // Success if no active page found
    }

    /**
     * @return {@code true} if there is at least one open editor
     */
    public static boolean hasAtLeastOneOpenEditor() {
        return Optional.ofNullable(PlatformUI.getWorkbench())//
            .map(IWorkbench::getActiveWorkbenchWindow)//
            .map(IWorkbenchWindow::getActivePage)//
            .map(IWorkbenchPage::getEditorReferences)//
            .map(references -> Arrays.stream(references)//
                .map(reference -> editorRefenceToWorkflowEditor(reference, false))//
                .flatMap(Optional::stream)//
                .count())//
            .map(numberOfWorkflowEditors -> numberOfWorkflowEditors > 0)//
            .orElse(false);
    }

}
