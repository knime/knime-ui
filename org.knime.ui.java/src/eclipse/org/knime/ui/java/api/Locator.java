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
 */
package org.knime.ui.java.api;

import java.util.List;
import java.util.Objects;

import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;

/**
 * Locate things in the Space Providers / Spaces / Items system.
 */
final class Locator {

    private Locator() {
        // Static helper class
    }

    /**
     * Locates an ordered collection of items in the same Space. This does not imply that they have the same parent
     * item.
     */
    public static final class Siblings extends Space {
        private final List<String> m_itemIds;

        public Siblings(final String providerId, final String spaceId, final List<String> itemIds) {
            super(providerId, spaceId);
            this.m_itemIds = itemIds;
        }

        /**
         * @return The item IDs
         */
        public List<String> itemIds() {
            return m_itemIds;
        }

        @Override
        public boolean equals(final Object o) {
            if (this == o) {
                return true;
            }
            if (o == null || getClass() != o.getClass()) {
                return false;
            }
            Siblings that = (Siblings)o;
            return new EqualsBuilder().appendSuper(super.equals(o)).append(m_itemIds, that.m_itemIds).isEquals();
        }

        @Override
        public int hashCode() {
            return new HashCodeBuilder(17, 37).appendSuper(super.hashCode()).append(m_itemIds).toHashCode();
        }
    }

    /**
     * A valid destination for a copy or move operation
     */
    public sealed interface Destination permits Space, Item {
        String itemId();

        static Destination of(final String providerId, final String spaceId, final String itemId) {
            if (org.knime.gateway.impl.webui.spaces.Space.ROOT_ITEM_ID.equals(itemId)) {
                return new Space(providerId, spaceId);
            } else {
                return new Item(providerId, spaceId, itemId);
            }
        }

        org.knime.gateway.impl.webui.spaces.Space space();

        SpaceProvider provider();

        boolean isHub();

        boolean isLocal();

    }

    /**
     * Locates a space, i.e. provider ID and space ID.
     */
    @SuppressWarnings({"java:S6217"})
    public static sealed class Space implements Destination permits Item, Siblings {

        private final String m_providerId;

        private final String m_spaceId;

        public Space(final String providerId, final String spaceId) {
            this.m_providerId = providerId;
            this.m_spaceId = spaceId;
        }

        /**
         * @return The {@link SpaceProvider} instance (requires
         *         {@link org.knime.gateway.impl.webui.spaces.SpaceProviders} dependency).
         */
        @Override
        public SpaceProvider provider() {
            return DesktopAPI.getSpaceProvider(this.providerId());
        }

        /**
         * @return The {@link org.knime.gateway.impl.webui.spaces.Space} instance (requires
         *         {@link org.knime.gateway.impl.webui.spaces.SpaceProviders} dependency).
         */
        @Override
        public org.knime.gateway.impl.webui.spaces.Space space() {
            return this.provider().getSpace(this.spaceId());
        }

        /**
         * @return Whether this is a local space (requires {@link org.knime.gateway.impl.webui.spaces.SpaceProviders}
         *         dependency).
         */
        @Override
        public boolean isLocal() {
            return provider().getType() == SpaceProviderEnt.TypeEnum.LOCAL;
        }

        /**
         * @return Whether this is a hub space (requires {@link org.knime.gateway.impl.webui.spaces.SpaceProviders}
         *         dependency).
         */
        @Override
        public boolean isHub() {
            return provider().getType() == SpaceProviderEnt.TypeEnum.HUB;
        }

        /**
         * @return The ID of the space provider (field access)
         */
        public String providerId() {
            return m_providerId;
        }

        /**
         * @return The ID of the space (field access)
         */
        public String spaceId() {
            return m_spaceId;
        }

        @Override
        public boolean equals(final Object obj) {
            if (obj == this) {
                return true;
            }
            if (obj == null || obj.getClass() != this.getClass()) {
                return false;
            }
            var that = (Space)obj;
            return Objects.equals(this.m_providerId, that.m_providerId)
                && Objects.equals(this.m_spaceId, that.m_spaceId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(m_providerId, m_spaceId);
        }

        @Override
        public String toString() {
            return "SpaceLocator[" + "spaceProviderId=" + m_providerId + ", " + "spaceId=" + m_spaceId + ']';
        }

        @Override
        public String itemId() {
            return org.knime.gateway.impl.webui.spaces.Space.ROOT_ITEM_ID;
        }
    }

    /**
     * Locates a single item in a space of a provider.
     */
    public static final class Item extends Space implements Destination {

        private final String m_itemId;

        /**
         * @param providerId ID of the space provider containing the item
         * @param spaceId ID of the space in provider with ID {@code spaceProviderId} containing the item
         * @param itemId ID of the item contained in space with ID {@code spaceId}
         */
        public Item(final String providerId, final String spaceId, final String itemId) {
            super(providerId, spaceId);
            this.m_itemId = itemId;
        }

        /**
         * @return The item ID (field access)
         */
        @Override
        public String itemId() {
            return m_itemId;
        }

        @Override
        public boolean equals(final Object o) {
            if (this == o) {
                return true;
            }
            if ((o == null) || (getClass() != o.getClass())) {
                return false;
            }
            Item that = (Item)o;
            return new EqualsBuilder().appendSuper(super.equals(o)).append(m_itemId, that.m_itemId).isEquals();
        }

        @Override
        public int hashCode() {
            return new HashCodeBuilder(17, 37).appendSuper(super.hashCode()).append(m_itemId).toHashCode();
        }
    }
}
