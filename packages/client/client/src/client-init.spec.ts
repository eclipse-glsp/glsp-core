/********************************************************************************
 * Copyright (c) 2024-2026 EclipseSource and others.
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
import { FeatureKey, FeatureModule, FeatureResolutionError, defineFeature } from '@eclipse-glsp/sprotty';
import { Container } from 'inversify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultModule } from './base/default.module';
import { DEFAULT_FEATURES, GLSPOptionalFeatures } from './client-feature-definitions';
import { initializeDiagramContainer } from './client-init';
import { GLSPClientFeature } from './client-feature-keys';
import { GLSPStandaloneFeature } from './integration/standalone/standalone-feature-keys';
import { STANDALONE_MODULE_CONFIG } from './integration/standalone/standalone-feature-definitions';

describe('client-init', () => {
    // InitializeDiagramContainer internally uses `resolveFeatures` so we only test functionality
    // that is not covered by the tests of `resolveFeatures`.
    describe('initializeDiagramContainer', () => {
        const container = new Container();
        let loadSpy: ReturnType<typeof vi.spyOn>;
        container.snapshot();

        beforeEach(() => {
            container.restore();
            container.snapshot();
            loadSpy = vi.spyOn(container, 'load');
        });
        afterEach(() => {
            loadSpy.mockRestore();
        });
        const loadedFeatureIds = (): symbol[] => [...loadSpy.mock.calls[0]].map(module => (module as FeatureModule).featureId);
        const spyOnDefaultFeature = (key: FeatureKey): ReturnType<typeof vi.spyOn> => {
            const definition = DEFAULT_FEATURES.find(feature => feature.id === key);
            if (!definition) {
                throw new Error(`No default feature with key '${key}'`);
            }
            return vi.spyOn(definition, 'load');
        };

        it('should initialize the diagram container with the default features in addition to the given config and load them first', async () => {
            const extraModule = new FeatureModule(() => {});
            await initializeDiagramContainer(container, { add: extraModule });
            expect(loadSpy).toHaveBeenCalledOnce();
            const featureIds = loadedFeatureIds();
            expect(featureIds.pop()).toBe(extraModule.featureId);
            expect(featureIds).toEqual(DEFAULT_FEATURES.map(feature => FeatureKey.toId(feature.id)));
            expect(featureIds[0]).toBe(defaultModule.featureId);
        });
        it('should not load a default feature that is removed by key', async () => {
            await initializeDiagramContainer(container, { remove: GLSPClientFeature.ChangeBoundsTool });
            expect(loadedFeatureIds()).not.toContain(FeatureKey.toId(GLSPClientFeature.ChangeBoundsTool));
            expect(container.isBound(FeatureKey.toId(GLSPClientFeature.ChangeBoundsTool))).toBe(false);
        });
        it('should not invoke the factory of a default feature that is removed by key', async () => {
            const changeBoundsToolLoad = spyOnDefaultFeature(GLSPClientFeature.ChangeBoundsTool);
            const toolPaletteLoad = spyOnDefaultFeature(GLSPClientFeature.ToolPalette);
            try {
                await initializeDiagramContainer(container, { remove: GLSPClientFeature.ChangeBoundsTool });
                expect(changeBoundsToolLoad).not.toHaveBeenCalled();
                expect(toolPaletteLoad).toHaveBeenCalledOnce();
            } finally {
                changeBoundsToolLoad.mockRestore();
                toolPaletteLoad.mockRestore();
            }
        });
        it('should load a replacement feature under the same key instead of the default feature', async () => {
            const defaultLoad = spyOnDefaultFeature(GLSPClientFeature.ToolPalette);
            const registry = vi.fn();
            const replacement = defineFeature(GLSPClientFeature.ToolPalette, () =>
                Promise.resolve(new FeatureModule(registry, { featureId: FeatureKey.toId(GLSPClientFeature.ToolPalette) }))
            );
            try {
                await initializeDiagramContainer(container, { replace: replacement });
                expect(registry).toHaveBeenCalledOnce();
                expect(defaultLoad).not.toHaveBeenCalled();
                expect(loadedFeatureIds().filter(id => id === FeatureKey.toId(GLSPClientFeature.ToolPalette))).toHaveLength(1);
            } finally {
                defaultLoad.mockRestore();
            }
        });
        it('should drop a standalone feature if the extended default feature is removed', async () => {
            await initializeDiagramContainer(container, { remove: GLSPClientFeature.Viewport }, STANDALONE_MODULE_CONFIG);
            expect(loadedFeatureIds()).not.toContain(FeatureKey.toId(GLSPStandaloneFeature.Viewport));
            expect(loadedFeatureIds()).toContain(FeatureKey.toId(GLSPStandaloneFeature.Select));
        });
        it('should load an optional feature only once if it is also added as module object', async () => {
            const { gridModule } = await import('./features/grid/grid-module');
            await initializeDiagramContainer(container, { add: [GLSPOptionalFeatures.Grid, gridModule] });
            expect(loadedFeatureIds().filter(id => id === gridModule.featureId)).toHaveLength(1);
        });
        it('should derive the module options from the feature definitions', async () => {
            const { nodeCreationToolModule } = await import('./features/tools/node-creation/node-creation-module');
            const { standaloneViewportModule } = await import('./integration/standalone/features/viewport/standalone-viewport-module');
            expect(nodeCreationToolModule.featureId).toBe(FeatureKey.toId(GLSPClientFeature.NodeCreationTool));
            expect(nodeCreationToolModule.requires).toEqual([GLSPClientFeature.ElementTemplate]);
            expect(standaloneViewportModule.requires).toEqual([GLSPClientFeature.Viewport]);
        });
        it('should throw an error if the default module is removed via configuration', async () => {
            await expect(initializeDiagramContainer(container, { remove: GLSPClientFeature.Default })).rejects.toThrow(
                FeatureResolutionError
            );
        });
        it('should throw an error if a required default feature is removed', async () => {
            await expect(initializeDiagramContainer(container, { remove: GLSPClientFeature.ElementTemplate })).rejects.toThrow(
                /'glsp.nodeCreationTool' requires 'glsp.elementTemplate'/
            );
        });
        it('should load the default module first even if it is removed and added again', async () => {
            await initializeDiagramContainer(container, { remove: defaultModule, add: defaultModule });
            expect(loadedFeatureIds()[0]).toBe(defaultModule.featureId);
        });
        it('should throw an error if a replacement of the default feature has dependencies', async () => {
            const replacement = defineFeature(GLSPClientFeature.Default, () => defaultModule, { requires: GLSPClientFeature.Select });
            await expect(initializeDiagramContainer(container, { replace: replacement })).rejects.toThrow(
                expect.objectContaining({ kind: 'invalid' })
            );
        });
    });
});
