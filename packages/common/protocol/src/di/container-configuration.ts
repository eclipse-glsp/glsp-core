/********************************************************************************
 * Copyright (c) 2023-2026 EclipseSource and others.
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

import { Container, ContainerModule } from 'inversify';
import { MaybeArray, asArray, distinctAdd } from '../utils/array-util';
import { MaybePromise, hasFunctionProp, hasNumberProp } from '../utils/type-util';
import { FeatureDefinition } from './feature-definition';
import { FeatureKey } from '../features/feature-key';
import { FeatureModule, isFeatureModule } from './feature-module';

/**
 * Initializes a container with the given {@link ContainerConfiguration}. The container configuration
 * consists of the set of {@link ContainerModule}s that should be loaded in the container.
 * In addition, for more fine-grained control {@link ModuleConfiguration}s can be passed as part fo the container configuration
 * Module loading is distinct,this means each module will only get loaded once even if it is configured multiple times.
 *
 * {@link FeatureDefinition}s are loaded synchronously, i.e. their factory must not return a promise.
 * Use {@link initializeContainerAsync} for lazily loaded features.
 * @param containerConfigurations
 *          Custom modules to be loaded in addition to the default modules and/or default modules that should be excluded.
 * @returns The initialized container.
 */
export function initializeContainer(container: Container, ...containerConfigurations: ContainerConfiguration): Container {
    const modules = resolveContainerConfiguration(...containerConfigurations);
    container.load(...modules);
    return container;
}

/**
 * Initializes a container with the given {@link ContainerConfiguration}, loading lazily defined features.
 * The configuration is resolved first (see {@link resolveFeatures}), so only the factories of the features that are part of
 * the resolved configuration are invoked (see {@link loadFeatures}).
 * @param containerConfigurations The container configurations to resolve and load.
 * @returns The initialized container.
 */
export async function initializeContainerAsync(
    container: Container,
    ...containerConfigurations: ContainerConfiguration
): Promise<Container> {
    const modules = await loadFeatures(resolveFeatures(...containerConfigurations));
    await container.load(...modules);
    return container;
}

/**
 * Processes the given container configurations and returns the corresponding set of {@link ContainerModule}s.
 * The configuration is resolved with {@link resolveFeatures}, {@link FeatureDefinition}s are loaded synchronously.
 * @param containerConfigurations The container configurations to resolve
 * @throws A {@link FeatureResolutionError} if the configuration is invalid or an error if a feature definition loads asynchronously.
 * @returns an Array of resolved container modules
 */
export function resolveContainerConfiguration(...containerConfigurations: ContainerConfiguration): ContainerModule[] {
    const modules = resolveFeatures(...containerConfigurations).map(entry => {
        if (!FeatureDefinition.is(entry)) {
            return entry;
        }
        const module = entry.load();
        if (MaybePromise.isPromise(module)) {
            throw new Error(
                `Could not load feature '${entry.id}' synchronously. Use an asynchronous container initialization (e.g. 'initializeContainerAsync').`
            );
        }
        return validateFeatureModule(entry, module);
    });
    return deduplicateLoadedModules(modules);
}

/**
 * An entry of a resolved container configuration: either a lazily loaded {@link FeatureDefinition} or a {@link ContainerModule}.
 */
export type ResolvedFeature = FeatureDefinition | ContainerModule;

/**
 * Resolves the given container configurations without loading any lazily defined feature.
 *
 * Container configurations are processed in the order they are passed. For each {@link ModuleConfiguration}, `remove`
 * is applied before `add` and `replace`. If a feature is removed, it can be added again in a later configuration.
 * In case of `replace` configurations that affect the same feature id the last configuration wins.
 * Features are matched by feature id: a {@link FeatureKey}, a {@link FeatureDefinition} and a {@link FeatureModule}
 * whose feature id was created with {@link FeatureKey.toId} refer to the same feature. Plain container modules are
 * matched by identity.
 *
 * After processing the configurations, the result is validated and ordered:
 * 1. Features whose `extends` dependencies are not part of the result are dropped (transitively).
 * 2. A missing `requires` dependency, a dependency cycle or a duplicate feature id fails with a {@link FeatureResolutionError}.
 * 3. The result keeps the configured order, except that dependencies are moved before their dependents.
 *
 * The `requires` of a {@link FeatureModule} are only used for ordering. A module whose requirements are missing is
 * not dropped at resolution time but skipped when it is loaded into the container (see {@link FeatureModule.configure}).
 * @param containerConfigurations The container configurations to resolve
 * @returns The resolved features in load order.
 */
