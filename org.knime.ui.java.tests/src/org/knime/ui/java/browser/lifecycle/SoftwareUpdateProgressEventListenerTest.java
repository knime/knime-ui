/*
 * ------------------------------------------------------------------------
 *
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.org; Email: contact@knime.org
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.knime.ui.java.api.DesktopAPI.MAPPER;
import static org.knime.ui.java.browser.lifecycle.SoftwareUpdateProgressEventListener.EVENT_NAME;
import static org.knime.ui.java.browser.lifecycle.SoftwareUpdateProgressEventListener.TASK_NAME_CONTACTING_SOFTWARE_SITES;
import static org.knime.ui.java.browser.lifecycle.SoftwareUpdateProgressEventListener.TASK_NAME_INSTALLING_SOFTWARE;
import static org.knime.ui.java.browser.lifecycle.SoftwareUpdateProgressEventListener.TASK_NAME_UPDATING_SOFTWARE;
import static org.mockito.ArgumentMatchers.eq;

import java.util.function.Function;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.jobs.IJobChangeEvent;
import org.eclipse.core.runtime.jobs.IJobChangeListener;
import org.eclipse.core.runtime.jobs.Job;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.ui.java.browser.lifecycle.SoftwareUpdateProgressEventListener.Status;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Tests the {@link SoftwareUpdateProgressEventListener} class.
 *
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class SoftwareUpdateProgressEventListenerTest {

    private static final String FETCH_MSG =
        "Fetching io.airlift.aircompressor_0.27.0.knimebd-20240619.jar from https://update.knime.com/analytics-platform/5.4/knid=11-6b8b2650a775a7b8-01-fab2e1761c9b1f20/plugins/ (269.2kB)";

    private static final String FETCH_MSG2 =
        "Fetching p2.index from https://update.knime.com/community-contributions/trusted/5.4/ (115B)";

    private static final String INSTALL_MSG = "Installing com.aayushatharva.brotli4j-merged";

    private static final String CONFIGURE_MSG = "Configuring org.knime.bigdata.fileformats";

    private EventConsumer m_eventConsumer;

    private IJobChangeListener m_jobChangeListener;

    private IProgressMonitor m_progressMonitor;

    private IJobChangeEvent mockJobChangeEvent(final String name) {
        var event = Mockito.mock(IJobChangeEvent.class);
        var status = Mockito.mock(IStatus.class);
        var job = Job.create(name, monitor -> status);
        Mockito.doReturn(job).when(event).getJob();
        return event;
    }

    @BeforeEach
    void setup() {
        m_eventConsumer = Mockito.mock(EventConsumer.class);
        m_jobChangeListener = new SoftwareUpdateProgressEventListener(m_eventConsumer, job -> true, //
            (job, listener) -> {
                m_progressMonitor = listener;
            }, //
            (job, listener) -> {
                m_progressMonitor = null;
            });
    }

    @AfterEach
    void shutdown() {
        m_progressMonitor = null;
    }

    /**
     * Checks for the correct event being emitted when {@link IJobChangeListener#running(IJobChangeEvent)} is called.
     *
     * @throws Exception
     */
    @Test
    void testRunning() throws Exception {
        var event = mockJobChangeEvent(TASK_NAME_INSTALLING_SOFTWARE);
        m_jobChangeListener.running(event);

        var expected = MAPPER.readTree("""
                {
                    "task": "%s",
                    "status": "%s",
                    "progress": %s
                }
                """.formatted(TASK_NAME_INSTALLING_SOFTWARE, Status.STARTED.label(), 0.0));

        assertThat(m_progressMonitor).as("A job progress monitor should have been set").isNotNull();
        Mockito.verify(m_eventConsumer, Mockito.times(1)).accept(EVENT_NAME, expected);
    }

    /**
     * Tests for the correct event being emitted when {@link IJobChangeListener#done(IJobChangeEvent)} is called.
     *
     * @throws Exception
     */
    @Test
    void testDone() throws Exception {
        var event = mockJobChangeEvent(TASK_NAME_UPDATING_SOFTWARE);
        m_jobChangeListener.running(event); // This registers the job change listener and sends the first event
        assertThat(m_progressMonitor).as("A job progress monitor should have been set").isNotNull();

        m_jobChangeListener.done(event); // This removes the job change listener and sends the second event
        assertThat(m_progressMonitor).as("The job progress monitor should have been removed").isNull();

        var expected = MAPPER.readTree("""
                {
                    "task": "%s",
                    "status": "%s",
                    "progress": %s
                }
                """.formatted(TASK_NAME_UPDATING_SOFTWARE, Status.FINISHED.label(), 100.0));
        var captor = ArgumentCaptor.forClass(JsonNode.class);

        Mockito.verify(m_eventConsumer, Mockito.times(2)).accept(eq(EVENT_NAME), captor.capture());
        assertThat(captor.getAllValues()).as("Check if expected event on task was sent").contains(expected);
    }

    /**
     * Tests for the correct event being emitted when {@link IProgressMonitor} is working on a subtask.
     *
     * @throws Exception
     */
    @Test
    void testEventForFetchOnIntall() throws Exception {
        assertEventOnSubTask(TASK_NAME_INSTALLING_SOFTWARE, FETCH_MSG, Status.FETCHING, 20.3, 20.0);
    }

    /**
     * Tests for the correct event being emitted when {@link IProgressMonitor} is working on a subtask.
     *
     * @throws Exception
     */
    @Test
    void testEventForFetchOnSync() throws Exception {
        assertEventOnSubTask(TASK_NAME_CONTACTING_SOFTWARE_SITES, FETCH_MSG2, Status.FETCHING, 12.3, 12.0);
    }

    /**
     * Tests for the correct event being emitted when {@link IProgressMonitor} is working on a subtask.
     *
     * @throws Exception
     */
    @Test
    void testEventForFetchOnSyncAnyTask() throws Exception {
        assertEventOnSubTask(TASK_NAME_CONTACTING_SOFTWARE_SITES, "foo bar", Status.FETCHING, 98.9, 99.0);
    }

    /**
     * Tests for the correct event being emitted when {@link IProgressMonitor} is working on a subtask.
     *
     * @throws Exception
     */
    @Test
    void testEventForInstallOnInstall() throws Exception {
        assertEventOnSubTask(TASK_NAME_INSTALLING_SOFTWARE, INSTALL_MSG, Status.INSTALLING, 50.4, 50.0);
    }

    /**
     * Tests for the correct event being emitted when {@link IProgressMonitor} is working on a subtask.
     *
     * @throws Exception
     */
    @Test
    void testEventForInstallOnUpdate() throws Exception {
        assertEventOnSubTask(TASK_NAME_UPDATING_SOFTWARE, INSTALL_MSG, Status.INSTALLING, 66.66, 67.0);
    }

    /**
     * Tests for the correct event being emitted when {@link IProgressMonitor} is working on a subtask.
     *
     * @throws Exception
     */
    @Test
    void testEventForConfigure() throws Exception {
        assertEventOnSubTask(TASK_NAME_INSTALLING_SOFTWARE, CONFIGURE_MSG, Status.INSTALLING, 75.6, 76.0);
    }

    private void assertEventOnSubTask(final String task, final String subTask, final Status expectedStatus,
        final double progress, final double expectedProgress) throws Exception {
        var event = mockJobChangeEvent(task);
        m_jobChangeListener.running(event); // This registers the job change listener and sends the first event

        m_progressMonitor.beginTask(task, 100);
        m_progressMonitor.subTask(subTask);
        m_progressMonitor.internalWorked(progress); // This sends the second event

        var expected = MAPPER.readTree("""
                {
                    "task": "%s",
                    "subtask": "%s",
                    "status": "%s",
                    "progress": %s
                }
                """.formatted(task, subTask, expectedStatus.label(), expectedProgress));
        var captor = ArgumentCaptor.forClass(JsonNode.class);
        Mockito.verify(m_eventConsumer, Mockito.times(2)).accept(eq(EVENT_NAME), captor.capture());
        assertThat(captor.getAllValues()).as("Check if expected event on subtask was sent").contains(expected);
    }

}
