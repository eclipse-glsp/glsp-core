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
import { GLSPCapability } from '@eclipse-glsp/protocol';
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { ActionHandlerConstructor } from '../../actions/action-handler';
import { BindingTarget, applyBindingTarget, applyOptionalBindingTarget } from '../../di/binding-target';
import { InstanceMultiBinding, MultiBinding } from '../../di/multi-binding';
import { CapabilityFeatureModule } from '../../di/capability-feature-module';
import { NavigationTargetProviders } from '../../di/service-identifiers';
import { BaseDiagramModule } from '../../di/base-diagram-module';
import { NavigationTargetProvider } from './navigation-target-provider';
import { DefaultNavigationTargetProviderRegistry, NavigationTargetProviderRegistry } from './navigation-target-provider-registry';
import { NavigationTargetResolver } from './navigation-target-resolver';
import { RequestNavigationTargetsActionHandler } from './request-navigation-targets-action-handler';
import { ResolveNavigationTargetsActionHandler } from './resolve-navigation-targets-action-handler';

/**
 * Feature module for navigation. Reported as {@link GLSPCapability.Navigation} capability.
 *
 * Provides:
 * - {@link RequestNavigationTargetsActionHandler}, {@link ResolveNavigationTargetsActionHandler}
 * - {@link NavigationTargetResolver} as optional binding
 * - {@link NavigationTargetProviders} (empty), {@link NavigationTargetProviderRegistry}
 */
export class NavigationModule extends CapabilityFeatureModule {
    static readonly KEY = GLSPCapability.Navigation;

    override get featureKey(): GLSPCapability {
        return NavigationModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [BaseDiagramModule.KEY];
    }

    protected registerBindings(context: BindingContext): void {
        applyOptionalBindingTarget(context, NavigationTargetResolver, this.bindNavigationTargetResolver())?.inSingletonScope();
        this.configureMultiBinding(new MultiBinding<NavigationTargetProvider>(NavigationTargetProviders), binding =>
            this.configureNavigationTargetProviders(binding)
        );
        applyBindingTarget(context, NavigationTargetProviderRegistry, this.bindNavigationTargetProviderRegistry()).inSingletonScope();
        this.configureMultiBinding(new InstanceMultiBinding<ActionHandlerConstructor>(ActionHandlerConstructor), binding =>
            this.configureActionHandlers(binding)
        );
    }

    protected bindNavigationTargetResolver(): BindingTarget<NavigationTargetResolver> | undefined {
        return undefined;
    }

    protected configureNavigationTargetProviders(binding: MultiBinding<NavigationTargetProvider>): void {
        // empty as default
    }

    protected bindNavigationTargetProviderRegistry(): BindingTarget<NavigationTargetProviderRegistry> {
        return DefaultNavigationTargetProviderRegistry;
    }

    protected configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        binding.add(RequestNavigationTargetsActionHandler);
        binding.add(ResolveNavigationTargetsActionHandler);
    }
}