export function resolveFeatures(...containerConfigurations: ContainerConfiguration): ResolvedFeature[] {
    const features: ResolvedFeature[] = [];
    containerConfigurations.forEach(config => {
        checkFeatureDefinition(config);
        if (isContainerModule(config) || FeatureDefinition.is(config)) {
            distinctAdd(features, config);
            return;
        }
        if (config.remove) {
            removeFeatures(features, asArray(config.remove));
        }
        if (config.add) {
            const additions = asArray(config.add);
            additions.forEach(checkFeatureDefinition);
            distinctAdd(features, ...additions);
        }
        if (config.replace) {
            const replacements = asArray(config.replace);
            replacements.forEach(checkFeatureDefinition);
            replacements.forEach(replacement => replaceFeature(features, replacement));
        }
    });
    checkDuplicates(features);
    dropUnresolvedExtensions(features);
    checkRequirements(features);
    return sortByDependencies(features);
}

/**
 * Loads the given resolved features, i.e. invokes the factories of all {@link FeatureDefinition}s in parallel.
 * If a feature is configured both as definition and as module object (e.g. `OPTIONAL_FEATURE_DEFINITIONS.Grid` and `gridModule`),
 * the module is only loaded once if the definition loads the same module object.
 * @param features The resolved features (see {@link resolveFeatures}).
 * @throws A {@link FeatureResolutionError} if a factory returns a module with a different feature id, or if a feature
 *         is configured with different implementations.
 * @returns The container modules in the order of the given features.
 */
export async function loadFeatures(features: ResolvedFeature[]): Promise<ContainerModule[]> {
    const modules = await Promise.all(
        features.map(async feature => (FeatureDefinition.is(feature) ? validateFeatureModule(feature, await feature.load()) : feature))
    );
    return deduplicateLoadedModules(modules);
}

/**
 * Error that is thrown if a container configuration cannot be resolved.
 */
export class FeatureResolutionError extends Error {
    constructor(
        readonly kind: FeatureResolutionError.Kind,
        message: string
    ) {
        super(message);
        this.name = 'FeatureResolutionError';
    }
}

export namespace FeatureResolutionError {
    /**
     * - `duplicate`: Multiple features with the same id are configured.
     * - `missing`: A required feature is not part of the resolved configuration.
     * - `cycle`: The dependencies of the configured features contain a cycle.
     * - `mismatch`: A feature factory returned a module with a different feature id.
     * - `invalid`: A feature definition has an invalid (i.e. not namespaced) id.
     */
    export type Kind = 'duplicate' | 'missing' | 'cycle' | 'mismatch' | 'invalid';
}

function validateFeatureModule(definition: FeatureDefinition, module: FeatureModule): FeatureModule {
    if (!isFeatureModule(module) || module.featureId !== FeatureKey.toId(definition.id)) {
        const actual = isFeatureModule(module) ? module.featureId.toString() : String(module);
        throw new FeatureResolutionError(
            'mismatch',
            `Could not load feature '${definition.id}'. The factory returned a module with a different feature id: ${actual}`
        );
    }
    return module;
}

/**
 * Returns the feature id of the given feature key, feature definition or feature module (see {@link FeatureKey.toId}),
 * or `undefined` for plain container modules.
 */
export function getFeatureId(feature: ResolvedFeature | FeatureKey): symbol | undefined {
    if (typeof feature === 'string') {
        return FeatureKey.toId(feature);
    }
    if (FeatureDefinition.is(feature)) {
        return FeatureKey.toId(feature.id);
    }
    return isFeatureModule(feature) ? feature.featureId : undefined;
}

function featureName(feature: ResolvedFeature): string {
    if (FeatureDefinition.is(feature)) {
        return feature.id;
    }
    const id = getFeatureId(feature);
    return id ? (Symbol.keyFor(id) ?? id.toString()) : `ContainerModule(${feature.id})`;
}

/**
 * Fails if the given configuration entry looks like a {@link FeatureDefinition} (i.e. has a `load` factory) but has an
 * invalid id. Otherwise, the entry would be treated as container module or module configuration and fail later on with
 * an unrelated inversify error.
 */
