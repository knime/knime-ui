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
 *   Feb 3, 2023 (leonard.woerteler): created
 */
package org.knime.ui.java.api;

import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.MultiStatus;
import org.eclipse.core.runtime.Status;
import org.eclipse.jface.dialogs.ErrorDialog;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.operation.IRunnableWithProgress;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.util.CheckUtils;
import org.knime.workbench.explorer.ExplorerActivator;
import org.knime.workbench.explorer.dialogs.SpaceResourceSelectionDialog;
import org.knime.workbench.explorer.dialogs.Validator;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystemUtils;
import org.knime.workbench.explorer.filesystem.LocalExplorerFileStore;
import org.knime.workbench.explorer.filesystem.MessageFileStore;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;
import org.knime.workbench.explorer.view.AbstractContentProvider;
import org.knime.workbench.explorer.view.ContentDelegator;
import org.knime.workbench.explorer.view.ContentObject;
import org.knime.workbench.explorer.view.DestinationChecker;
import org.knime.workbench.explorer.view.ExplorerView;
import org.knime.workbench.explorer.view.actions.AbstractCopyMoveAction;
import org.knime.workbench.explorer.view.actions.CopyMove;

/**
 * Adaptation of the Classic AP {@link AbstractCopyMoveAction} without a dependency on {@link ExplorerView}.
 *
 * @author Leonard Wörteler, KNIME GmbH, Konstanz, Germany
 */
class ClassicAPCopyMoveLogic {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(ClassicAPCopyMoveLogic.class);

    private final List<String> m_mountIds;
    private final Shell m_parentShell;
    private List<AbstractExplorerFileStore> m_sources;
    private AbstractExplorerFileStore m_target;
    private boolean m_performMove;
    /** The textual representation of the performed command. */
    private final String m_cmd;

    /**
     * Creates a new copy/move action that copies/moves the source files to the target file store.
     *
     * @param mountIds mountpoints to show
     * @param shell parent shell
     * @param sources the file stores to copy
     * @param target the file store to copy/move the files to
     * @param performMove true to move the files, false to copy them
     */
    ClassicAPCopyMoveLogic(
            final List<String> mountIds,
            final Shell shell,
            final List<AbstractExplorerFileStore> sources,
            final AbstractExplorerFileStore target,
            final boolean performMove) {
        m_mountIds = mountIds;
        m_parentShell = shell;
        m_sources = CheckUtils.checkArgumentNotNull(sources);
        setTarget(target);
        m_performMove = performMove;
        m_cmd = m_performMove ? "Move" : "Copy";
    }

    /**
     * Runs the copy or move process including all dialogs.
     *
     * @return {@true} if all resources could be copied/moved, {@code false} otherwise
     */
    boolean run() {
        // sort sources by providers - needed for the checks done later
        final var sourceProviders = new HashMap<AbstractContentProvider, List<AbstractExplorerFileStore>>();
        for (AbstractExplorerFileStore f : m_sources) {
            sourceProviders.computeIfAbsent(f.getContentProvider(), provider -> new ArrayList<>()).add(f);
        }

        if (!isEnabled(sourceProviders)) {
            return false;
        }

        // open browse dialog for target selection if necessary
        if (m_target == null) {
            openTargetSelectionDialog();
        }

        if (m_target == null) {
            // user cancelled target selection
            return false;
        }

        if (copyOrMove(m_sources)) {
            LOGGER.debug((m_performMove ? "Moving" : "Copying") + " to \"" + m_target.getFullName() + "\" failed.");
            return true;
        } else {
            LOGGER.debug("Successfully " + (m_performMove ? "moved " : "copied ") + m_sources.size() + " item(s) to \""
                    + m_target.getFullName() + "\".");
            return false;
        }
    }

    private void openTargetSelectionDialog() {
        ContentObject initialSelection = null;
        if (m_sources.size() == 1) {
            final var selection = ContentDelegator.getTreeObjectFor(m_sources.get(0).getParent());
            if (selection instanceof ContentObject) {
                initialSelection = (ContentObject)selection;
            }
        }

        final var shownMountIds = m_mountIds.toArray(new String[0]);
        final var dialog = new SpaceResourceSelectionDialog(m_parentShell, shownMountIds, initialSelection);
        dialog.setTitle("Target workflow group selection");
        dialog.setDescription("Please select the location to " + m_cmd.toLowerCase(Locale.ROOT)
                + " the selected files to.");
        dialog.setValidator(new Validator() {
            @Override
            public String validateSelectionValue(final AbstractExplorerFileStore selection, final String name) {
                boolean isWFG = selection.fetchInfo().isWorkflowGroup();
                return isWFG ? null : "Only workflow groups can be selected as target.";
            }
        });
        if (Window.OK == dialog.open()) {
            setTarget(dialog.getSelection());
        }
    }

