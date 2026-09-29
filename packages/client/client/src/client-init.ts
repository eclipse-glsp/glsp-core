/********************************************************************************
 * Copyright (c) 2021-2026 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import {
    asArray,
    BindingContext,
    configureViewerOptions,
    ContainerConfiguration,
    FeatureDefinition,
    FeatureKey,
    FeatureModule,
    FeatureResolutionError,
    getFeatureId,
    isFeatureModule,
    loadFeatures,
    resolveFeatures,
    ViewerOptions
} from '@eclipse-glsp/sprotty';
import { Container } from 'inversify';
import { IDiagramOptions } from './base/model/diagram-loader';
import { DEFAULT_FEATURES } from './client-feature-definitions';
import { GLSPClientFeature } from './client-feature-keys';
import { TYPES } from './types';

/**
 * Wraps the {@link configureDiagramOptions} utility function in a module. Adopters can either include this
 * module into the container {@link ModuleConfiguration} or configure the container after its creation
 * (e.g. using the {@link configureDiagramOptions} utility function).
 * @param diagramOptions The diagram instance specific configuration options
 * @param viewerOptions Optional {@link ViewerOptions} that should be configured
 * @returns The corresponding {@link FeatureModule}
 */
export function createDiagramOptionsModule(diagramOptions: IDiagramOptions, viewerOptions?: Partial<ViewerOptions>): FeatureModule {
    return new FeatureModule((bind, unbind, isBound, rebind) =>
        configureDiagramOptions({ bind, unbind, isBound, rebind }, diagramOptions, viewerOptions)
    );
}

/**
 * Utility function to bind the diagram instance specific configuration options.
 * In addition to binding the {@link IDiagramOptions} this function also overrides the
 * {@link ViewerOptions} to match the given client id.
 * @param context The binding context
 * @param diagramOptions The {@link IDiagramOptions} that should be bound
 * @param viewerOptions Optional {@link ViewerOptions} that should be configured
 */
export function configureDiagramOptions(
    context: BindingContext,
    diagramOptions: IDiagramOptions,
    viewerOptions?: Partial<ViewerOptions>
): void {
    configureViewerOptions(context, {
        baseDiv: diagramOptions.clientId,
        hiddenDiv: diagramOptions.clientId + '_hidden',
        zoomLimits: { min: 0.1, max: 20 },
        ...viewerOptions
    });
    context.bind(TYPES.IDiagramOptions).toConstantValue(diagramOptions);
}

/**
 * Initializes a GLSP Diagram container with the GLSP {@link DEFAULT_FEATURES} and the specified custom configuration.
 * Additional modules and features can be passed as direct arguments or as part of a {@link ModuleConfiguration}.
 * ```typescript
 * const container = await initializeDiagramContainer(new Container(), myModule1, myModule2);
 * // or
 * const container = await initializeDiagramContainer(new Container(), { add: [myModule1, myFeatureDef] });
 * ```
 * The configuration is resolved before any feature is loaded. Default features are loaded lazily, i.e. the implementation
 * of a removed feature is never imported. You can customize the default features in two ways.
 *
 * First, you can remove or replace default features by `GLSPClientFeature` key, without importing their implementation:
 *
 * ```typescript
 * await initializeDiagramContainer(container, {
 *     remove: GLSPClientFeature.ToolPalette,
 *     replace: defineFeature(GLSPClientFeature.SourceModelWatcher, () => import('./my-watcher-module').then(m => m.myWatcherModule))
 * });
 * ```
 *
 * Second, you can unbind or rebind implementations that are originally bound in one of the default modules.
 *
 * ```typescript
 * rebind(NavigationTargetResolver).to(MyNavigationTargetResolver);
 * ```
 * @param container The container that should be initialized
 * @param containerConfigurations
 *          Custom modules to be loaded in addition to the default modules and/or default modules that should be excluded.
 * The `GLSPClientFeature.Default` feature is required by every diagram container and always loaded first. Therefore, a
 * replacement of the default feature must not declare any dependencies (`requires` or `extends`).
 * @throws A `FeatureResolutionError` if the configuration is invalid (e.g. the `GLSPClientFeature.Default` feature is
 *          removed or has dependencies, a required feature is missing or a dependency cycle is configured).
 * @returns The initialized container.
 */
export async function initializeDiagramContainer(
    container: Container,
    ...containerConfigurations: ContainerConfiguration
): Promise<Container> {
    const features = resolveFeatures(...DEFAULT_FEATURES, ...containerConfigurations);
    const defaultId = FeatureKey.toId(GLSPClientFeature.Default);
    const defaultIndex = features.findIndex(feature => getFeatureId(feature) === defaultId);
    if (defaultIndex < 0) {
        throw new FeatureResolutionError(
            'missing',
            `Could not initialize diagram container. The '${GLSPClientFeature.Default}' feature is required by every diagram container.`
        );
    }
    const defaultFeature = features[defaultIndex];
    const hasDependencies = FeatureDefinition.is(defaultFeature)
        ? !!(defaultFeature.requires?.length || defaultFeature.extends?.length)
        : isFeatureModule(defaultFeature) && asArray(defaultFeature.requires ?? []).length > 0;
    if (hasDependencies) {
        // Moving the default feature to the front would load it before its dependencies
        throw new FeatureResolutionError(
            'invalid',
            `Could not initialize diagram container. The '${GLSPClientFeature.Default}' feature is always loaded first and must not have dependencies.`
        );
    }
    // The default module (or a replacement with the same key) has to be loaded first, even if it was removed and added again
    features.unshift(...features.splice(defaultIndex, 1));
    await container.load(...(await loadFeatures(features)));
    return container;
}
