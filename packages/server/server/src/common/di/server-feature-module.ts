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
import { asArray } from '@eclipse-glsp/protocol';
import { BindingContext, FeatureModule, FeatureModuleOptions } from '@eclipse-glsp/protocol/lib/di';
import { interfaces } from 'inversify';
import { GLSPServerError } from '../utils/glsp-server-error';
import { ServerFeature, ServerFeatureDescription } from './feature';
import { AbstractMultiBinding } from './multi-binding';

/**
 * Base class for composable, individually removable server features.
 *
 * Combines the composition semantics of {@link FeatureModule} (feature id, required modules, add/remove/replace via
 * `resolveContainerConfiguration`) with the server's class-based `bindXxx()`/`configureXxx()` template-method idiom:
 * subclasses implement {@link ServerFeatureModule.registerBindings} and expose overridable hooks, adopters customize
 * a feature by subclassing its module and replacing the default module in the diagram setup.
 *
 * The feature id is derived from {@link ServerFeatureModule.featureKey} via `Symbol.for`. Subclasses therefore share
 * the feature id of their base module, which means
 * - `replace: [new MyChangeBoundsModule()]` substitutes the default `ChangeBoundsModule` in place, and
 * - loading a module and its subclass into the same container is detected as a duplicate feature.
 *
 * Plain server feature modules are infrastructure, i.e. they are not reported as capabilities. Features that should be
 * reported to the client extend {@link CapabilityFeatureModule} instead.
 *
 * Features whose implementation depends on the source model (e.g. `ChangeBoundsModule`) are abstract: to support such
 * a feature, a concrete subclass that provides the source-model-specific parts (e.g. operation handlers) has to be added
 * to the diagram setup.
 *
 * In contrast to {@link FeatureModule}, unmet module requirements do not silently skip the module but throw an error:
 * a session that silently lacks a feature is a misconfiguration, not a valid configuration.
 */
export abstract class ServerFeatureModule extends FeatureModule {
    protected context: BindingContext;

    constructor(options: Omit<FeatureModuleOptions, 'featureId'> = {}) {
        super((bind, unbind, isBound, rebind) => {
            this.context = { bind, unbind, isBound, rebind };
            this.registerBindings(this.context);
            this.registerFeature(this.context);
        }, options);
    }

    /**
     * The stable, globally unique key of this feature, e.g. `glsp.changeBounds` (see `GLSPCapability`).
     * The `glsp.` prefix is reserved for GLSP; adopters must use their own namespace (e.g. `myCompany.simulation`)
     * because the derived feature id is process-global.
     *
     * **Important:** The key is read during construction of the base class, i.e. before subclass fields are
     * initialized. It must therefore be a constant (typically a getter returning a static value) and must not
     * depend on constructor arguments or instance fields.
     */
    abstract get featureKey(): string;

    /**
     * The feature keys of the modules that have to be loaded (i.e. positioned before this module in the composition)
     * for this module to load. Checked at load time, loading fails with an error if a required module is missing.
     */
    get requiredFeatures(): string[] {
        return [];
    }

    protected override createFeatureId(): symbol {
        const featureKey = this.featureKey;
        if (typeof featureKey !== 'string' || featureKey.length === 0) {
            throw new GLSPServerError(
                `Could not create feature module '${this.constructor.name}': The 'featureKey' has to be a non-empty constant string.`
            );
        }
        return Symbol.for(featureKey);
    }

    /**
     * Registers the bindings of this feature. Typically implemented with `applyBindingTarget` and overridable
     * `bindXxx()`/`configureXxx()` hooks.
     */
    protected abstract registerBindings(context: BindingContext): void;

    /** Publishes the {@link ServerFeatureDescription} of this feature. */
    protected registerFeature(context: BindingContext): void {
        context.bind(ServerFeature).toConstantValue(this.createFeatureDescription());
    }

    protected createFeatureDescription(): ServerFeatureDescription {
        return { featureKey: this.featureKey, capability: false };
    }

    protected override checkRequirements(isBound: interfaces.IsBound): boolean {
        const missing = [
            ...this.requiredFeatures.filter(key => !isBound(Symbol.for(key))),
            ...asArray(this.requires ?? [])
                .filter(module => !module.isLoaded({ isBound }))
                .map(module => module.featureId.description ?? module.featureId.toString())
        ];
        if (missing.length > 0) {
            throw new GLSPServerError(
                `Could not load feature module '${this.featureKey}'. Required modules are not loaded: ${missing.join(', ')}`
            );
        }
        return true;
    }

    /**
     * Configuration method for multi-bound values. The passed configurator is typically a `configureXxx()` hook of this
     * module, which gives subclasses the chance to customize the binding before it is applied.
     */
    protected configureMultiBinding<T>(binding: AbstractMultiBinding<T>, configurator: (binding: AbstractMultiBinding<T>) => void): void {
        configurator(binding);
        binding.applyBindings(this.context);
    }
}
