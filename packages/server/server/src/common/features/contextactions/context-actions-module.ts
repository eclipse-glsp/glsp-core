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
import { ContextActionsProviders } from '../../di/service-identifiers';
import { OperationsModule } from '../../operations/operations-module';
import { CommandPaletteActionProvider } from './command-palette-action-provider';
import { ContextActionsProvider } from './context-actions-provider';
import { ContextActionsProviderRegistry } from './context-actions-provider-registry';
import { ContextMenuItemProvider } from './context-menu-item-provider';
import { RequestContextActionsHandler } from './request-context-actions-handler';
import { DefaultToolPaletteItemProvider, ToolPaletteItemProvider } from './tool-palette-item-provider';

/**
 * Feature module for context actions (tool palette, command palette, context menu). Reported as {@link GLSPCapability.ContextActions}
 * capability. Requires the {@link OperationsModule} because the default tool palette is derived from the registered
 * create operation handlers.
 *
 * Provides:
 * - {@link RequestContextActionsHandler}
 * - {@link ToolPaletteItemProvider} ({@link DefaultToolPaletteItemProvider}) as optional binding
 * - {@link CommandPaletteActionProvider}, {@link ContextMenuItemProvider} as optional bindings
 * - {@link ContextActionsProviders} (empty), {@link ContextActionsProviderRegistry}
 */
export class ContextActionsModule extends CapabilityFeatureModule {
    static readonly KEY = GLSPCapability.ContextActions;

    override get featureKey(): GLSPCapability {
        return ContextActionsModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [OperationsModule.KEY];
    }

    protected registerBindings(context: BindingContext): void {
        applyOptionalBindingTarget(context, ToolPaletteItemProvider, this.bindToolPaletteItemProvider());
        applyOptionalBindingTarget(context, CommandPaletteActionProvider, this.bindCommandPaletteActionProvider());
        applyOptionalBindingTarget(context, ContextMenuItemProvider, this.bindContextMenuItemProvider());
        this.configureMultiBinding(new MultiBinding<ContextActionsProvider>(ContextActionsProviders), binding =>
            this.configureContextActionProviders(binding)
        );
        applyBindingTarget(context, ContextActionsProviderRegistry, this.bindContextActionsProviderRegistry()).inSingletonScope();
        this.configureMultiBinding(new InstanceMultiBinding<ActionHandlerConstructor>(ActionHandlerConstructor), binding =>
            this.configureActionHandlers(binding)
        );
    }

    protected bindToolPaletteItemProvider(): BindingTarget<ToolPaletteItemProvider> | undefined {
        return DefaultToolPaletteItemProvider;
    }

    protected bindCommandPaletteActionProvider(): BindingTarget<CommandPaletteActionProvider> | undefined {
        return undefined;
    }

    protected bindContextMenuItemProvider(): BindingTarget<ContextMenuItemProvider> | undefined {
        return undefined;
    }

    protected configureContextActionProviders(binding: MultiBinding<ContextActionsProvider>): void {
        // empty as default
    }

    protected bindContextActionsProviderRegistry(): BindingTarget<ContextActionsProviderRegistry> {
        return ContextActionsProviderRegistry;
    }

    protected configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        binding.add(RequestContextActionsHandler);
    }
}
