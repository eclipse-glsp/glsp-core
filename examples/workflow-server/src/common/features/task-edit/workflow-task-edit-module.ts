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
import {
    BindingContext,
    CapabilityFeatureModule,
    CapabilityKey,
    ContextActionsModule,
    ContextActionsProvider,
    ContextActionsProviders,
    ContextEditValidator,
    ContextEditValidators,
    InstanceMultiBinding,
    LabelEditModule,
    MultiBinding,
    OperationHandlerConstructor,
    OperationsModule
} from '@eclipse-glsp/server';
import { EditTaskOperationHandler } from '../../taskedit/edit-task-operation-handler';
import { TaskEditContextActionProvider } from '../../taskedit/task-edit-context-provider';
import { TaskEditValidator } from '../../taskedit/task-edit-validator';

/**
 * Inline editing of task names and durations via the command palette (`EditTaskOperation`).
 * Reported as custom `workflow.taskEdit` capability.
 */
export class WorkflowTaskEditModule extends CapabilityFeatureModule {
    static readonly KEY: CapabilityKey = 'workflow.taskEdit';

    override get featureKey(): CapabilityKey {
        return WorkflowTaskEditModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [OperationsModule.KEY, ContextActionsModule.KEY, LabelEditModule.KEY];
    }

    protected registerBindings(_context: BindingContext): void {
        this.configureMultiBinding(new InstanceMultiBinding<OperationHandlerConstructor>(OperationHandlerConstructor), binding =>
            binding.add(EditTaskOperationHandler)
        );
        this.configureMultiBinding(new MultiBinding<ContextActionsProvider>(ContextActionsProviders), binding =>
            binding.add(TaskEditContextActionProvider)
        );
        this.configureMultiBinding(new MultiBinding<ContextEditValidator>(ContextEditValidators), binding =>
            binding.add(TaskEditValidator)
        );
    }
}
