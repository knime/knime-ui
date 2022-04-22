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
package org.knime.ui.java.browser.function;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import org.knime.core.node.NodeLogger;
import org.knime.core.node.port.PortType;
import org.knime.gateway.api.util.CoreUtil;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.gateway.impl.webui.AppStateProvider.AppState.OpenedWorkflow;
import org.knime.ui.java.TestingUtil;
import org.knime.ui.java.browser.KnimeBrowserView;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;

/**
 * Browser function that allows one to programmatically initialise (and
 * parameterize) the application state from JS. It, e.g., determines what
 * workflow are opened from the beginning.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class InitAppForTestingBrowserFunction extends BrowserFunction {

	private static final String FUNCTION_NAME = "initAppForTesting";

	private static final ObjectMapper MAPPER = new ObjectMapper();

	private KnimeBrowserView m_knimeBrowser;

	/**
	 * Constructor.
	 *
	 * @param browser the browser to register this function with
	 * @param knimeBrowser reference to the knime browser view mainly to be able
	 * to set an URL
	 */
	public InitAppForTestingBrowserFunction(final Browser browser, final KnimeBrowserView knimeBrowser) {
		super(browser, FUNCTION_NAME);
		m_knimeBrowser = knimeBrowser;
	}

	@Override
	public Object function(final Object[] args) { // NOSONAR it's ok that this method always returns null
		if (args == null || args.length != 1 || !(args[0] instanceof String)) {
			throw new IllegalArgumentException("Wrong argument for browser function '" + getName()
					+ "'. The arguments are: " + Arrays.toString(args));
		}

		JsonNode appStateNode;
		try {
			appStateNode = MAPPER.readValue((String) args[0], JsonNode.class);
		} catch (JsonProcessingException ex) {
			NodeLogger.getLogger(this.getClass()).warn("Argument couldn't be parsed to JSON", ex);
			return null;
		}
		JsonNode openedWorkflows = appStateNode.get("openedWorkflows");
		ArrayNode availablePortTypes = (ArrayNode)appStateNode.get("availablePortTypes");
		ArrayNode recommendedPortTypeIds = (ArrayNode)appStateNode.get("recommendedPortTypeIds");
        if (openedWorkflows != null) {
			var appState = new AppStateProvider.AppState() {
				@Override
				public List<OpenedWorkflow> getOpenedWorkflows() {
					return StreamSupport.stream(openedWorkflows.spliterator(), false)
							.map(InitAppForTestingBrowserFunction::createOpenedWorkflow).collect(Collectors.toList());
				}

				@Override
				public Set<PortType> getAvailablePortTypes() {
					if (availablePortTypes == null) {
						return Collections.emptySet();
					}
					return StreamSupport.stream(availablePortTypes.spliterator(), false)
							.map(el -> CoreUtil.getPortType(el.asText()))
							.filter(Optional::isPresent)
							.map(Optional::get)
							.collect(Collectors.toSet());
				}

				@Override
				public List<PortType> getRecommendedPortTypes() {
					if (recommendedPortTypeIds == null) {
						return Collections.emptyList();
					}
					return StreamSupport.stream(recommendedPortTypeIds.spliterator(), false)
							.map(el -> CoreUtil.getPortType(el.asText()))
							.filter(Optional::isPresent)
							.map(Optional::get)
							.collect(Collectors.toList());
				}
			};
            TestingUtil.initAppStateForTesting(appState, m_knimeBrowser.createEventConsumer());
        }
		m_knimeBrowser.setUrl(true);
		return null;
	}

	private static OpenedWorkflow createOpenedWorkflow(final JsonNode json) {
		return new OpenedWorkflow() {

			@Override
			public boolean isVisible() {
				return json.get("visible").asBoolean();
			}

			@Override
			public String getWorkflowId() {
				return json.get("workflowId").asText();
			}

			@Override
			public String getProjectId() {
				return json.get("projectId").asText();
			}
		};
	}

}
