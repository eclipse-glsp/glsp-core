/********************************************************************************
 * Copyright (c) 2026 EclipseSource and others.
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
import { MaybeArray, asArray } from '../utils/array-util';
import { AnyObject, MaybePromise, hasFunctionProp } from '../utils/type-util';
import { FeatureKey } from '../features/feature-key';
import { FeatureModule, FeatureModuleOptions } from './feature-module';

/**
 * A lazily loaded feature: the {@link FeatureKey} and dependencies of a feature, separated from its implementation.
 *
 * Container configurations are resolved on definitions (see `resolveFeatures`), i.e. additions, removals, replacements
 * and dependencies are resolved before any {@link FeatureDefinition.load} factory is invoked. A feature that is removed
 * therefore never runs its registration code. If the factory uses a dynamic `import()`, the implementation (including its
 * stylesheets) is also not loaded and bundlers can move it into a separate chunk.
 *
 * ```typescript
 * const myFeature: FeatureDefinition = {
 *     id: 'myCompany.simulation',
 *     requires: ['glsp.select'],
 *     load: () => import('./simulation-module').then(m => m.simulationModule)
 * };
 * ```
 */
export interface FeatureDefinition {
    /** The key of the feature. The module returned by {@link FeatureDefinition.load} must use the corresponding feature id. */
    readonly id: FeatureKey;
    /**
     * Hard dependencies: features that have to be part of the resolved configuration. Resolution fails with a
     * `FeatureResolutionError` if one of them is missing. Required features are always loaded before this feature.
     */
    readonly requires?: readonly FeatureKey[];
    /**
     * Soft dependencies: features that this feature augments (e.g. a standalone variant of a default feature).
     * If one of them is not part of the resolved configuration, this feature is dropped as well instead of failing.
     * Extended features are always loaded before this feature.
     */
    readonly extends?: readonly FeatureKey[];
    /**
     * Creates the feature module. Only invoked if the feature is part of the resolved configuration.
     * The returned module has to use the feature id of {@link FeatureDefinition.id} (see {@link FeatureKey.toId}).
     */
    readonly load: () => MaybePromise<FeatureModule>;
}

export namespace FeatureDefinition {
    export function is(object: unknown): object is FeatureDefinition {
        return AnyObject.is(object) && hasFunctionProp(object, 'load') && FeatureKey.is((object as { id?: unknown }).id);
    }

    /**
     * Wraps an already created module in a definition, e.g. to replace a lazily loaded default feature with a module
     * that is imported eagerly. The key is derived from the feature id of the module, which therefore has to be created
     * with {@link FeatureKey.toId}.
     */
    export function fromModule(module: FeatureModule): FeatureDefinition {
        const id = Symbol.keyFor(module.featureId);
        if (!FeatureKey.is(id)) {
            throw new Error(
                `Could not create feature definition for module '${module.featureId.toString()}'. ` +
                    'The feature id has to be created with `FeatureKey.toId`.'
            );
        }
        return { id, load: () => module };
    }

    /**
     * Derives the options of the {@link FeatureModule} that a definition loads from the definition itself, so that the
     * key and the dependencies of a feature are only declared once:
     * ```typescript
     * // my-feature-definition.ts: no implementation imports
     * export const myFeatureDef = defineFeature('myCompany.my', () => import('./my-module').then(m => m.myModule));
     * // my-module.ts
     * export const myModule = new FeatureModule(bind => { ... }, FeatureDefinition.toModuleOptions(myFeatureDef));
     * ```
     * The module checks its dependencies again when it is loaded directly (i.e. not through a resolved configuration).
     * At load time a missing dependency always skips the module, so `requires` and `extends` both become `requires`.
     */
    export function toModuleOptions(definition: FeatureDefinition): FeatureModuleOptions {
        const requires = [...(definition.requires ?? []), ...(definition.extends ?? [])];
        return { featureId: FeatureKey.toId(definition.id), requires: requires.length > 0 ? requires : undefined };
    }
}

/**
 * Creates a {@link FeatureDefinition}.
 * @param id The key of the feature.
 * @param load The factory that creates the feature module, typically based on a dynamic `import()`.
 * @param options Optional dependencies of the feature.
 */
export function defineFeature(
    id: FeatureKey,
    load: () => MaybePromise<FeatureModule>,
    options: { requires?: MaybeArray<FeatureKey>; extends?: MaybeArray<FeatureKey> } = {}
): FeatureDefinition {
    return {
        id,
        load,
        requires: options.requires && asArray(options.requires),
        extends: options.extends && asArray(options.extends)
    };
}
