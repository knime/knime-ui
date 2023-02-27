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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
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
    void testGetSpaceProviders() {
        var localSpaceProvider = mock(SpaceProvider.class);
        when(localSpaceProvider.getId()).thenReturn("local_provider");
        when(localSpaceProvider.getName()).thenReturn("Local Provider");
        when(localSpaceProvider.isLocal()).thenReturn(true);
        var connectedSpaceProvider = mock(SpaceProvider.class);
        when(connectedSpaceProvider.getId()).thenReturn("connected_provider");
        when(connectedSpaceProvider.getName()).thenReturn("Connected Provider");
        when(connectedSpaceProvider.isLocal()).thenReturn(false);
        when(connectedSpaceProvider.getConnection(false)).thenReturn(Optional.of(mock(SpaceProviderConnection.class)));

        var spaceProviders = mock(SpaceProviders.class);
        var providersMap = new LinkedHashMap<String, SpaceProvider>();
        providersMap.put("1", localSpaceProvider);
        providersMap.put("2", connectedSpaceProvider);
        when(spaceProviders.getProvidersMap()).thenReturn(providersMap);

        DesktopAPI.injectDependencies(null, null, spaceProviders, null, null);

        var spaceProvidersJson = SpaceAPI.getSpaceProviders();
        assertThat(spaceProvidersJson).isEqualTo("""
                {
                  "local_provider" : {
                    "id" : "local_provider",
                    "name" : "Local Provider",
                    "connected" : true,
                    "connectionMode" : "AUTOMATIC",
                    "local" : true
                  },
                  "connected_provider" : {
                    "id" : "connected_provider",
                    "name" : "Connected Provider",
                    "connected" : true,
                    "connectionMode" : "AUTHENTICATED",
                    "local" : false
                  }
                }""");
    }

    @Test
    void testConnectSpaceProvider() {
        var connectedSpaceProvider = mock(SpaceProvider.class);
        when(connectedSpaceProvider.getId()).thenReturn("connected_provider");
        when(connectedSpaceProvider.getName()).thenReturn("Connected Provider");
        when(connectedSpaceProvider.getConnection(false)).thenReturn(Optional.of(mock(SpaceProviderConnection.class)));

        var disconnectedSpaceProvider = mock(SpaceProvider.class);
        when(disconnectedSpaceProvider.getId()).thenReturn("disconnected_provider");
        when(disconnectedSpaceProvider.getName()).thenReturn("Disconnected Provider");
        when(disconnectedSpaceProvider.getConnection(false)).thenReturn(Optional.empty());
        var connection = mock(SpaceProviderConnection.class);
        when(connection.getUsername()).thenReturn("blub");
        when(disconnectedSpaceProvider.getConnection(true)).thenReturn(Optional.of(connection));

        var spaceProviders = mock(SpaceProviders.class);
        var providersMap = new LinkedHashMap<String, SpaceProvider>();
        providersMap.put("1", connectedSpaceProvider);
        providersMap.put("2", disconnectedSpaceProvider);
        when(spaceProviders.getProvidersMap()).thenReturn(providersMap);

        DesktopAPI.injectDependencies(null, null, spaceProviders, null, null);

        assertThat(SpaceAPI.connectSpaceProvider("1")).isNull();
        assertThat(SpaceAPI.connectSpaceProvider("2")).isEqualTo("""
                {
                  "name" : "blub"
                }""");

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

        DesktopAPI.injectDependencies(null, null, spaceProviders, null, null);
        SpaceAPI.disconnectSpaceProvider("1");

        verify(connection).disconnect();
    }

}