    /**
     * @param srcFileStores the file stores to copy/move
     * @return true if the operation was successful, false otherwise
     */
    private boolean copyOrMove(final List<AbstractExplorerFileStore> srcFileStores) { // NOSONAR
        // Make sure that the target is not a child of any item in the selection.
        final var selection = new HashSet<>(srcFileStores);
        for (var current = m_target; current != null; current = current.getParent()) {
            if (selection.contains(current)) {
                final var msg = "Cannot " + m_cmd.toLowerCase(Locale.ROOT) + " the selected files into "
                        + m_target.toString().replace("&", "&&") + " because it is a child of the selection.";
                MessageDialog.openError(m_parentShell, m_cmd + " Workflow", msg);
                LOGGER.info(msg);
                return false;
            }
        }

        // collect the necessary information
        final var destChecker =
                new DestinationChecker<>(m_parentShell, m_cmd, srcFileStores.size() > 1, !m_performMove);
        destChecker.setIsOverwriteDefault(true);

        // Check destination in content provider. Currently only used for the HUB to handle copy/paste on root level
        final var newTarget = m_target.getContentProvider().checkCopyMoveDestination(m_target, srcFileStores);
        if (newTarget == null) {
            return false;
        }
        setTarget(newTarget);

        // Sort sources s.t. workflow groups are handled first as they don't have the 'Apply to all' button.
        final var partitioned = srcFileStores.stream() //
                .collect(Collectors.partitioningBy(e -> e.fetchInfo().isWorkflowGroup()));
        final var groupsFirst = Stream.of(Boolean.TRUE, Boolean.FALSE)  //
            .flatMap(isGroup -> partitioned.getOrDefault(isGroup, List.of()).stream()) //
            .iterator();
        while (groupsFirst.hasNext()) {
            final var srcFS = groupsFirst.next();
            if (destChecker.isAbort()) {
                LOGGER.info(m_cmd + " operation was aborted.");
                return false;
            }
            if (destChecker.getAndCheckDestinationFlow(srcFS, m_target) == null) {
                // the user skipped the operation or it is not allowed
                LOGGER.info(m_cmd + " operation of " + srcFS.getMountIDWithFullPath() + " was skipped.");
            }
        }

        /* Check for unlockable local destinations. Unfortunately this cannot
         * be done in the copy loop below as this runs in a non SWT-thread
         * but needs access to the workbench pages. */
        final var notOverwritableDest = new HashSet<LocalExplorerFileStore>();
        final var lockedDest = new ArrayList<LocalExplorerFileStore>();
        final var overWrittenFlows = new HashMap<AbstractContentProvider, List<AbstractExplorerFileStore>>();
        for (AbstractExplorerFileStore toBeOverwritten : destChecker.getOverwriteFS()) {
            final var info = toBeOverwritten.fetchInfo();
            if (!info.isWorkflow()) {
                continue;
            }
            if (toBeOverwritten instanceof LocalExplorerFileStore) {
                final var localStore = (LocalExplorerFileStore)toBeOverwritten;
                if (ExplorerFileSystemUtils.lockWorkflow(localStore)) {
                    lockedDest.add(localStore);
                    // Flows opened in an editor cannot be overwritten
                    if (ExplorerFileSystemUtils.hasOpenWorkflows(Arrays.asList(localStore)) // NOSONAR
                            || ExplorerFileSystemUtils.hasOpenReports(Arrays.asList(localStore))) {
                        notOverwritableDest.add(localStore);
                    }
                } else {
                    notOverwritableDest.add(localStore);
                }
            }
            // collect all overwritten flows for each content provider
            final var provider = toBeOverwritten.getContentProvider();
            overWrittenFlows.computeIfAbsent(provider, key -> new ArrayList<>()).add(toBeOverwritten);
        }
        // confirm overwrite with each content provider (server is currently only one that pops up a dialog)
        for (final var overwritten : overWrittenFlows.entrySet()) {
            // TODO: how can we avoid that multiple confirm dialogs pop up?
            // Becomes only an issue of the server is not the only one popping up a dialog.
            final var confirm = overwritten.getKey().confirmOverwrite(m_parentShell, overwritten.getValue());
            if (confirm != null && !confirm.get()) {
                LOGGER.info("User canceled overwrite in " + overwritten.getKey());
                return false;
            }
        }
        // confirm move (deletion of flows in source location)
        final var destCheckerMappings = destChecker.getMappings();
        if (m_performMove) {
            final var movedFlows = new HashMap<AbstractContentProvider, List<AbstractExplorerFileStore>>();
            for (final var sourceStore : srcFileStores) {
                if (AbstractExplorerFileStore.isWorkflow(sourceStore) && destCheckerMappings.get(sourceStore) != null) {
                    movedFlows.computeIfAbsent(sourceStore.getContentProvider(), key -> new ArrayList<>()) //
                        .add(sourceStore);
                }
            }
            for (final var moved : movedFlows.entrySet()) {
                final var confirmed = moved.getKey().confirmMove(m_parentShell, moved.getValue());
                if (confirmed != null && !confirmed.get()) {
                    LOGGER.info("User canceled move (flow del in source) in " + moved.getKey());
                    return false;
                }
            }
        }

        final var success = new AtomicBoolean(true);
        final var statusList = new ArrayList<IStatus>();
        try {
            // perform the copy/move operations en-bloc in the background
            PlatformUI.getWorkbench().getProgressService().busyCursorWhile(new IRunnableWithProgress() {
                @Override
                public void run(final IProgressMonitor monitor) throws InvocationTargetException, InterruptedException {
                    final var copyMove = new CopyMove(null, m_target, destChecker, m_performMove);
                    // If uploading, check for reset preference
                    if (!srcFileStores.isEmpty() && !(srcFileStores.get(0) instanceof RemoteExplorerFileStore)
                            && m_target instanceof RemoteExplorerFileStore) {
                        copyMove.setExcludeDataInWorkflows(m_target.getContentProvider().isForceResetOnUpload());
                    }
                    copyMove.setSrcFileStores(srcFileStores);
                    copyMove.setNotOverwritableDest(notOverwritableDest);
                    final var copyMoveResult = copyMove.run(monitor, (srcFS, processedTargets) -> {
                        // update source folder as we removed an item from it.
                        if (!srcFS.equals(m_target) && m_performMove) {
                            srcFS.getParent().refresh();
                        }
                        m_target.refresh();
                    });
                    success.set(copyMoveResult.isSuccess());
                    statusList.addAll(copyMoveResult.getStatusList());
                }
            });
        } catch (InvocationTargetException e) {
            LOGGER.debug("Invocation exception, " + e.getMessage(), e);
            statusList.add(new Status(IStatus.ERROR, ExplorerActivator.PLUGIN_ID,
                "invocation error: " + e.getMessage(), e));
            success.set(false);
        } catch (InterruptedException e) { // NOSONAR
            LOGGER.debug(m_cmd + " failed: interrupted, " + e.getMessage(), e);
            statusList.add(new Status(IStatus.ERROR, ExplorerActivator.PLUGIN_ID, "interrupted: " + e.getMessage(), e));
            success.set(false);
        } finally {
            // unlock all locked destinations
            ExplorerFileSystemUtils.unlockWorkflows(lockedDest);
        }

        if (statusList.size() > 1) {
            final var multiStatus = new MultiStatus(ExplorerActivator.PLUGIN_ID, IStatus.ERROR,
                statusList.toArray(IStatus[]::new), "Could not " + m_cmd + " all files.", null);
            ErrorDialog.openError(m_parentShell, m_cmd + " item", "Some problems occurred during the operation.",
                multiStatus);
            // Don't show it as failure if only some of the items could not be copied.
            success.set(true);
        } else if (statusList.size() == 1) {
            ErrorDialog.openError(m_parentShell, m_cmd + " item", "Some problems occurred during the operation.",
                statusList.get(0));
        }
        return success.get();
    }

