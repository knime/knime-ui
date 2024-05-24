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
 *   Mar 1, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.knime.ui.java.api.DesktopAPI.MAPPER;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvider.SpaceProviderConnection;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;

/**
 * Tests methods in {@link SpaceAPI}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class SpaceAPITest {

    @Test
    void testGetSpaceProviders() throws ExecutionException, InterruptedException { // TODO: NXT-2049
//        String localProviderId = "local_provider";
//        String localProviderName = "Local Provider";
//        String connectedProviderId = "connected_provider";
//        String connectedProviderName = "Connected Provider";
//
//        // mock space providers
//        var localSpaceProvider = mock(SpaceProvider.class);
//        when(localSpaceProvider.getId()).thenReturn(localProviderId);
//        when(localSpaceProvider.getName()).thenReturn(localProviderName);
//        when(localSpaceProvider.getType()).thenReturn(TypeEnum.LOCAL);
//        var connectedSpaceProvider = mock(SpaceProvider.class);
//        when(connectedSpaceProvider.getId()).thenReturn(connectedProviderId);
//        when(connectedSpaceProvider.getName()).thenReturn(connectedProviderName);
//        when(connectedSpaceProvider.getType()).thenReturn(TypeEnum.HUB);
//        when(connectedSpaceProvider.getConnection(false)).thenReturn(Optional.of(mock(SpaceProviderConnection.class)));
//
//        // make mocks available by mocking `SpaceProviders`
//        var spaceProviders = mock(SpaceProviders.class);
//        var providersMap = new LinkedHashMap<String, SpaceProvider>();
//        providersMap.put("1", localSpaceProvider);
//        providersMap.put("2", connectedSpaceProvider);
//        when(spaceProviders.getProvidersMap()).thenReturn(providersMap);
//
//        // The endpoint returns void and dispatches an event instead
//        var eventConsumer = mock(EventConsumer.class);
//
//        DesktopAPI.injectDependencies(null, null, spaceProviders, null, eventConsumer, null);
//
//        SpaceAPI.getSpaceProviders();
//
//        // construct expected event payload
//        var localProvider = MAPPER.createObjectNode();
//        localProvider.put("id", localProviderId);
//        localProvider.put("name", localProviderName);
//        localProvider.put("connected", true);
//        localProvider.put("connectionMode", "AUTOMATIC");
//        localProvider.put("type", "LOCAL");
//        var connectedProvider = MAPPER.createObjectNode();
//        connectedProvider.put("id", connectedProviderId);
//        connectedProvider.put("name", connectedProviderName);
//        connectedProvider.put("connected", true);
//        connectedProvider.put("connectionMode", "AUTHENTICATED");
//        connectedProvider.put("type", "HUB");
//        var result = MAPPER.createObjectNode();
//        result.set(localProviderId, localProvider);
//        result.set(connectedProviderId, connectedProvider);
//        var expected = MAPPER.createObjectNode();
//        expected.set("result", result);
//
//        // verify that event was dispatched
//        verify(eventConsumer).accept("SpaceProvidersChangedEvent", expected);
    }

    @Test
    void testGetSpaceProvidersExceptionally() throws ExecutionException, InterruptedException {
        // verify that event is sent in case of exception
        var spaceProviders = mock(SpaceProviders.class);
        var exception = new IllegalStateException("mock exception message");
        when(spaceProviders.getProvidersMap()).thenThrow(exception);
        var eventConsumer = mock(EventConsumer.class);
        DesktopAPI.injectDependencies(null, null, spaceProviders, null, eventConsumer, null, null, null, null, null,
            null, null);
        SpaceAPI.getSpaceProviders();
        var expected = MAPPER.createObjectNode();
        expected.put("error", exception.getMessage());
        verify(eventConsumer).accept("SpaceProvidersChangedEvent", expected);
    }

    @Test
    void testConnectSpaceProvider() { // TODO: NXT-2049
//        var connectedSpaceProvider = mock(SpaceProvider.class);
//        when(connectedSpaceProvider.getId()).thenReturn("connected_provider");
//        when(connectedSpaceProvider.getName()).thenReturn("Connected Provider");
//        when(connectedSpaceProvider.getConnection(false)).thenReturn(Optional.of(mock(SpaceProviderConnection.class)));
//
//        var disconnectedSpaceProvider = mock(SpaceProvider.class);
//        when(disconnectedSpaceProvider.getId()).thenReturn("disconnected_provider");
//        when(disconnectedSpaceProvider.getName()).thenReturn("Disconnected Provider");
//        when(disconnectedSpaceProvider.getConnection(false)).thenReturn(Optional.empty());
//        var connection = mock(SpaceProviderConnection.class);
//        when(connection.getUsername()).thenReturn("blub");
//        when(disconnectedSpaceProvider.getConnection(true)).thenReturn(Optional.of(connection));
//
//        var spaceProviders = mock(SpaceProviders.class);
//        var providersMap = new LinkedHashMap<String, SpaceProvider>();
//        providersMap.put("1", connectedSpaceProvider);
//        providersMap.put("2", disconnectedSpaceProvider);
//        when(spaceProviders.getProvidersMap()).thenReturn(providersMap);
//
//        DesktopAPI.injectDependencies(null, null, spaceProviders, null, null, null);
//
//        assertThat(SpaceAPI.connectSpaceProvider("1")).isNull();
//        assertThat(SpaceAPI.connectSpaceProvider("2")).isEqualTo("""
//                {
//                  "name" : "blub"
//                }""");
//
    }

    @Test
    void testDisconnectedSpaceProvider() {
        var connectedSpaceProvider = mock(SpaceProvider.class);
        when(connectedSpaceProvider.getId()).thenReturn("connected_provider");
        when(connectedSpaceProvider.getName()).thenReturn("Connected Provider");
        var connection = mock(SpaceProviderConnection.class);
        when(connectedSpaceProvider.getConnection(false)).thenReturn(Optional.of(connection));

        var spaceProviders = mock(SpaceProviders.class);
        when(spaceProviders.getProvidersMap()).thenReturn(Map.of("1", connectedSpaceProvider));

        DesktopAPI.injectDependencies(null, null, spaceProviders, null, null, null, null, null, null, null, null, null);
        SpaceAPI.disconnectSpaceProvider("1");

        verify(connection).disconnect();
    }

    @Test
    void testOpenInHub() {
        var connectedSpaceProvider = mock(SpaceProvider.class);
        when(connectedSpaceProvider.getId()).thenReturn("connected_provider");
        when(connectedSpaceProvider.getName()).thenReturn("Connected Provider");
        var connection = mock(SpaceProviderConnection.class);
        when(connection.getUsername()).thenReturn("username");
        when(connectedSpaceProvider.getConnection(true)).thenReturn(Optional.of(connection));
        when(connectedSpaceProvider.getServerAddress()).thenReturn(Optional.of("test.test"));

        var space = mock(Space.class);
        when(space.getName()).thenReturn("spaceName");
        when(space.getItemName("*itemId")).thenReturn("itemName");
        when(connectedSpaceProvider.getSpace("spaceId")).thenReturn(space);

        assertThat(ClassicAPBuildHubURL.getHubURL("*itemId", connectedSpaceProvider, space))
            .isEqualTo("test.test/username/spaces/spaceName/latest/itemName~itemId/");

    }

    @AfterEach
    void disposeDesktopAPIDependencies() {
        DesktopAPI.disposeDependencies();
    }

}