function checkFeatureDefinition(entry: ContainerModule | FeatureDefinition | ModuleConfiguration): void {
    if (!isContainerModule(entry) && !FeatureDefinition.is(entry) && hasFunctionProp(entry, 'load')) {
        throw new FeatureResolutionError(
            'invalid',
            `Could not resolve container configuration. Invalid feature definition id '${String((entry as { id?: unknown }).id)}': ` +
                "a feature key has to be namespaced, e.g. 'myCompany.simulation'."
        );
    }
}

/**
 * Removes the given features. Features are matched by feature id, plain container modules by identity.
 * Warns about entries that do not match any configured feature (e.g. a misspelled key or the key of a sub-module
 * that is not configured as a feature on its own), as removing them has no effect.
 */
function removeFeatures(features: ResolvedFeature[], toRemove: Array<ContainerModule | FeatureKey>): void {
    const matched = new Set<ContainerModule | FeatureKey>();
    for (let i = features.length - 1; i >= 0; i--) {
        const feature = features[i];
        const id = getFeatureId(feature);
        const matches = toRemove.filter(entry => entry === feature || (id !== undefined && getFeatureId(entry) === id));
        if (matches.length > 0) {
            matches.forEach(entry => matched.add(entry));
            features.splice(i, 1);
        }
    }
    toRemove
        .filter(entry => !matched.has(entry))
        .forEach(entry =>
            console.warn(
                `Could not find feature to remove: ${typeof entry === 'string' ? `'${entry}'` : featureName(entry)}. ` +
                    'The feature is not part of the configuration resolved so far.'
            )
        );
}

function replaceFeature(features: ResolvedFeature[], replacement: FeatureDefinition | FeatureModule): void {
    const id = getFeatureId(replacement);
    const existingIndex = features.findIndex(feature => getFeatureId(feature) === id);
    if (existingIndex >= 0) {
        features[existingIndex] = replacement;
        // a feature can be configured both as definition and as module object, replace all of them
        for (let i = features.length - 1; i > existingIndex; i--) {
            if (getFeatureId(features[i]) === id) {
                features.splice(i, 1);
            }
        }
    } else {
        console.warn(
            `Could not find module to replace with feature id ${id?.toString()}.` +
                'Adding replacement module to the end of the resolved configurations.'
        );
        distinctAdd(features, replacement);
    }
}

/**
 * Checks that each feature id is configured at most once. A feature that is configured once as definition and once as
 * module object is accepted: whether the definition loads the same module is only known after loading
 * (see {@link deduplicateLoadedModules}).
 */
function checkDuplicates(features: ResolvedFeature[]): void {
    const definitions = new Set<symbol>();
    const modules = new Set<symbol>();
    const duplicates: string[] = [];
    features.forEach(feature => {
        const id = getFeatureId(feature);
        if (!id) {
            return;
        }
        const seen = FeatureDefinition.is(feature) ? definitions : modules;
        if (seen.has(id)) {
            duplicates.push(featureName(feature));
        }
        seen.add(id);
    });
    throwIfDuplicates(duplicates);
}

/**
 * Removes repeated module objects (see {@link checkDuplicates}) and fails if a feature id is still loaded more than once,
 * i.e. if a feature is configured with different implementations.
 */
function deduplicateLoadedModules(modules: ContainerModule[]): ContainerModule[] {
    const result: ContainerModule[] = [];
    distinctAdd(result, ...modules);
    const featureIds = new Set<symbol>();
    const duplicates: string[] = [];
    result.filter(isFeatureModule).forEach(module => {
        if (featureIds.has(module.featureId)) {
            duplicates.push(featureName(module));
        }
        featureIds.add(module.featureId);
    });
    throwIfDuplicates(duplicates);
    return result;
}

function throwIfDuplicates(duplicates: string[]): void {
    if (duplicates.length > 0) {
        throw new FeatureResolutionError(
            'duplicate',
            `Could not resolve container configuration. Non-unique feature ids found in container configuration: ${duplicates.join(', ')}. ` +
                "Use a 'replace' configuration to substitute a feature."
        );
    }
}

