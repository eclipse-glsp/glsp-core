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

import { TaskEditor, isTaskNode } from '@eclipse-glsp-examples/workflow-glsp';
import {
    ClientMenuItem,
    EditorContextService,
    IContextMenuItemProvider,
    LazyInjector,
    NavigateAction,
    SetUIExtensionVisibilityAction
} from '@eclipse-glsp/client';
import { inject, injectable } from 'inversify';

@injectable()
export class WorkflowStandaloneContextMenuProvider implements IContextMenuItemProvider {
    @inject(LazyInjector)
    protected lazyInjector: LazyInjector;

    protected get editorContext(): EditorContextService {
        return this.lazyInjector.get(EditorContextService);
    }
    getItems(): Promise<ClientMenuItem[]> {
        const goToItems: ClientMenuItem[] = [
            {
                id: 'next node',
                label: 'Next node',
                parentId: 'navigate',
                actions: [NavigateAction.create('next')],
                isEnabled: () => this.editorContext.selectedElements.filter(isTaskNode).length === 1
            },
            {
                id: 'previous node',
                label: 'Previous node',
                parentId: 'navigate',
                actions: [NavigateAction.create('previous')],
                isEnabled: () => this.editorContext.selectedElements.filter(isTaskNode).length === 1
            }
        ];

        const selectedTasks = this.editorContext.selectedElements.filter(isTaskNode);
        const editTask: ClientMenuItem = {
            id: 'edit-task',
            label: 'Edit task',
            group: 'edit',
            actions:
                selectedTasks.length === 1
                    ? [
                          SetUIExtensionVisibilityAction.create({
                              extensionId: TaskEditor.ID,
                              visible: true,
                              contextElementsId: [selectedTasks[0].id]
                          })
                      ]
                    : [],
            isEnabled: () => !this.editorContext.isReadonly && selectedTasks.length === 1
        };

        return Promise.resolve([editTask, ...goToItems]);
    }
}
