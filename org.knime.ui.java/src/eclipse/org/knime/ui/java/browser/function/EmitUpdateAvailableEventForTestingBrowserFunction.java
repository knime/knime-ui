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
 *   Jan 5, 2023 (kai): created
 */
package org.knime.ui.java.browser.function;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import org.knime.core.eclipseUtil.UpdateChecker.UpdateInfo;
import org.knime.core.node.NodeLogger;
import org.knime.gateway.api.webui.entity.UpdateAvailableEventEnt;
import org.knime.gateway.impl.webui.UpdateStateProvider;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Browser function used to emit {@link UpdateAvailableEventEnt} for testing.
 *
 * @author Kai Franze, KNIME GmbH
 */
public class EmitUpdateAvailableEventForTestingBrowserFunction extends BrowserFunction {

    private static final String FUNCTION_NAME = "emitUpdateAvailableEventForTesting";

    private final UpdateStateProvider m_updateStateProvider;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Constructor
     *
     * @param browser
     * @param updateStateProvider
     */
    public EmitUpdateAvailableEventForTestingBrowserFunction(final Browser browser,
        final UpdateStateProvider updateStateProvider) {
        super(browser, FUNCTION_NAME);
        m_updateStateProvider = updateStateProvider;
    }

    @Override
    public Object function(final Object[] args) { // NOSONAR: Always returning `null` is fine here.
        if (args == null || args.length != 1 || !(args[0] instanceof String)) {
            throw new IllegalArgumentException("Wrong argument for browser function '" + getName()
                    + "'. The arguments are: " + Arrays.toString(args));
        }

        JsonNode updateStateNode;
        try {
            updateStateNode = MAPPER.readValue((String)args[0], JsonNode.class);
        } catch (JsonProcessingException ex) {
            NodeLogger.getLogger(this.getClass()).warn("Argument couldn't be parsed to JSON", ex);
            return null;
        }

        JsonNode newReleases = updateStateNode.get("newReleases");
        List<UpdateInfo> newReleasesList = newReleases == null ? //
            Collections.emptyList() : //
            StreamSupport.stream(newReleases.spliterator(), false)//
                .map(EmitUpdateAvailableEventForTestingBrowserFunction::createUpdateInfo)//
                .collect(Collectors.toList());
        JsonNode bugfixes = updateStateNode.get("bugfixes");
        List<String> bugfixesList = bugfixes == null ? //
            Collections.emptyList() : //
            StreamSupport.stream(bugfixes.spliterator(), false)//
                .map(JsonNode::textValue)//
                .collect(Collectors.toList());

        m_updateStateProvider.emitUpdateNotificationsForTesting(newReleasesList, bugfixesList);
        return null;
    }

    private static UpdateInfo createUpdateInfo(final JsonNode jsonNode) {
        return new UpdateInfo(null, jsonNode.get("name").textValue(), jsonNode.get("shortName").textValue(),
            jsonNode.get("isUpdatePossible").booleanValue());
    }

}
