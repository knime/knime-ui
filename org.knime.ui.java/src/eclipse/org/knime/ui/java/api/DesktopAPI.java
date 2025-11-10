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
 *   Jan 30, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.CompletableFuture;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

import org.eclipse.swt.widgets.Display;
import org.knime.core.node.NodeLogger;
import org.knime.gateway.api.service.GatewayException;
import org.knime.ui.java.util.ProgressReporter;
import org.knime.gateway.api.webui.entity.GatewayProblemDescriptionEnt;
import org.knime.gateway.api.webui.service.util.MutableServiceCallException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.LoggedOutException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NetworkException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.ServiceCallException;
import org.knime.gateway.api.webui.util.EntityFactory;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.ToastService;
import org.knime.gateway.impl.webui.UpdateStateProvider;
import org.knime.gateway.impl.webui.WorkflowMiddleware;
import org.knime.gateway.impl.webui.repo.NodeRepository;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.product.rcp.intro.WelcomeAPEndpoint;
import org.knime.ui.java.profile.UserProfile;
import org.knime.ui.java.util.ExampleProjects;
import org.knime.ui.java.util.MostRecentlyUsedProjects;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Utility methods for the desktop API; i.e. API that is only available within the desktop AP.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class DesktopAPI {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(DesktopAPI.class);

    private static final String REMOTE_DEBUGGING_PORT_PROP = "chromium.remote_debugging_port";

    private static boolean isRemoteDebuggingPortSet() {
        return System.getProperty(REMOTE_DEBUGGING_PORT_PROP) != null;
    }

    private static final List<Class<?>> CONTRIBUTING_CLASSES = List.of( //
        NodeAPI.class, //
        PortAPI.class, //
        ProjectAPI.class, //
        SpaceAPI.class, //
        ImportAPI.class, //
        ExportAPI.class, //
        EclipseUIAPI.class, //
        ChatAPI.class, //
        ComponentAPI.class, //
        EquoChromiumAPI.class, //
        CustomizationAPI.class, //
        HomePageAPI.class, //
        UserAPI.class //
    );

    // API endpoints which are only being registered when the AP is run for testing purposes.
    private static final List<Class<?>> CONTRIBUTING_CLASSES_FOR_TESTING = List.of( //
        TestingAPI.class //
    );

    /**
     * @return A {@link SpaceProviders} instance for the Desktop-API context.
     * @throws NoSuchElementException If no such service dependency is set
     */
    static SpaceProviders getSpaceProviders() {
        final var spaceProvidersManager = getDeps(SpaceProvidersManager.class);
        if (spaceProvidersManager == null) {
            throw new NoSuchElementException("Available space providers could not be determined.");
        }
        return spaceProvidersManager.getSpaceProviders(SpaceProvidersManager.Key.defaultKey());
    }

    /**
     * @throws NoSuchElementException If the space provider could not be found
     */
    static SpaceProvider getSpaceProvider(final String spaceProviderId) {
        var spaceProvider = getSpaceProviders().getSpaceProvider(spaceProviderId);
        if (spaceProvider == null) {
            throw new NoSuchElementException("Space provider '" + spaceProviderId + "' not found.");
        }
        return spaceProvider;
    }

    /**
     * @throws ServiceCallException
     * @throws LoggedOutException
     * @throws NetworkException
     * @throws NoSuchElementException If the space provider or space could not be found
     */
    static Space getSpace(final String spaceProviderId, final String spaceId)
        throws NetworkException, LoggedOutException, ServiceCallException {
        final var spaceProvider = getSpaceProvider(spaceProviderId);
        try {
            return spaceProvider.getSpace(spaceId);
        } catch (final MutableServiceCallException e) {
            throw e.toGatewayException("Failed to fetch space");
        }
    }

    private record APIMethod(Method method, boolean runInUIThread) {
    }

    private static final List<APIMethod> METHODS = collectMethods();

    private static final Map<Class<?>, Object> DEPENDENCIES = new HashMap<>();

    private static final String DESKTOP_API_FUNCTION_RESULT_EVENT_NAME = "DesktopAPIFunctionResultEvent";

    /**
     * ObjectMapper to create event objects that can be sent to the UI.
     */
    public static final ObjectMapper MAPPER = new ObjectMapper();

    private DesktopAPI() {
        // utility
    }

    /**
     * Iterates through the available desktop API functions.
     *
     * @param functionCaller a consumer that receives the function name and the function itself and takes care of
     *            calling them. The function will throw a {@link IllegalStateException} if the function-call fails for
     *            unexpected reasons.
     */
    public static void forEachAPIFunction(final BiConsumer<String, Consumer<Object[]>> functionCaller) {
        for (final APIMethod apiMethod : METHODS) {
            final var method = apiMethod.method;
            functionCaller.accept( //
                method.getName(), //
                apiMethod.runInUIThread //
                    ? (args -> Display.getDefault().asyncExec(() -> invoke(method, args))) //
                    : (args -> CompletableFuture.runAsync(() -> invoke(method, args))) //
            );
        }
    }

    private static void invoke(final Method method, final Object[] args) {
        final var event = MAPPER.createObjectNode().put("name", method.getName());
        try {
            event.set("result", MAPPER.valueToTree(invokeMethod(method, args)));
        } catch (GatewayException e) {
            LOGGER.debug("Desktop API function call failed with `GatewayException` for '" + method.getName() + "'", e);
            event.put("error", problemToString(EntityFactory.Misc.buildKnownProblemDescriptionEnt(e)));
        } catch (Throwable e) {
            LOGGER.debug("Desktop API function call failed for '" + method.getName() + "'", e);
            event.put("error", problemToString(EntityFactory.Misc.buildUnknownProblemDescriptionEnt(e)));
        }

        final var eventConsumer = getDeps(EventConsumer.class);
        if (eventConsumer != null) {
            // eventConsumer is null in case of the 'switchToJavaUI' function
            // because it clears all the deps when invoked
            eventConsumer.accept(DESKTOP_API_FUNCTION_RESULT_EVENT_NAME, event);
        }
    }

    private static String problemToString(final GatewayProblemDescriptionEnt problemDesc) {
        try {
            // we have to use this mapper because it contains special mixins for Gateway entities
            return ObjectMapperUtil.getInstance().getObjectMapper().writeValueAsString(problemDesc);
        } catch (final JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    @SuppressWarnings("java:S112") // generic exception reasonable here
    private static Object invokeMethod(final Method m, final Object[] args) throws Throwable {
        var name = m.getName();
        try {
            Object res;
            if (m.getParameterCount() == 1 && m.getParameterTypes()[0].equals(Object[].class)) {
                res = m.invoke(null, new Object[]{args}); // NOSONAR
            } else {
                res = m.invoke(null, args);
            }
            LOGGER.debug("Desktop API function successfully called: " + name);
            return res;
        } catch (final IllegalAccessException | IllegalArgumentException | InvocationTargetException ex) {
            throw ex instanceof InvocationTargetException invocationTargetException
                ? invocationTargetException.getTargetException() : ex;
        }
    }

    /**
     * Initializes the desktop API with dependencies for some desktop API functions.
     *
     * @param projectManager
     * @param workflowMiddleware
     * @param appStateUpdater
     * @param eventConsumer
     * @param spaceProvidersManager
     * @param updateStateProvider optional, can be {@code null}
     * @param nodeRepo
     * @param mruProjects
     * @param toastService
     * @param localSpace
     * @param welcomeAPEndpoint
     * @param exampleProjects
     * @param userProfile
     * @param progressReporter
     * @throws IllegalStateException if the dependencies have been already injected
     */
    @SuppressWarnings({"java:S107", "JavadocDeclaration", "javadoc"}) // Parameter count
    public static void injectDependencies( //
        final ProjectManager projectManager, //
        final WorkflowMiddleware workflowMiddleware, //
        final AppStateUpdater appStateUpdater, //
        final EventConsumer eventConsumer, //
        final SpaceProvidersManager spaceProvidersManager, //
        final UpdateStateProvider updateStateProvider, //
        final NodeRepository nodeRepo, //
        final MostRecentlyUsedProjects mruProjects, //
        final ToastService toastService, //
        final LocalSpace localSpace, //
        final WelcomeAPEndpoint welcomeAPEndpoint, //
        final ExampleProjects exampleProjects, //
        final UserProfile userProfile, //
        final ProgressReporter progressReporter) {
        if (areDependenciesInjected()) {
            throw new IllegalStateException("Desktop API dependencies are already injected");
        }
        injectDependency(projectManager);
        injectDependency(appStateUpdater);
        injectDependency(spaceProvidersManager);
        injectDependency(eventConsumer);
        DEPENDENCIES.put(WorkflowMiddleware.class, workflowMiddleware);
        DEPENDENCIES.put(ToastService.class, toastService);
        DEPENDENCIES.put(NodeRepository.class, nodeRepo);
        if (updateStateProvider != null) {
            DEPENDENCIES.put(UpdateStateProvider.class, updateStateProvider);
        }
        injectDependency(mruProjects);
        injectDependency(localSpace);
        DEPENDENCIES.put(WelcomeAPEndpoint.class, welcomeAPEndpoint);
        injectDependency(exampleProjects);
        injectDependency(userProfile);
        injectDependency(progressReporter);
    }

    static void injectDependency(final UserProfile userProfile) {
        DEPENDENCIES.put(UserProfile.class, userProfile);
    }

    /**
     * Add individual dependency for testing purposes.
     *
     * @param eventConsumer
     */
    static void injectDependency(final EventConsumer eventConsumer) {
        DEPENDENCIES.put(EventConsumer.class, eventConsumer);
    }

    /**
     * Add individual dependency for testing purposes.
     *
     * @param localSpace
     */
    static void injectDependency(final LocalSpace localSpace) {
        DEPENDENCIES.put(LocalSpace.class, localSpace);
    }

    /**
     * Add individual dependency for testing purposes.
     *
     * @param projectManager
     */
    static void injectDependency(final ProjectManager projectManager) {
        DEPENDENCIES.put(ProjectManager.class, projectManager);
    }

    /**
     * Add individual dependency for testing purposes.
     *
     * @param appStateUpdater
     */
    static void injectDependency(final AppStateUpdater appStateUpdater) {
        DEPENDENCIES.put(AppStateUpdater.class, appStateUpdater);
    }

    /**
     * Add individual dependency for testing purposes.
     *
     * @param spaceProvidersManager
     */
    static void injectDependency(final SpaceProvidersManager spaceProvidersManager) {
        DEPENDENCIES.put(SpaceProvidersManager.class, spaceProvidersManager);
    }

    /**
     * Add individual dependency for testing purposes.
     *
     * @param mruProjects
     */
    static void injectDependency(final MostRecentlyUsedProjects mruProjects) {
        DEPENDENCIES.put(MostRecentlyUsedProjects.class, mruProjects);
    }

    /**
     * Add individual dependency for testing purposes.
     *
     * @param exampleProjects
     */
    static void injectDependency(final ExampleProjects exampleProjects) {
        DEPENDENCIES.put(ExampleProjects.class, exampleProjects);
    }

    static void injectDependency(final ProgressReporter progressReporter) {
        DEPENDENCIES.put(ProgressReporter.class, progressReporter);
    }

    /**
     * @return whether dependencies already have been injected via {@code injectDependencies}.
     */
    public static boolean areDependenciesInjected() {
        return !DEPENDENCIES.isEmpty();
    }

    /**
     * Cleans-up the injected dependencies in case the desktop API is not used anymore.
     */
    public static void disposeDependencies() {
        DEPENDENCIES.clear();
    }

    private static List<APIMethod> collectMethods() {
        var res = new ArrayList<APIMethod>();
        collectMethods(CONTRIBUTING_CLASSES, res);
        if (isRemoteDebuggingPortSet()) {
            collectMethods(CONTRIBUTING_CLASSES_FOR_TESTING, res);
        }
        return res;
    }

    private static void collectMethods(final List<Class<?>> classes, final List<APIMethod> res) {
        for (Class<?> clazz : classes) {
            for (Method m : clazz.getDeclaredMethods()) {
                if (m.isAnnotationPresent(API.class)) {
                    checkExceptions(m);
                    var apiAnno = m.getAnnotation(API.class);
                    res.add(new APIMethod(m, apiAnno.runInUIThread()));
                }
            }
        }
    }

    private static void checkExceptions(final Method m) {
        for (final var exClass : m.getExceptionTypes()) {
            if (exClass != GatewayException.class) {
                LOGGER.coding(
                    () -> "Unexpected `throws` declaration for `%s`: '%s".formatted(m, exClass.getSimpleName()));
            }
        }
    }

    /**
     * Gives access to registered dependency-instances (see {@code injectDependencies}).
     *
     * @param <T> The type of the dependency
     * @param query The class/type of dependency to obtain
     * @return the dependency-instance or {@code null} if there is none for the given class
     */
    @SuppressWarnings("unchecked")
    static <T> T getDeps(final Class<T> query) {
        return (T)DEPENDENCIES.get(query);
    }

}
