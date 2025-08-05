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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.core.filesystem.EFS;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.MultiStatus;
import org.eclipse.core.runtime.Status;
import org.eclipse.jface.dialogs.ErrorDialog;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.window.IShellProvider;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.util.CheckUtils;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.workbench.explorer.ExplorerActivator;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileInfo;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystemUtils;
import org.knime.workbench.explorer.filesystem.LocalExplorerFileStore;
import org.knime.workbench.explorer.filesystem.MessageFileStore;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;
import org.knime.workbench.explorer.view.AbstractContentProvider;
import org.knime.workbench.explorer.view.DestinationChecker;
import org.knime.workbench.explorer.view.ExplorerView;
import org.knime.workbench.explorer.view.dialogs.OverwriteAndMergeInfo;

/**
 * Adaptation of the Classic AP {@link org.knime.workbench.explorer.view.actions.AbstractCopyMoveAction} without a
 * dependency on {@link ExplorerView}.
 *
 * @author Leonard Wörteler, KNIME GmbH, Konstanz, Germany
 */
@Deprecated
@SuppressWarnings({"java:S3776", "java:S1541", "java:S1192", "java:S134"}) // complexity
final class ClassicAPCopyLogic {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(ClassicAPCopyLogic.class);

    private final IShellProvider m_shellProvider;

    private final SpaceProvider m_sourceSpaceProvider;

    private final List<AbstractExplorerFileStore> m_sources;

    private final boolean m_excludeData;

    private final SpaceProvider m_targetSpaceProvider;

    private final String m_targetSpaceId;

    private final AbstractExplorerFileStore m_target;

    /**
     * Creates a new copy action that copies the source files to the target file store.
     *
     * @param sourceSpaceProvider the source space provider
     * @param shellProvider parent shell
     * @param sources the file stores to copy
     * @param excludeData flag indicating whether source data should be excluded
     * @param target the file store to copy the files to
     * @param targetSpaceId ID of the target space, may be {@code null}
     */
    private ClassicAPCopyLogic(final IShellProvider shellProvider, final SpaceProvider sourceSpaceProvider,
        final List<AbstractExplorerFileStore> sources, final boolean excludeData,
        final SpaceProvider targetSpaceProvider, final AbstractExplorerFileStore target, final String targetSpaceId) {
        m_shellProvider = shellProvider;
        m_sourceSpaceProvider = sourceSpaceProvider;
        m_sources = CheckUtils.checkArgumentNotNull(sources);
        m_excludeData = excludeData;
        m_targetSpaceProvider = targetSpaceProvider;
        m_target = target.fetchInfo().isWorkflowGroup() ? target : target.getParent();
        m_targetSpaceId = targetSpaceId;
    }

    public static boolean copy(final IShellProvider shellProvider, final SpaceProvider sourceSpaceProvider,
        final List<AbstractExplorerFileStore> sources, final SpaceProvider targetSpaceProvider,
        final AbstractExplorerFileStore target, final String targetSpaceId, final boolean excludeData) {

        // make sure that the target provider is finished loading
        DesktopAPUtil.waitForMountpointToFinishFetching(target);
        if (!target.fetchInfo().isWriteable() || !isCopyPossible(sources)) {
            return false;
        }

        // Make sure that the target is not a child of any item in the selection.
        if (isTargetContainedInSelection(sources, target)) {
            final var msg = "Cannot copy the selected files into " + target.toString().replace("&", "&&")
                + " because it is a child of the selection.";
            MessageDialog.openError(shellProvider.getShell(), "Copy Workflow", msg);
            LOGGER.info(msg);
            return false;
        }

        // Check destination in content provider. Currently only used for the Hub to handle copy/paste on root level
        final var newTarget = target.getContentProvider().checkCopyMoveDestination(target, sources);
        if (newTarget == null) {
            // user aborted
            return false;
        }

        final var actualTarget = newTarget.fetchInfo().isWorkflowGroup() ? newTarget : newTarget.getParent();
        final var instance = new ClassicAPCopyLogic(shellProvider, sourceSpaceProvider, sources, excludeData,
            targetSpaceProvider, actualTarget, targetSpaceId);
        if (instance.run()) {
            LOGGER.debug(
                "Successfully copied " + instance.m_sources.size() + " item(s) to \"" + target.getFullName() + "\".");
            return true;
        } else {
            LOGGER.debug("Copying to \"" + target.getFullName() + "\" failed.");
            return false;
        }
    }

