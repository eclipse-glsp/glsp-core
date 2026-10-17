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
import { createWorkflowDiagramContainer } from '@eclipse-glsp-examples/workflow-glsp';
import { createGModelDemoDiagramContainer } from '@eclipse-glsp-examples/gmodel-demo-glsp';
import { ContainerConfiguration } from '@eclipse-glsp/client';
import { Container } from 'inversify';
import { workflowStandaloneContextMenuModule } from './features/context-menu/standalone-context-menu-module';
import { standaloneTaskEditorModule } from './features/direct-task-editing/standalone-task-editor-module';

/** A diagram language the playground can open, selected by the file extension of the model. */
export interface PlaygroundLanguage {
    title: string;
    diagramType: string;
    createContainer(...containerConfiguration: ContainerConfiguration): Container;
}

const LANGUAGES: Record<string, PlaygroundLanguage> = {
    '.wf': {
        title: 'Workflow Editor',
        diagramType: 'workflow-diagram',
        createContainer: (...containerConfiguration) =>
            createWorkflowDiagramContainer(
                { add: [standaloneTaskEditorModule, workflowStandaloneContextMenuModule] },
                ...containerConfiguration
            )
    },
    '.gm': {
        title: 'GModel Demo',
        diagramType: 'gmodel-demo',
        createContainer: createGModelDemoDiagramContainer
    }
};

export const DEFAULT_MODEL = 'example1.wf';

/** The model to open, given as path relative to the app directory by the `model` URL parameter. */
export function getModelPath(): string {
    return new URLSearchParams(window.location.search).get('model') || DEFAULT_MODEL;
}

export function getLanguage(modelPath: string): PlaygroundLanguage {
    const extension = modelPath.substring(modelPath.lastIndexOf('.'));
    const language = LANGUAGES[extension];
    if (!language) {
        throw new Error(`Unsupported model '${modelPath}'. Supported file extensions: ${Object.keys(LANGUAGES).join(', ')}`);
    }
    return language;
}
