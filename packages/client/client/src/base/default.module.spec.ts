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
import { Action, ActionHandlerRegistration, GetSelectionAction } from '@eclipse-glsp/sprotty';
import { Container, injectable, interfaces } from 'inversify';
import { beforeEach, describe, expect, it } from 'vitest';
import { TYPES } from '../types';
import { DefaultAutocompleteSuggestionRegistry } from './auto-complete/autocomplete-suggestion-provider';
import { GLSPCommandStack } from './command-stack';
import { defaultModule } from './default.module';
import { EditorContextService } from './editor-context-service';
import { FeedbackActionDispatcher } from './feedback/feedback-action-dispatcher';
import { FocusTracker } from './focus/focus-tracker';
import { DiagramLoader, IDiagramOptions } from './model/diagram-loader';
import { ModelChangeService } from './model/model-change-service';
import { DefaultModelInitializationConstraint, ModelInitializationConstraint } from './model/model-initialization-constraint';
import { SelectionService } from './selection-service';
import { ShortcutManager } from './shortcuts/shortcuts-manager';
import { ToolManager } from './tool-manager/tool-manager';

@injectable()
class CustomSelectionService extends SelectionService {}

@injectable()
class CustomModelInitializationConstraint extends ModelInitializationConstraint {
    isInitializedAfter(_action: Action): boolean {
        return true;
    }
}

describe('defaultModule service bindings', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
        container.load(defaultModule);
        container.bind(TYPES.IDiagramOptions).toConstantValue(<IDiagramOptions>(<unknown>{
            clientId: 'client1',
            diagramType: 'diagramType',
            glspClientProvider: async () => ({}) as any
        }));
    });

    const services: [string, interfaces.ServiceIdentifier, interfaces.ServiceIdentifier][] = [
        ['SelectionService', TYPES.ISelectionService, SelectionService],
        ['EditorContextService', TYPES.IEditorContextService, EditorContextService],
        ['FocusTracker', TYPES.IFocusTracker, FocusTracker],
        ['DiagramLoader', TYPES.IDiagramLoader, DiagramLoader],
        ['ModelInitializationConstraint', TYPES.IModelInitializationConstraint, ModelInitializationConstraint],
        ['ToolManager', TYPES.IToolManager, ToolManager],
        ['FeedbackActionDispatcher', TYPES.IFeedbackActionDispatcher, FeedbackActionDispatcher],
        ['ModelChangeService', TYPES.IModelChangeService, ModelChangeService],
        ['GLSPCommandStack', TYPES.ICommandStack, GLSPCommandStack],
        ['ShortcutManager', TYPES.IShortcutManager, ShortcutManager],
        ['DefaultAutocompleteSuggestionRegistry', TYPES.IAutocompleteSuggestionProviderRegistry, DefaultAutocompleteSuggestionRegistry]
    ];

    it.each(services)('should resolve the same %s instance via symbol and class', (_name, symbol, clazz) => {
        expect(container.get(symbol)).toBe(container.get(clazz));
    });

    it('should resolve the default model initialization constraint', () => {
        expect(container.get(TYPES.IModelInitializationConstraint)).toBeInstanceOf(DefaultModelInitializationConstraint);
    });

    it('should propagate a class rebind to the service symbol', () => {
        container.rebind(SelectionService).to(CustomSelectionService).inSingletonScope();
        const service = container.get(TYPES.ISelectionService);
        expect(service).toBeInstanceOf(CustomSelectionService);
        expect(service).toBe(container.get(SelectionService));
    });

    it('should propagate a symbol rebind to the listener, startup and action handler bindings', () => {
        container.rebind(TYPES.ISelectionService).to(CustomSelectionService).inSingletonScope();
        const service = container.get(TYPES.ISelectionService);
        expect(service).toBeInstanceOf(CustomSelectionService);
        // No separate default instance must be created for the secondary bindings
        expect(container.getAll(TYPES.IGModelRootListener).filter(listener => listener instanceof SelectionService)).toEqual([service]);
        expect(container.getAll(TYPES.IDiagramStartup).filter(startup => startup instanceof SelectionService)).toEqual([service]);
        const registration = container
            .getAll<ActionHandlerRegistration>(TYPES.ActionHandlerRegistration)
            .find(reg => reg.actionKind === GetSelectionAction.KIND);
        expect(registration?.factory()).toBe(service);
    });

    it('should propagate a rebind of the abstract model initialization constraint to the service symbol', () => {
        container.rebind(ModelInitializationConstraint).to(CustomModelInitializationConstraint).inSingletonScope();
        expect(container.get(TYPES.IModelInitializationConstraint)).toBeInstanceOf(CustomModelInitializationConstraint);
    });
});
