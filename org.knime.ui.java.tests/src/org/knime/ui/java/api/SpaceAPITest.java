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
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvider.SpaceProviderConnection;
import org.knime.gateway.impl.webui.spaces.SpaceProviderFactory;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Tests methods in {@link SpaceAPI}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class SpaceAPITest {

    @Test
    void testConnectSpaceProvider() throws JsonProcessingException {
        final var alreadyConnected = mock(SpaceProvider.class);
        when(alreadyConnected.getId()).thenReturn("1");
        when(alreadyConnected.getName()).thenReturn("Connected Provider");
        when(alreadyConnected.getType()).thenReturn(TypeEnum.HUB);
        when(alreadyConnected.getConnection(false)).thenReturn(Optional.of(mock(SpaceProviderConnection.class)));

        final var connectable = mock(SpaceProvider.class);
        when(connectable.getId()).thenReturn("2");
        when(connectable.getName()).thenReturn("Connectable Provider");
        when(connectable.getType()).thenReturn(TypeEnum.HUB);
        when(connectable.getConnection(false)).thenReturn(Optional.empty());
        var newConnection = mock(SpaceProviderConnection.class);
        when(newConnection.getUsername()).thenReturn("blub");
        when(connectable.getConnection(true)).thenReturn(Optional.of(newConnection));

        final var notConnectable = mock(SpaceProvider.class);
        when(notConnectable.getId()).thenReturn("3");
        when(notConnectable.getName()).thenReturn("Not Connectable Provider");
        when(notConnectable.getType()).thenReturn(TypeEnum.HUB);
        when(notConnectable.getConnection(anyBoolean())).thenReturn(Optional.empty());

        DesktopAPI.injectDependency(createSpaceProvidersManager(alreadyConnected, connectable, notConnectable));

        ObjectMapper mapper = new ObjectMapper();

        // already connected, connecting does nothing
        assertJsonEqual(mapper, SpaceAPI.connectSpaceProvider("1"), """
            {
                "id":"1",
                "name":"Connected Provider",
                "type":"HUB",
                "connected":true,
                "connectionMode":"AUTHENTICATED"
            }""");

        // disconnected, connection is established in the call
        assertJsonEqual(mapper, SpaceAPI.connectSpaceProvider("2"), """
            {
                "id":"2",
                "name":"Connectable Provider",
                "type":"HUB",
                "connected":true,
                "connectionMode":"AUTHENTICATED",
                "username":"blub"
            }""");

        // disconnected and can't be connected
        assertJsonEqual(mapper, SpaceAPI.connectSpaceProvider("3"), """
            {
                "id":"3",
                "name":"Not Connectable Provider",
                "type":"HUB",
                "connected":false,
                "connectionMode":"AUTHENTICATED"
            }""");
    }

    private static void assertJsonEqual(final ObjectMapper mapper, final String actualJson, final String expectedJson)
        throws JsonProcessingException {
        assertThat(mapper.readTree(actualJson)).isEqualTo(mapper.readTree(expectedJson));
    }

    @Test
    void testDisconnectedSpaceProvider() {
        var connectedSpaceProvider = mock(SpaceProvider.class);
        when(connectedSpaceProvider.getId()).thenReturn("1");
        when(connectedSpaceProvider.getName()).thenReturn("Connected Provider");
        var connection = mock(SpaceProviderConnection.class);
        when(connectedSpaceProvider.getConnection(false)).thenReturn(Optional.of(connection));

        DesktopAPI.injectDependency(createSpaceProvidersManager(connectedSpaceProvider));

        SpaceAPI.disconnectSpaceProvider("1");
        verify(connection).disconnect();
    }

    static SpaceProvidersManager createSpaceProvidersManager(final SpaceProvider... spaceProviders) {
        var spaceProvidersFactory = mock(SpaceProviderFactory.class);
        var providers = List.of(spaceProviders);
        when(spaceProvidersFactory.createSpaceProviders()).thenReturn(providers);
        var res = new SpaceProvidersManager(id -> {
        }, null, List.of(spaceProvidersFactory));
        res.update();
        return res;
    }

    @AfterEach
    void disposeDesktopAPIDependencies() {
        DesktopAPI.disposeDependencies();
    }

}
