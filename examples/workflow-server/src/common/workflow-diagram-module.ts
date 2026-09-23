/********************************************************************************
 * Copyright (c) 2022-2026 STMicroelectronics and others.
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
    BindingTarget,
    ContainerConfiguration,
    DiagramSetup,
    GLSPServerInitializer,
    MultiBinding,
    ServerModule,
    SourceModelStorage,
    createGModelDiagramSetup
} from '@eclipse-glsp/server';
import { injectable } from 'inversify';
import { WorkflowContextActionsModule } from './features/context-actions/workflow-context-actions-module';
import { WorkflowElementCreationModule } from './features/element-creation/workflow-element-creation-module';
import { WorkflowLabelEditModule } from './features/label-edit/workflow-label-edit-module';
import { WorkflowNavigationModule } from './features/navigation/workflow-navigation-module';
import { WorkflowPopupModule } from './features/popup/workflow-popup-module';
import { WorkflowTaskEditModule } from './features/task-edit/workflow-task-edit-module';
import { WorkflowTypeHintsModule } from './features/type-hints/workflow-type-hints-module';
import { WorkflowValidationModule } from './features/validation/workflow-validation-module';
import { CustomArgsInitContribution } from './workflow-glsp-server';
import { WorkflowModelModule } from './workflow-model-module';

@injectable()
export class WorkflowServerModule extends ServerModule {
    protected override configureGLSPServerInitializers(binding: MultiBinding<GLSPServerInitializer>): void {
        binding.add(CustomArgsInitContribution);
    }
}

/**
 * Creates the {@link DiagramSetup} of the workflow diagram: the GModel defaults with the workflow-specific
 * customizations substituted in (`replace`) and the workflow-specific features appended (`add`).
 *
 * @param sourceModelStorage The source model storage of the environment (e.g. file-based or mock).
 * @param configuration Additional (environment-specific) module configurations, e.g. layout or MCP modules.
 */
export function createWorkflowDiagramSetup(
    sourceModelStorage: () => BindingTarget<SourceModelStorage>,
    ...configuration: ContainerConfiguration
): DiagramSetup {
    return createGModelDiagramSetup(
        new WorkflowModelModule(sourceModelStorage),
        {
            add: [new WorkflowElementCreationModule(), new WorkflowTaskEditModule()],
            replace: [
                new WorkflowLabelEditModule(),
                new WorkflowValidationModule(),
                new WorkflowNavigationModule(),
                new WorkflowContextActionsModule(),
                new WorkflowPopupModule(),
                new WorkflowTypeHintsModule()
            ]
        },
        ...configuration
    );
}
