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
import { GLSPCapability, GLSPClientProxy, RequestModelAction, SaveModelAction } from '@eclipse-glsp/protocol';
import { Container, ContainerModule, injectable } from 'inversify';
import { describe, expect, it } from 'vitest';
import { ActionDispatchScope } from '../actions/action-dispatcher';
import { ActionHandlerRegistry } from '../actions/action-handler-registry';
import { SessionCapabilityProvider } from '../capabilities/session-capability-provider';
import { DiagramConfiguration } from '../diagram/diagram-configuration';
import { ChangeBoundsModule } from '../features/change-bounds/change-bounds-module';
import { BaseDiagramModule } from './base-diagram-module';
import { LabelEditValidator } from '../features/directediting/label-edit-validator';
import { PopupModule } from '../features/popup/popup-module';
import { SourceModelStorage } from '../model/source-model-storage';
import { NavigationModule } from '../features/navigation/navigation-module';
import { GModelChangeBoundsOperationHandler } from '../gmodel/change-bounds/change-bounds-operation-handler';
import { GModelChangeBoundsModule } from '../gmodel/change-bounds/gmodel-change-bounds-module';
import { GModelLabelEditModule } from '../gmodel/label-edit/gmodel-label-edit-module';
import { OperationHandlerConstructor } from '../operations/operation-handler';
import { GModelSourceModelModule } from '../gmodel/gmodel-source-model-module';
import { OperationHandlerRegistry } from '../operations/operation-handler-registry';
import { OperationsModule } from '../operations/operations-module';
import { runClientSessionInitializers } from '../session/client-session-initializer';
import * as mock from '../test/mock-util';
import { Logger } from '../utils/logger';
import { BindingTarget } from './binding-target';
import { createClientSessionModule } from './client-session-module';
import { createGModelDiagramSetup } from '../gmodel/gmodel-diagram-setup';
import { createDefaultDiagramModules, createDiagramSetup } from './diagram-setup';
import { Operations } from './service-identifiers';

@injectable()
class StubSourceModelStorage implements SourceModelStorage {
    loadSourceModel(_action: RequestModelAction): void {}
    saveSourceModel(_action: SaveModelAction): void {}
}

class TestModelModule extends GModelSourceModelModule {
    get diagramType(): string {
        return 'test-diagram';
    }

    protected bindSourceModelStorage(): BindingTarget<SourceModelStorage> {
        return StubSourceModelStorage;
    }

    protected bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
        return { constantValue: new mock.StubDiagramConfiguration() };
    }
}

class CustomNavigationModule extends NavigationModule {}

class CustomChangeBoundsModule extends ChangeBoundsModule {
    protected bindChangeBoundsOperationHandler(): OperationHandlerConstructor {
        return GModelChangeBoundsOperationHandler;
    }
}

class TestLabelEditModule extends GModelLabelEditModule {
    protected override bindLabelEditValidator(): BindingTarget<LabelEditValidator> | undefined {
        return { constantValue: new mock.TestLabelEditValidator() };
    }
}

function createServerContainer(): Container {
    const container = new Container();
    container.load(
        new ContainerModule(bind => {
            bind(Logger).toConstantValue(new mock.StubLogger());
            bind(ActionDispatchScope).toConstantValue({ enter: <R>(callback: () => R) => callback(), isReentrant: () => false });
        })
    );
    return container;
}

/** Mirrors the loading logic of the `DefaultClientSessionFactory`. */
function createSessionContainer(modules: ContainerModule[]): Container {
    const container = createServerContainer().createChild();
    container.load(...modules, createClientSessionModule({ clientId: 'client', glspClient: {} as GLSPClientProxy, clientActionKinds: [] }));
    runClientSessionInitializers(container);
    return container;
}

function moduleNames(modules: ContainerModule[]): string[] {
    return modules.map(module => module.constructor.name);
}

describe('createDiagramSetup', () => {
    it('should start with the core modules followed by the defaults', () => {
        const setup = createGModelDiagramSetup(new TestModelModule());
        expect(setup.diagramType).toBe('test-diagram');
        expect(moduleNames(setup.modules)).toEqual([
            'BaseDiagramModule',
            'TestModelModule',
            'OperationsModule',
            'UndoRedoModule',
            'ValidationModule',
            'NavigationModule',
            'ContextActionsModule',
            'PopupModule',
            'TypeHintsModule',
            'LayoutModule',
            'GModelChangeBoundsModule',
            'GModelDeleteModule',
            'GModelLabelEditModule',
            'GModelClipboardModule',
            'GModelEdgeEditModule'
        ]);
    });

    it('should replace modules with the same feature id in place', () => {
        const setup = createGModelDiagramSetup(new TestModelModule(), { replace: [new CustomNavigationModule()] });
        const names = moduleNames(setup.modules);
        expect(names).not.toContain('NavigationModule');
        // Same position as the default NavigationModule (after Base, TestModel, Operations, UndoRedo, Validation)
        expect(names.indexOf('CustomNavigationModule')).toBe(5);
    });

    it('should remove feature modules by feature id', () => {
        // The configured module is a `GModelChangeBoundsModule`, removal is requested with the generic base module
        const setup = createGModelDiagramSetup(new TestModelModule(), { remove: [new PopupModule(), new GModelChangeBoundsModule()] });
        const names = moduleNames(setup.modules);
        expect(names).not.toContain('PopupModule');
        expect(names).not.toContain('GModelChangeBoundsModule');
    });

    it('should fail if a module and its subclass are configured', () => {
        expect(() => createGModelDiagramSetup(new TestModelModule(), { add: [new CustomNavigationModule()] })).toThrow(
            /Non-unique feature ids.*glsp\.navigation/
        );
    });
});

