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
    InstanceMultiBinding,
    OperationHandlerConstructor,
    OperationsModule,
    ServerFeatureModule
} from '@eclipse-glsp/server';
import { CreateAutomatedTaskHandler } from '../../handler/create-automated-task-handler';
import { CreateCategoryHandler } from '../../handler/create-category-handler';
import { CreateDecisionNodeHandler } from '../../handler/create-decision-node-handler';
import { CreateEdgeHandler } from '../../handler/create-edge-handler';
import { CreateForkNodeHandler } from '../../handler/create-fork-node-handler';
import { CreateJoinNodeHandler } from '../../handler/create-join-node-handler';
import { CreateManualTaskHandler } from '../../handler/create-manual-task-handler';
import { CreateMergeNodeHandler } from '../../handler/create-merge-node-handler';
import { CreateWeightedEdgeHandler } from '../../handler/create-weighted-edge-handler';

/**
 * Contributes the create operation handlers for all workflow node and edge types.
 */
export class WorkflowElementCreationModule extends ServerFeatureModule {
    static readonly KEY = 'workflow.elementCreation';

    override get featureKey(): string {
        return WorkflowElementCreationModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [OperationsModule.KEY];
    }

    protected registerBindings(_context: BindingContext): void {
        this.configureMultiBinding(new InstanceMultiBinding<OperationHandlerConstructor>(OperationHandlerConstructor), binding =>
            this.configureOperationHandlers(binding)
        );
    }

    protected configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
        binding.add(CreateAutomatedTaskHandler);
        binding.add(CreateManualTaskHandler);
        binding.add(CreateJoinNodeHandler);
        binding.add(CreateForkNodeHandler);
        binding.add(CreateEdgeHandler);
        binding.add(CreateWeightedEdgeHandler);
        binding.add(CreateMergeNodeHandler);
        binding.add(CreateDecisionNodeHandler);
        binding.add(CreateCategoryHandler);
    }
}