/** Drops (transitively) all feature definitions that extend a feature which is not part of the resolved configuration. */
function dropUnresolvedExtensions(features: ResolvedFeature[]): void {
    let dropped = true;
    while (dropped) {
        dropped = false;
        const ids = new Set(features.map(getFeatureId));
        for (let i = features.length - 1; i >= 0; i--) {
            const feature = features[i];
            if (FeatureDefinition.is(feature) && feature.extends?.some(key => !ids.has(FeatureKey.toId(key)))) {
                if (FeatureModule.DEBUG_LOG_ENABLED) {
                    console.log(`Feature '${feature.id}' is not loaded because an extended feature is not configured: ${feature.extends}`);
                }
                features.splice(i, 1);
                dropped = true;
            }
        }
    }
}

function checkRequirements(features: ResolvedFeature[]): void {
    const ids = new Set(features.map(getFeatureId));
    const missing = features.flatMap(feature =>
        FeatureDefinition.is(feature)
            ? (feature.requires ?? []).filter(key => !ids.has(FeatureKey.toId(key))).map(key => `'${feature.id}' requires '${key}'`)
            : []
    );
    if (missing.length > 0) {
        throw new FeatureResolutionError(
            'missing',
            `Could not resolve container configuration. Required features are not configured: ${missing.join(', ')}`
        );
    }
}

function dependenciesOf(feature: ResolvedFeature): symbol[] {
    if (FeatureDefinition.is(feature)) {
        return [...(feature.requires ?? []), ...(feature.extends ?? [])].map(FeatureKey.toId);
    }
    if (isFeatureModule(feature) && feature.requires) {
        return asArray(feature.requires).map(required => (typeof required === 'string' ? FeatureKey.toId(required) : required.featureId));
    }
    return [];
}

/** Stable topological sort: keeps the configured order but moves dependencies before their dependents. */
function sortByDependencies(features: ResolvedFeature[]): ResolvedFeature[] {
    const byId = new Map<symbol, ResolvedFeature>();
    features.forEach(feature => {
        const id = getFeatureId(feature);
        if (id) {
            byId.set(id, feature);
        }
    });
    const sorted: ResolvedFeature[] = [];
    const done = new Set<ResolvedFeature>();
    const visiting: ResolvedFeature[] = [];
    const visit = (feature: ResolvedFeature): void => {
        if (done.has(feature)) {
            return;
        }
        const cycleStart = visiting.indexOf(feature);
        if (cycleStart >= 0) {
            const cycle = [...visiting.slice(cycleStart), feature].map(featureName).join(' -> ');
            throw new FeatureResolutionError('cycle', `Could not resolve container configuration. Dependency cycle detected: ${cycle}`);
        }
        visiting.push(feature);
        dependenciesOf(feature).forEach(id => {
            const dependency = byId.get(id);
            if (dependency) {
                visit(dependency);
            }
        });
        visiting.pop();
        done.add(feature);
        sorted.push(feature);
    };
    features.forEach(visit);
    return sorted;
}

/**
 * The container modules might originate form different inversify contexts (e.g. `inversify` vs. `@theia/core/shared/inversify`).
 * If this is the case an instanceof check can return  false negative.
 * => use a simple typeguard instead.
 */
function isContainerModule(config: ContainerModule | FeatureDefinition | ModuleConfiguration): config is ContainerModule {
    return hasNumberProp(config, 'id') && hasFunctionProp(config, 'registry');
}

/**
 * Union type for the set of {@link ContainerModule}s, lazily loaded {@link FeatureDefinition}s and additional
 * {@link ModuleConfiguration}s used to configure a DI container.
 */
export type ContainerConfiguration = Array<ContainerModule | FeatureDefinition | ModuleConfiguration>;

/**
 * Can be passed to create DI container utility functions to configure additional modules or
 * remove (i.e. not load) default modules.
 */
export interface ModuleConfiguration {
    /** Set of modules or lazily loaded features that should be loaded into the container. */
    add?: MaybeArray<ContainerModule | FeatureDefinition>;
    /**
     * Set of features that should not be loaded into the container. Features can be referenced by {@link FeatureKey},
     * which does not require to import their implementation, or by module.
     */
    remove?: MaybeArray<ContainerModule | FeatureKey>;
    /**
     * Set of features that should be loaded into the container and
     * replace potential already configured features with the same feature id.
     * When resolving the replacement will be added at the index of the feature it replaces.
     * If there is no feature to replace, the replacement will be added to the end of the list (i.e. behaves like `add`).
     */
    replace?: MaybeArray<FeatureModule | FeatureDefinition>;
}