describe('loading a diagram setup', () => {
    it('should register the same handlers as the former GModelDiagramModule', () => {
        const container = createSessionContainer(createGModelDiagramSetup(new TestModelModule()).modules);
        const actionKinds = container
            .get(ActionHandlerRegistry)
            .getAll()
            .flatMap(handler => handler.actionKinds);
        expect(new Set(actionKinds)).toEqual(
            new Set([
                'requestModel',
                'saveModel',
                'setEditMode',
                'glspUndo',
                'glspRedo',
                'requestEditValidation',
                'requestClipboardData',
                'requestMarkers',
                'requestNavigationTargets',
                'resolveNavigationTarget',
                'requestContextActions',
                'requestPopupModel',
                'requestTypeHints',
                'requestCheckEdge',
                'computedBounds',
                // operation kinds handled by the OperationActionHandler
                'compound',
                'changeBounds',
                'deleteElement',
                'applyLabelEdit',
                'cut',
                'paste',
                'reconnectEdge',
                'changeRoutingPoints',
                'layout'
            ])
        );
        expect(new Set(container.get<string[]>(Operations))).toEqual(
            new Set(
                container
                    .get(OperationHandlerRegistry)
                    .getAll()
                    .map(handler => handler.operationType)
            )
        );
    });

    it('should report all default features as capabilities', async () => {
        const container = createSessionContainer(createGModelDiagramSetup(new TestModelModule()).modules);
        const capabilities = await container.get<SessionCapabilityProvider>(SessionCapabilityProvider).getCapabilities();
        expect(capabilities).toEqual({
            [GLSPCapability.ChangeBounds]: true,
            [GLSPCapability.Delete]: true,
            [GLSPCapability.LabelEdit]: true,
            [GLSPCapability.Clipboard]: true,
            [GLSPCapability.EdgeEdit]: true,
            [GLSPCapability.UndoRedo]: true,
            [GLSPCapability.Navigation]: true,
            [GLSPCapability.Validation]: true,
            [GLSPCapability.Layout]: { kind: 'none', needsClientLayout: true, animatedUpdate: true },
            [GLSPCapability.TypeHints]: true,
            [GLSPCapability.Popup]: true,
            [GLSPCapability.ContextActions]: true
        });
    });

    it('should report removed features as disabled capabilities', async () => {
        const setup = createGModelDiagramSetup(new TestModelModule(), {
            remove: [new PopupModule(), new GModelChangeBoundsModule()],
            replace: [new TestLabelEditModule()]
        });
        const container = createSessionContainer(setup.modules);
        const capabilities = await container.get<SessionCapabilityProvider>(SessionCapabilityProvider).getCapabilities();
        expect(capabilities[GLSPCapability.Popup]).toBe(false);
        expect(capabilities[GLSPCapability.ChangeBounds]).toBe(false);
        expect(capabilities[GLSPCapability.LabelEdit]).toEqual({ validation: true });
        expect(container.get(ActionHandlerRegistry).hasKey('requestPopupModel')).toBe(false);
        expect(container.get(OperationHandlerRegistry).hasKey('changeBounds')).toBe(false);
    });

    it('should not include the source-model-dependent features in the generic defaults', async () => {
        const container = createSessionContainer(createDiagramSetup(new TestModelModule(), createDefaultDiagramModules()).modules);
        const capabilities = await container.get<SessionCapabilityProvider>(SessionCapabilityProvider).getCapabilities();
        expect(capabilities).toMatchObject({
            [GLSPCapability.ChangeBounds]: false,
            [GLSPCapability.Delete]: false,
            [GLSPCapability.LabelEdit]: false,
            [GLSPCapability.Clipboard]: false,
            [GLSPCapability.EdgeEdit]: false
        });
        expect(container.get(OperationHandlerRegistry).hasKey('changeBounds')).toBe(false);
    });

    it('should support a source-model-dependent feature via a subclass of its abstract module', async () => {
        const setup = createDiagramSetup(new TestModelModule(), createDefaultDiagramModules(), { add: [new CustomChangeBoundsModule()] });
        const container = createSessionContainer(setup.modules);
        const capabilities = await container.get<SessionCapabilityProvider>(SessionCapabilityProvider).getCapabilities();
        expect(capabilities[GLSPCapability.ChangeBounds]).toBe(true);
        expect(container.get(OperationHandlerRegistry).hasKey('changeBounds')).toBe(true);
    });

    it('should fail loading if a required module is missing', () => {
        const setup = createGModelDiagramSetup(new TestModelModule(), { remove: [new OperationsModule()] });
        expect(() => createSessionContainer(setup.modules)).toThrow(
            "Could not load feature module 'glsp.undoRedo'. Required modules are not loaded: glsp.operations"
        );
    });

    it('should fail loading if the base module is missing', () => {
        const modules = createGModelDiagramSetup(new TestModelModule()).modules.filter(module => !(module instanceof BaseDiagramModule));
        expect(() => createSessionContainer(modules)).toThrow(/Required modules are not loaded: glsp\.base/);
    });
});
