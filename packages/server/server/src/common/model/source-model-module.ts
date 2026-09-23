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
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { ActionHandlerConstructor } from '../actions/action-handler';
import { DiagramConfiguration } from '../diagram/diagram-configuration';
import { BindingTarget, applyBindingTarget } from '../di/binding-target';
import { InstanceMultiBinding } from '../di/multi-binding';
import { ServerFeatureModule } from '../di/server-feature-module';
import { BaseDiagramModule } from '../di/base-diagram-module';
import { GModelFactory } from './gmodel-factory';
import { GModelIndex } from './gmodel-index';
import { DefaultGModelSerializer, GModelSerializer } from './gmodel-serializer';
import { ModelState } from './model-state';
import { ModelSubmissionHandler } from './model-submission-handler';
import { RequestModelActionHandler } from './request-model-action-handler';
import { SaveModelActionHandler } from './save-model-action-handler';
import { SetEditModeActionHandler } from './set-edit-mode-action-handler';
import { SourceModelStorage } from './source-model-storage';

/**
 * Core module that defines the diagram language and its source model. Every diagram setup has exactly one
 * source model module (see `createDiagramSetup`), adopters implement the abstract bindings in a subclass.
 *
 * Provides:
 * - {@link DiagramConfiguration}
 * - {@link GModelSerializer}, {@link ModelState}, {@link GModelIndex}, {@link SourceModelStorage}, {@link GModelFactory}
 * - {@link ModelSubmissionHandler}
 * - {@link RequestModelActionHandler}, {@link SaveModelActionHandler}, {@link SetEditModeActionHandler}
 */
export abstract class SourceModelModule extends ServerFeatureModule {
    static readonly KEY = 'glsp.sourceModel';

    /** The diagram type of the diagram language (used to select the diagram setup when a client session is created). */
    abstract get diagramType(): string;

    override get featureKey(): string {
        return SourceModelModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [BaseDiagramModule.KEY];
    }

    protected registerBindings(context: BindingContext): void {
        applyBindingTarget(context, DiagramConfiguration, this.bindDiagramConfiguration()).inSingletonScope();
        applyBindingTarget(context, GModelSerializer, this.bindGModelSerializer()).inSingletonScope();
        applyBindingTarget(context, ModelState, this.bindModelState()).inSingletonScope();
        applyBindingTarget(context, GModelIndex, this.bindGModelIndex()).inSingletonScope();
        applyBindingTarget(context, SourceModelStorage, this.bindSourceModelStorage()).inSingletonScope();
        applyBindingTarget(context, GModelFactory, this.bindGModelFactory());
        applyBindingTarget(context, ModelSubmissionHandler, this.bindModelSubmissionHandler()).inSingletonScope();
        this.configureMultiBinding(new InstanceMultiBinding<ActionHandlerConstructor>(ActionHandlerConstructor), binding =>
            this.configureActionHandlers(binding)
        );
    }

    protected configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        binding.add(RequestModelActionHandler);
        binding.add(SaveModelActionHandler);
        binding.add(SetEditModeActionHandler);
    }

    protected bindGModelSerializer(): BindingTarget<GModelSerializer> {
        return DefaultGModelSerializer;
    }

    protected bindGModelIndex(): BindingTarget<GModelIndex> {
        return GModelIndex;
    }

    protected bindModelSubmissionHandler(): BindingTarget<ModelSubmissionHandler> {
        return ModelSubmissionHandler;
    }

    // Required abstract bindings

    protected abstract bindSourceModelStorage(): BindingTarget<SourceModelStorage>;

    /**
     * Returns the {@link BindingTarget} for the {@link ModelState} interface.
     * Typically a {@link ServiceTarget} is returned as this ensures that both
     * `@inject(ModelState)` and `@inject(MyCustomModelState`) can be used and resolve
     * to the same instance.
     *
     * Example:
     * ```ts
     *  protected override bindModelState():BindingTarget<ModelState> {
     *     return { service: MyCustomModelState};
     *  }
     *```
     */
    protected abstract bindModelState(): BindingTarget<ModelState>;

    protected abstract bindDiagramConfiguration(): BindingTarget<DiagramConfiguration>;

    protected abstract bindGModelFactory(): BindingTarget<GModelFactory>;
}
