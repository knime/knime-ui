package org.knime.ui.java.util;

import java.lang.reflect.InvocationTargetException;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

import org.eclipse.core.runtime.jobs.Job;
import org.eclipse.ui.PlatformUI;
import org.knime.ui.java.api.Locator;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;
import org.eclipse.core.runtime.IProgressMonitor;

import org.eclipse.core.runtime.IStatus;

import org.eclipse.core.runtime.OperationCanceledException;

import org.eclipse.core.runtime.Status;

import org.knime.core.node.NodeLogger;

import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;
import org.knime.workbench.explorer.view.AbstractContentProvider;

/**
 * Resolve an {@link Locator.Item} to an {@link org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore}. This
 * is in principle not a good idea since the latter will be deprecated. For the time being, it is still required to
 * establish compatibility with some legacy code until it is rewritten (see usages).
 * <p>
 * It is important to note that with AP-23529, the {@link ExplorerFileSystem} and any related
 * {@link AbstractExplorerFileStore}s are no longer automatically refreshed. Consequently, the file system has to be
 * refreshed before resolving. This is an expensive operation involving network I/O and should be avoided where
 * possible.
 */
public class FreshFileStoreResolver {
    public static List<AbstractExplorerFileStore> resolve(final Locator.Siblings items) {
        return items.itemIds().stream().map(itemId -> {
            return ExplorerFileSystem.INSTANCE.getStore(items.space().toKnimeUrl(itemId));
        }).toList();
    }

    public static AbstractExplorerFileStore resolve(Locator.Item item) {
        return ExplorerFileSystem.INSTANCE.getStore(item.space().toKnimeUrl(item.itemId()));
    }

    private static List<RemoteExplorerFileStore> findContentProviders(final Set<String> mountIds) {
        return ExplorerMountTable.getMountedContent() //
            .values().stream() //
            // filter mounted with current space providers, to not refresh remotes that are not visible in
            // ModernUI, if any
            .filter(contentProvider -> mountIds.contains(contentProvider.getMountID())) //
            // we don't need to refresh local and currently unconnected
            .filter(contentProvider -> contentProvider.isRemote() && contentProvider.isAuthenticated()) //
            .map(AbstractContentProvider::getRootStore) //
            .filter(RemoteExplorerFileStore.class::isInstance) //)
            .map(RemoteExplorerFileStore.class::cast) //)
            .toList();
    }

    /**
     * Refresh remote non-local content providers corresponding to the given mount IDs. There is no progress indication.
     * Call blocks until refresh is complete.
     *
     * Note: Intentionally left unused because not sure yet which is better in combination with modern destination picker.
     */
    public static void refreshContentProviders(final Set<String> mountIds) {
        var fileStores = findContentProviders(mountIds);
        if (fileStores.isEmpty()) {
            return;
        }
        fileStores.forEach(store -> store.refresh(true));
    }

    /**
     * Refresh remote non-local content providers corresponding to the given mount IDs. Progress is displayed as one Eclipse
     * workbench job per provider, all belonging to a job family. Call blocks until all jobs are finished or cancelled.
     */
    public static boolean refreshContentProvidersWithProgress(final Set<String> mountIds) {
        var fileStores = findContentProviders(mountIds);
        if (fileStores.isEmpty()) {
            return false;
        }
        return PlatformUI.getWorkbench().getDisplay().syncCall(() -> { // NOSONAR
            fileStores.forEach(store -> new RefreshJob(store).schedule());
            return joinOnJobFamily(RefreshJob.class);
        });
    }

    /**
     * Wait for jobs belonging to {@code family} to finish. In contrast to `new RefreshJob(...).run(monitor)`, this lets
     * us cancel individual jobs or the whole thing. For some reason, the former does not cancel jobs on "Cancel".
     * 
     * @param family see {@link Job#belongsTo(Object)} and {@link org.eclipse.core.runtime.jobs.IJobManager#join(Object, IProgressMonitor)}
     * @return Whether the job family execution has been cancelled.
     */
    private static boolean joinOnJobFamily(Object family) {
        final var canceled = new AtomicBoolean(false);
        try {
            PlatformUI.getWorkbench().getProgressService().busyCursorWhile(monitor -> { // NOSONAR complexity ok
                try {
                    // We wait for our refresh jobs to finish.
                    Job.getJobManager().join(family, monitor);
                } catch (final OperationCanceledException e) { // NOSONAR we handle this exception
                    // user hit cancel, suggest jobs to cancel as well. Unfortunately, it's not possible to
                    // find the job's thread to interrupt it... :(
                    for (final var job : Job.getJobManager().find(family)) {
                        job.cancel();
                    }
                    // handle refresh cancellation as complete cancellation, i.e. not opening the picker, too
                    canceled.set(true);
                    return;
                }
            });
        } catch (final InvocationTargetException e) {
            NodeLogger.getLogger(FreshFileStoreResolver.class)
                .warn("Failed to refresh remote content before opening dialog – content might be stale.", e);
        } catch (final InterruptedException e) { // NOSONAR we recover from that
            // we got interrupted while waiting for refresh, so we cancel the whole thing
            canceled.set(true);
        }
        return canceled.get();
    }

    /**
     * Eclipse workbench job to refresh a given {@link RemoteExplorerFileStore}.
     */
    private static final class RefreshJob extends Job {

        private final RemoteExplorerFileStore m_store;

        private RefreshJob(final RemoteExplorerFileStore store) {
            super("Refresh remote content");
            setUser(true);
            m_store = store;
        }

        @Override
        public boolean belongsTo(final Object family) {
            return family == RefreshJob.class;
        }

        @Override
        protected IStatus run(final IProgressMonitor monitor) {
            monitor.beginTask("Refreshing \"%s\"...".formatted(m_store.getMountID()), IProgressMonitor.UNKNOWN);
            if (monitor.isCanceled()) {
                return Status.CANCEL_STATUS;
            }
            m_store.refresh(true);
            monitor.done();
            return Status.OK_STATUS;

        }

        @Override
        protected void canceling() {
            super.canceling();
            // we need to interrupt the thread, because the store refresh does not check the progress monitor for
            // cancellation
            getThread().interrupt();
        }

    }

}
