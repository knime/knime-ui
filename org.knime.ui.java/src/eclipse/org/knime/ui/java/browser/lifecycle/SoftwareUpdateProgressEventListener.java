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
 *   Aug 22, 2024 (kai): created
 */
package org.knime.ui.java.browser.lifecycle;

import static org.knime.ui.java.api.DesktopAPI.MAPPER;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.Predicate;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.jobs.IJobChangeEvent;
import org.eclipse.core.runtime.jobs.IJobChangeListener;
import org.eclipse.core.runtime.jobs.IJobManager;
import org.eclipse.core.runtime.jobs.Job;
import org.knime.gateway.impl.webui.service.events.EventConsumer;

/**
 * Listens to all the jobs the {@link IJobManager} is aware of and sends events via the {@link EventConsumer} whenever a
 * watched job starts or finishes. Also, this registers a {@link IProgressMonitor} listener to a job, so we also get job
 * progress information.
 *
 * @author Kai Franze, KNIME GmbH
 * @author Martin Horn, KNIME GmbH
 */
final class SoftwareUpdateProgressEventListener implements IJobChangeListener {

    /**
     * When installing extension(s)
     */
    static final String TASK_NAME_INSTALLING_SOFTWARE = "Installing Software";

    /**
     * When updating extension(s)
     */
    static final String TASK_NAME_UPDATING_SOFTWARE = "Updating Software";

    /**
     * When fetching metadata from the available update sites
     */
    static final String TASK_NAME_CONTACTING_SOFTWARE_SITES = "Contacting Software Sites";

    /**
     * The name of the event this listener will emit
     */
    static final String EVENT_NAME = "SoftwareUpdateProgressEvent";

    /**
     * The jobs to watch
     */
    static final List<String> WATCHED_JOBS = List.of( //
        "org.eclipse.equinox.p2.operations.ProfileModificationJob", //
        "org.eclipse.equinox.p2.ui.LoadMetadataRepositoryJob");

    /**
     * The status to be sent with the event
     */
    enum Status {
            STARTED("Started"), //
            FETCHING("Fetching"), //
            INSTALLING("Installing"), //
            FINISHED("Finished");

        private final String m_label;

        Status(final String label) {
            m_label = label;
        }

        String label() {
            return m_label;
        }
    }

    private final EventConsumer m_eventConsumer;

    private final Predicate<Job> m_isWatchedJob; // To make it unit-testable

    private final BiConsumer<Job, IProgressMonitor> m_addProgressListener; // To make it unit-testable

    private final BiConsumer<Job, IProgressMonitor> m_removeProgressListener; // To make it unit-testable

    private final Map<String, IProgressMonitor> m_progressListener = new HashMap<>();

    SoftwareUpdateProgressEventListener(final EventConsumer eventConsumer, final Predicate<Job> isWatchedJob,
        final BiConsumer<Job, IProgressMonitor> addProgressListener,
        final BiConsumer<Job, IProgressMonitor> removeProgressListener) {
        m_eventConsumer = eventConsumer;
        m_isWatchedJob = isWatchedJob;
        m_addProgressListener = addProgressListener;
        m_removeProgressListener = removeProgressListener;
    }

    @Override
    public void sleeping(final IJobChangeEvent event) {
        // No need to send an event
    }

    @Override
    public void scheduled(final IJobChangeEvent event) {
        // No need to send an event
    }

    @Override
    public void running(final IJobChangeEvent event) {
        var job = event.getJob();
        if (isWatchedJob(job)) {
            createAndSendProgressEvent(m_eventConsumer, job.getName(), null, Status.STARTED, 0.0);
            var listener = new JobProgressMonitor(job.getName());
            // Adds progress listener to job monitor
            m_addProgressListener.accept(job,  listener);
            // Locally keeps track of the progress listener s.t. it can be removed when done
            m_progressListener.put(job.getName(), listener);

        }
    }

    @Override
    public void done(final IJobChangeEvent event) {
        var job = event.getJob();
        if (isWatchedJob(job)) {
            createAndSendProgressEvent(m_eventConsumer, job.getName(), null, Status.FINISHED, 100.0);
            Optional.ofNullable(m_progressListener.get(job.getName())).ifPresent(listener -> {
                // Removes progress listener from job monitor
                m_removeProgressListener.accept(job, listener);
                // Locally removes the progress listener for this job
                m_progressListener.remove(job.getName());
            });
        }
    }

    @Override
    public void awake(final IJobChangeEvent event) {
        // No need to send an event
    }

    @Override
    public void aboutToRun(final IJobChangeEvent event) {
        // No need to send an event
    }

    private boolean isWatchedJob(final Job job) {
        if (job == null) {
            return false;
        }
        return m_isWatchedJob.test(job);
    }

    /**
     * Creates and consumes a 'ProgressEvent' for the given task, subtask and progress.
     */
    private static void createAndSendProgressEvent(final EventConsumer eventConsumer, final String task,
        final String subTask, final double progress) {
        var status = determineStatus(task, subTask);
        createAndSendProgressEvent(eventConsumer, task, subTask, status, progress);
    }

    private static Status determineStatus(final String task, final String subTask) {
        if (task.equals(TASK_NAME_CONTACTING_SOFTWARE_SITES)) {
            return Status.FETCHING; // Since all the job does is fetching
        }

        if (subTask == null) {
            return Status.STARTED; // Fallback option
        }

        if (subTask.startsWith("Fetching")) {
            return Status.FETCHING;
        }

        return Status.INSTALLING; // Everything else that is not fetching is installing
    }

    private static void createAndSendProgressEvent(final EventConsumer eventConsumer, final String task,
        final String subTask, final Status status, final double progress) {
        var progressEvent = MAPPER.createObjectNode();

        progressEvent.put("task", task);
        if (subTask != null) {
            progressEvent.put("subtask", subTask);
        }
        progressEvent.put("status", status.label());
        progressEvent.put("progress", BigDecimal.valueOf(progress).setScale(0, RoundingMode.HALF_UP).doubleValue());

        eventConsumer.accept(EVENT_NAME, progressEvent);
    }

    /**
     * To be able to provide progress information on jobs in progress
     */
    private final class JobProgressMonitor implements IProgressMonitor {

        private int m_totalWork = -1;

        private double m_worked;

        private String m_task;

        private String m_subTask;

        JobProgressMonitor(final String task) {
            m_task = task;
        }

        private void createAndSendEvent() {
            if (m_totalWork > 0 && m_worked > 0) {
                var progress = m_worked / m_totalWork * 100;
                createAndSendProgressEvent(m_eventConsumer, m_task, m_subTask, progress);
            }
        }

        @Override
        public void worked(final int work) {
            internalWorked(work);
        }

        @Override
        public void subTask(final String name) {
            m_subTask = name;
            createAndSendEvent();
        }

        @Override
        public void setTaskName(final String name) {
            //
        }

        @Override
        public void setCanceled(final boolean value) {
            //
        }

        @Override
        public boolean isCanceled() {
            return false;
        }

        @Override
        public void internalWorked(final double work) {
            m_worked += work;
            createAndSendEvent();
        }

        @Override
        public void done() {
            //
        }

        @Override
        public void beginTask(final String name, final int totalWork) {
            m_totalWork = totalWork;
        }

    }

}