    private boolean run() {
        // collect the necessary information
        final var destChecker =
            new DestinationChecker<>(m_shellProvider.getShell(), "Copy", m_sources.size() > 1, true);
        destChecker.setIsOverwriteDefault(true);
        if (!confirmDestinations(destChecker, m_sources)) {
            return false;
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
            if (toBeOverwritten instanceof LocalExplorerFileStore localStore) {
                if (ExplorerFileSystemUtils.lockWorkflow(localStore)) {
                    lockedDest.add(localStore);
                    // Flows opened in an editor cannot be overwritten
                    if (ExplorerFileSystemUtils.hasOpenWorkflows(Arrays.asList(localStore))
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

        if (!confirmOverwrittenWorkflows(overWrittenFlows)) {
            return false;
        }

        final var success = new AtomicBoolean(true);
        final var statusList = new ArrayList<IStatus>();
        try {
            // perform the copy operations en-bloc
            DesktopAPUtil.runWithProgress("Copy", LOGGER, monitor -> { // NOSONAR
                final var copier = new Copier(destChecker);
                // If uploading, check for reset preference
                if (!m_sources.isEmpty() && !(m_sources.get(0) instanceof RemoteExplorerFileStore)
                    && m_target instanceof RemoteExplorerFileStore) {
                    copier.setExcludeDataInWorkflows(m_excludeData);
                }
                copier.setNotOverwritableDest(notOverwritableDest);
                final var copyResult = copier.run(monitor);
                success.set(copyResult.isSuccess());
                statusList.addAll(copyResult.getStatusList());
                return null;
            });
        } finally {
            // unlock all locked destinations
            ExplorerFileSystemUtils.unlockWorkflows(lockedDest);
        }

        if (statusList.size() > 1) {
            final var multiStatus = new MultiStatus(ExplorerActivator.PLUGIN_ID, IStatus.ERROR,
                statusList.toArray(IStatus[]::new), "Could not copy all files.", null);
            ErrorDialog.openError(m_shellProvider.getShell(), "Copy item",
                "Some problems occurred during the operation.", multiStatus);
            // Don't show it as failure if only some of the items could not be copied.
            success.set(true);
        } else if (statusList.size() == 1) {
            ErrorDialog.openError(m_shellProvider.getShell(), "Copy item",
                "Some problems occurred during the operation.", statusList.get(0));
        }
        return success.get();
    }

    private boolean confirmOverwrittenWorkflows(
        final HashMap<AbstractContentProvider, List<AbstractExplorerFileStore>> overWrittenFlows) {
        // confirm overwrite with each content provider (server is currently only one that pops up a dialog)
        for (final var overwritten : overWrittenFlows.entrySet()) {
            // TODO: how can we avoid that multiple confirm dialogs pop up? // NOSONAR
            // Becomes only an issue of the server is not the only one popping up a dialog.
            final var confirm =
                overwritten.getKey().confirmOverwrite(m_shellProvider.getShell(), overwritten.getValue());
            if (confirm != null && !confirm.get()) {
                LOGGER.info("User canceled overwrite in " + overwritten.getKey());
                return false;
            }
        }
        return true;
    }

    private boolean confirmDestinations(
        final DestinationChecker<AbstractExplorerFileStore, AbstractExplorerFileStore> destChecker,
        final List<AbstractExplorerFileStore> srcFileStores) {
        // Sort sources s.t. workflow groups are handled first as they don't have the 'Apply to all' button.
        final var partitioned = srcFileStores.stream() //
            .collect(Collectors.partitioningBy(e -> e.fetchInfo().isWorkflowGroup()));
        final var groupsFirst = Stream.of(Boolean.TRUE, Boolean.FALSE) //
            .flatMap(isGroup -> partitioned.getOrDefault(isGroup, List.of()).stream()) //
            .iterator();
        while (groupsFirst.hasNext()) {
            if (destChecker.isAbort()) {
                LOGGER.info("Copy operation was aborted.");
                return false;
            }
            final var srcFS = groupsFirst.next();
            if (destChecker.getAndCheckDestinationFlow(srcFS, m_target) == null) {
                // the user skipped the operation or it is not allowed
                LOGGER.info("Copy operation of " + srcFS.getMountIDWithFullPath() + " was skipped.");
            }
        }
        return true;
    }

    private static boolean isTargetContainedInSelection(final List<AbstractExplorerFileStore> sources,
        final AbstractExplorerFileStore target) {
        final var selection = new HashSet<>(sources);
        for (var current = target; current != null; current = current.getParent()) {
            if (selection.contains(current)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Determines if a copy operation is possible based on the selection.
     *
     * @param sources the selected content providers
     * @return true if the operation is possible, false otherwise
     */
    private static boolean isCopyPossible(final Collection<AbstractExplorerFileStore> sources) {
        // group sources by providers
        final var sourceProviders = new HashMap<AbstractContentProvider, List<AbstractExplorerFileStore>>();
        for (final var source : sources) {
            sourceProviders.computeIfAbsent(source.getContentProvider(), provider -> new ArrayList<>()).add(source);
        }

        if (sourceProviders.size() != 1) {
            // can only copy from one source content provider
            return false;
        }

        // make sure that the source provider is finished loading
        final var selections = sourceProviders.values().iterator().next();
        DesktopAPUtil.waitForMountpointToFinishFetching(selections.get(0));

        final var itemsSelected = !(selections.isEmpty() || selections.get(0) instanceof MessageFileStore);
        return itemsSelected && selections.stream().allMatch(store -> store.canCopy());
    }

    private final class Copier {

        private final DestinationChecker<AbstractExplorerFileStore, AbstractExplorerFileStore> m_destChecker;

        private boolean m_excludeDataInWorkflows;

        private Set<LocalExplorerFileStore> m_notOverwritableDest = Collections.emptySet();

        private boolean m_uploadWarningShown;

        private boolean m_success;

        private Copier(final DestinationChecker<AbstractExplorerFileStore, AbstractExplorerFileStore> destChecker) {
            m_destChecker = CheckUtils.checkArgumentNotNull(destChecker);
        }

        private Copier setNotOverwritableDest(final Set<LocalExplorerFileStore> notOverwritableDest) {
            m_notOverwritableDest = CheckUtils.checkArgumentNotNull(notOverwritableDest);
            return this;
        }

        /**
         * @param excludeDataInWorkflows the excludeDataInWorkflows to set
         * @return this
         */
        private Copier setExcludeDataInWorkflows(final boolean excludeDataInWorkflows) {
            m_excludeDataInWorkflows = excludeDataInWorkflows;
            return this;
        }

        /**
         * Runs this copy.
         *
         * @param monitor progress monitor
         * @return copy result
         */
        private CopyResult run(final IProgressMonitor monitor) {
            final var destCheckerMappings = m_destChecker.getMappings();
            final var overwriteAndMerge = m_destChecker.getOverwriteAndMergeInfos();
            final var statusList = new ArrayList<IStatus>();
            m_success = true;

            // calculating the number of file transactions (copy/down/uploads)
            final var processedTargets = new ArrayList<>(destCheckerMappings.values());
            processedTargets.removeAll(Collections.singleton(null));

            final var numFiles = processedTargets.size();
            monitor.beginTask("Copy" + " " + numFiles + " files to " + m_target.getFullName(), numFiles);
            for (final var entry : destCheckerMappings.entrySet()) {
                final var destFS = entry.getValue();
                // skip operations that have been marked to be skipped
                if (destFS != null) {
                    final var destInfo = overwriteAndMerge.get(destFS);
                    if (!performSingle(entry.getKey(), destFS, monitor, destInfo, statusList, processedTargets)) {
                        // user aborted
                        break;
                    }
                }
                monitor.worked(1);
            }

            m_target.refresh();
            return new CopyResult(statusList, m_success);
        }

        private boolean performSingle(final AbstractExplorerFileStore srcFS, final AbstractExplorerFileStore destFS,
            final IProgressMonitor monitor, final OverwriteAndMergeInfo destInfo, final List<IStatus> statusList,
            final List<AbstractExplorerFileStore> processedTargets) {
            final var destProvider = destFS.getContentProvider();
            final var operation = "Copy" + " " + srcFS.getMountIDWithFullPath() + " to " + destFS.getFullName();
            monitor.subTask(operation);
            LOGGER.debug(operation);
            try {
                if (m_notOverwritableDest.contains(destFS)) {
                    throw new UnsupportedOperationException("Cannot override \"" + destFS.getFullName()
                        + "\". Probably it is opened in the editor or it is in use by another user.");
                }
                final var isOverwritten = m_destChecker.getOverwriteFS().contains(destFS);

                /* Make sure that a workflow group is not overwritten by a workflow or template and vice versa. */
                final var srcFSInfo = srcFS.fetchInfo();
                assertPreconditions(srcFSInfo, srcFS, destProvider, destFS, isOverwritten);

                final var isSrcRemote = srcFS instanceof RemoteExplorerFileStore;
                final var isDstRemote = destFS instanceof RemoteExplorerFileStore;
                if (!isSrcRemote && isDstRemote) { // upload
                    final var remoteDest = (RemoteExplorerFileStore)destFS;
                    if (!checkPublicUploadOK(destProvider, remoteDest)) {
                        // user aborted when asked if upload to a public Hub space is OK
                        return false;
                    }
                    final var localSource = (LocalExplorerFileStore)srcFS;
                    final var targetSpace = m_targetSpaceProvider.getSpace(m_targetSpaceId);
                    targetSpace.saveBackTo(localSource.toLocalFile().toPath(), remoteDest.toURI(),
                        m_excludeDataInWorkflows, monitor);
                } else if (isSrcRemote && !isDstRemote) { // download
                    CheckUtils.checkState(!m_excludeDataInWorkflows, "Download 'without data' not implemented");
                    final var remoteSource = (RemoteExplorerFileStore)srcFS;
                    final var localDest = (LocalExplorerFileStore)destFS;
                    m_sourceSpaceProvider.syncDownloadWorkflow(remoteSource.toIdURI(), localDest.toURI(), false,
                        monitor);
                } else { // regular copy
                    CheckUtils.checkState(!m_excludeDataInWorkflows, "Copy 'without data' not implemented");
                    final int options = isOverwritten ? EFS.OVERWRITE : EFS.NONE;
                    final boolean keepHistory = destInfo != null && destInfo.keepHistory();
                    srcFS.copy(destFS, options, monitor, keepHistory);
                }
            } catch (CoreException e) {
                LOGGER.debug("Copy failed: " + e.getStatus().getMessage(), e);
                statusList.add(e.getStatus());
                m_success = false;
                processedTargets.remove(destFS);
            } catch (UnsupportedOperationException e) {
                // illegal operation
                LOGGER.debug("Copy failed: " + e.getMessage());
                statusList.add(new Status(IStatus.WARNING, ExplorerActivator.PLUGIN_ID, e.getMessage()));
                m_success = true;
                processedTargets.remove(destFS);
            } catch (Exception e) { // NOSONAR
                LOGGER.debug("Copy failed: " + e.getMessage(), e);
                statusList.add(new Status(IStatus.ERROR, ExplorerActivator.PLUGIN_ID, e.getMessage(), e));
                m_success = false;
                processedTargets.remove(destFS);
            }
            return true;
        }

        private void assertPreconditions(final AbstractExplorerFileInfo srcFSInfo,
            final AbstractExplorerFileStore srcFS, final AbstractContentProvider destProvider,
            final AbstractExplorerFileStore destFS, final boolean isOverwritten) {
            if (isOverwritten && (srcFSInfo.isWorkflowGroup() != destFS.fetchInfo().isWorkflowGroup())) {
                if (srcFSInfo.isWorkflowGroup()) {
                    throw new UnsupportedOperationException("Cannot override \"" + destFS.getFullName()
                        + "\". Workflows and MetaNode Templates cannot be overwritten by a Workflow Group.");
                } else {
                    throw new UnsupportedOperationException("Cannot override \"" + destFS.getFullName()
                        + "\". Workflow Groups can only be overwritten by other Workflow Groups.");
                }
            } else if (srcFSInfo.isWorkflowTemplate() && !destProvider.canHostWorkflowTemplate(srcFS)) {
                throw new UnsupportedOperationException("Cannot " + "Copy" + " metanode template '"
                    + srcFS.getFullName() + "' to " + destFS.getMountID() + "." + ". Unsupported operation.");
            }
        }

        private boolean checkPublicUploadOK(final AbstractContentProvider destProvider,
            final RemoteExplorerFileStore remoteDest) {
            if (m_uploadWarningShown) {
                return true;
            }

            for (var ancestor = remoteDest.getParent(); ancestor != null; ancestor = ancestor.getParent()) {
                final var ancestorInfo = ancestor.fetchInfo();
                if (ancestorInfo.isSpace() && !ancestorInfo.isPrivateSpace()) {
                    IStatus userChoice = destProvider.showUploadWarning(ancestor.getName());
                    if (userChoice.isOK()) {
                        m_uploadWarningShown = true;
                        break;
                    } else {
                        return false;
                    }
                }
            }
            return true;
        }
    }

    /** Return value of the run method. */
    public static final class CopyResult {
        private final List<IStatus> m_result;

        private final boolean m_success;

        CopyResult(final List<IStatus> result, final boolean success) {
            m_result = result;
            m_success = success;
        }

        /** @return the result list, not null. */
        public List<IStatus> getStatusList() {
            return m_result;
        }

        /** @return the success flag. */
        public boolean isSuccess() {
            return m_success;
        }
    }
}