    private boolean isEnabled(final Map<AbstractContentProvider, List<AbstractExplorerFileStore>> selectedProviders) {
        return m_target.fetchInfo().isWriteable() && isCopyOrMovePossible(selectedProviders, m_performMove);
    }

    /**
     * Determines if a copy/move operation is possible based on the selection.
     *
     * @param selProviders the selected content providers
     * @param performMove true if a move operation should be checked
     * @return true if the operation is possible, false otherwise
     */
    private static boolean isCopyOrMovePossible(
            final Map<AbstractContentProvider, List<AbstractExplorerFileStore>> selProviders,
            final boolean performMove) {
        if (selProviders.size() != 1) {
            // can only copy/move from one source content provider
            return false;
        }

        final var entry = selProviders.entrySet().iterator().next();
        final var provider = entry.getKey();
        if (provider != null && !provider.isWritable() && performMove) {
            return false;
        }
        final var selections = entry.getValue();
        return !(selections.isEmpty() || selections.get(0) instanceof MessageFileStore) &&
                selections.stream().allMatch(store -> performMove ? store.canMove() : store.canCopy());
    }

    private void setTarget(final AbstractExplorerFileStore target) {
        if (target == null || target.fetchInfo().isWorkflowGroup()) {
            m_target = target;
        } else {
            m_target = target.getParent();
        }
    }
}
