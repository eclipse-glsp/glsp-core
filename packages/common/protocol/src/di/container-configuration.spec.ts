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
import { describe, expect, it, vi } from 'vitest';
import { Container, ContainerModule } from 'inversify';
import {
    FeatureResolutionError,
    initializeContainerAsync,
    loadFeatures,
    resolveContainerConfiguration,
    resolveFeatures
} from './container-configuration';
import { FeatureDefinition, defineFeature } from './feature-definition';
import { FeatureKey } from '../features/feature-key';
import { FeatureModule } from './feature-module';

const moduleA = new FeatureModule(() => {}, { featureId: Symbol('moduleA') });
const moduleB = new FeatureModule(() => {}, { featureId: Symbol('moduleB') });
const moduleC = new FeatureModule(() => {}, { featureId: Symbol('moduleC'), requires: [moduleA, moduleB] });

FeatureModule.DEBUG_LOG_ENABLED = true;
const container = new Container();
container.load(moduleC);

describe('Container configuration', () => {
    describe('resolveContainerConfiguration', () => {
        it('should resolve the given container modules in incoming order', () => {
            const result = resolveContainerConfiguration(moduleA, moduleB, moduleC);
            expect(result).toEqual([moduleA, moduleB, moduleC]);
        });
        it('should resolve the same container module only once', () => {
            const result = resolveContainerConfiguration(moduleA, moduleA);
            expect(result).toEqual([moduleA]);
        });
        it('should resolve the given container modules and add configurations', () => {
            const result = resolveContainerConfiguration(moduleA, { add: [moduleB, moduleC] });
            expect(result).toEqual([moduleA, moduleB, moduleC]);
        });
        it('should resolve the given container modules/add configurations and not load modules from remove configurations', () => {
            const result = resolveContainerConfiguration(moduleA, {
                add: [moduleB, moduleC],
                remove: moduleA
            });
            expect(result).toEqual([moduleB, moduleC]);
        });
        it('should resolve a module from a remove configuration if it is re-added with a subsequent add configuration', () => {
            const result = resolveContainerConfiguration(moduleA, { remove: moduleA }, moduleA);
            expect(result).toEqual([moduleA]);
        });
        it('should resolve a module from a replace configuration instead of a prior added module with the same feature id', () => {
            const replaceModule = new FeatureModule(() => {}, { featureId: moduleA.featureId });
            const result = resolveContainerConfiguration(moduleA, moduleB, { replace: replaceModule });
            expect(result).toEqual([replaceModule, moduleB]);
        });

        it('should still resolve a module from a replace configuration if there is no prior added module with the same featureId to replace', () => {
            const replaceModule = new FeatureModule(() => {}, { featureId: Symbol('replaceModule') });
            const result = resolveContainerConfiguration(moduleA, moduleB, { replace: replaceModule });
            expect(result).toEqual([moduleA, moduleB, replaceModule]);
        });
        it('should remove a replaced module via a remove configuration with a module that has the same feature id', () => {
            const replaceModule = new FeatureModule(() => {}, { featureId: moduleA.featureId });
            const result = resolveContainerConfiguration(moduleA, moduleB, { replace: replaceModule }, { remove: moduleA });
            expect(result).toEqual([moduleB]);
        });
        it('should remove plain container modules by identity', () => {
            const plainModule = new ContainerModule(() => {});
            const otherPlainModule = new ContainerModule(() => {});
            const result = resolveContainerConfiguration(plainModule, otherPlainModule, { remove: plainModule });
            expect(result).toEqual([otherPlainModule]);
        });
        it('should throw an error for a configuration that resolves to multiple feature modules with the same featureId', () => {
            const duplicateModule = new FeatureModule(() => {}, { featureId: moduleA.featureId });
            expect(() => resolveContainerConfiguration(moduleA, duplicateModule)).toThrow();
        });
    });

    describe('resolveFeatures', () => {
        const featureModule = (key: FeatureKey): FeatureModule => new FeatureModule(() => {}, { featureId: FeatureKey.toId(key) });
        const lazyFeature = (key: FeatureKey, options?: Parameters<typeof defineFeature>[2]): FeatureDefinition =>
            defineFeature(
                key,
                vi.fn(() => Promise.resolve(featureModule(key))),
                options
            );
        const ids = (features: unknown[]): string[] => features.map(f => (FeatureDefinition.is(f) ? f.id : String(f)));

        it('should remove a feature by key without invoking its factory', async () => {
            const a = lazyFeature('test.a');
            const b = lazyFeature('test.b');
            const modules = await loadFeatures(resolveFeatures(a, b, { remove: 'test.a' }));
            expect(modules.map(m => (m as FeatureModule).featureId)).toEqual([FeatureKey.toId('test.b')]);
            expect(a.load).not.toHaveBeenCalled();
            expect(b.load).toHaveBeenCalledOnce();
        });
        it('should remove a feature definition via a module with the same feature id', () => {
            const result = resolveFeatures(lazyFeature('test.a'), lazyFeature('test.b'), { remove: featureModule('test.a') });
            expect(ids(result)).toEqual(['test.b']);
        });
        it('should remove a feature module by key', () => {
            const keyedModuleB = featureModule('test.b');
            const result = resolveFeatures(featureModule('test.a'), keyedModuleB, { remove: 'test.a' });
            expect(result).toEqual([keyedModuleB]);
        });
        it('should replace a feature definition in place', () => {
            const replacement = lazyFeature('test.a');
            const result = resolveFeatures(lazyFeature('test.a'), lazyFeature('test.b'), { replace: replacement });
            expect(result[0]).toBe(replacement);
            expect(ids(result)).toEqual(['test.a', 'test.b']);
        });
        it('should replace a feature definition with an eagerly created module', () => {
            const replacement = featureModule('test.a');
            const result = resolveFeatures(lazyFeature('test.a'), lazyFeature('test.b'), { replace: replacement });
            expect(result[0]).toBe(replacement);
        });
        it('should move required features before their dependents', () => {
            const result = resolveFeatures(lazyFeature('test.a', { requires: 'test.b' }), lazyFeature('test.c'), lazyFeature('test.b'));
            expect(ids(result)).toEqual(['test.b', 'test.a', 'test.c']);
        });
        it('should order feature modules by their required modules', () => {
            const keyedModuleB = featureModule('test.b');
            const keyedModuleA = new FeatureModule(() => {}, { featureId: FeatureKey.toId('test.a'), requires: 'test.b' });
            expect(resolveFeatures(keyedModuleA, keyedModuleB)).toEqual([keyedModuleB, keyedModuleA]);
        });
        it('should drop a feature (transitively) if an extended feature is removed', () => {
            const result = resolveFeatures(
                lazyFeature('test.a'),
                lazyFeature('test.b', { extends: 'test.a' }),
                lazyFeature('test.c', { extends: 'test.b' }),
                lazyFeature('test.d'),
                { remove: 'test.a' }
            );
            expect(ids(result)).toEqual(['test.d']);
        });
        it('should throw if a required feature is missing', () => {
            expect(() => resolveFeatures(lazyFeature('test.a', { requires: 'test.b' }))).toThrow(
                expect.objectContaining({ kind: 'missing', message: expect.stringContaining("'test.a' requires 'test.b'") })
            );
        });
        it('should throw if the dependencies contain a cycle', () => {
            expect(() =>
                resolveFeatures(
                    lazyFeature('test.a', { requires: 'test.b' }),
                    lazyFeature('test.b', { requires: 'test.c' }),
                    lazyFeature('test.c', { requires: 'test.a' })
                )
            ).toThrow(expect.objectContaining({ kind: 'cycle', message: expect.stringContaining('test.a -> test.b -> test.c -> test.a') }));
        });
        it('should throw if the same feature id is added twice', () => {
            expect(() => resolveFeatures(lazyFeature('test.a'), { add: lazyFeature('test.a') })).toThrow(FeatureResolutionError);
        });
        it('should load a feature only once if it is configured as definition and as the module it loads', async () => {
            const module = featureModule('test.a');
            const modules = await loadFeatures(
                resolveFeatures(
                    defineFeature('test.a', () => module),
                    { add: module }
                )
            );
            expect(modules).toEqual([module]);
        });
        it('should throw if a feature is configured as definition and as a different module', async () => {
            const features = resolveFeatures(lazyFeature('test.a'), { add: featureModule('test.a') });
            await expect(loadFeatures(features)).rejects.toThrow(expect.objectContaining({ kind: 'duplicate' }));
        });
        it('should replace a feature that is configured as definition and as module', () => {
            const replacement = featureModule('test.a');
            const result = resolveFeatures(
                lazyFeature('test.a'),
                lazyFeature('test.b'),
                { add: featureModule('test.a') },
                { replace: replacement }
            );
            expect(result).toEqual([replacement, expect.objectContaining({ id: 'test.b' })]);
        });
        it('should throw for a feature definition with an invalid id', () => {
            const invalid = { id: 'invalid.', load: () => featureModule('test.a') } as unknown as FeatureDefinition;
            expect(() => resolveFeatures(invalid)).toThrow(expect.objectContaining({ kind: 'invalid' }));
        });
        it('should throw for a feature definition with an invalid id in an add or replace configuration', () => {
            const invalid = { id: 'simulation', load: () => featureModule('test.a') } as unknown as FeatureDefinition;
            expect(() => resolveFeatures({ add: invalid })).toThrow(expect.objectContaining({ kind: 'invalid' }));
            expect(() => resolveFeatures({ replace: invalid })).toThrow(expect.objectContaining({ kind: 'invalid' }));
        });
        it('should warn about removed features that are not configured', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            try {
                const result = resolveFeatures(lazyFeature('test.a'), { remove: ['test.a', 'test.typo'] });
                expect(result).toEqual([]);
                expect(warn).toHaveBeenCalledTimes(1);
                expect(warn).toHaveBeenCalledWith(expect.stringContaining("'test.typo'"));
            } finally {
                warn.mockRestore();
            }
        });
        it('should derive the module options from a feature definition', () => {
            const definition = defineFeature('test.a', () => featureModule('test.a'), { requires: 'test.b', extends: 'test.c' });
            expect(FeatureDefinition.toModuleOptions(definition)).toEqual({
                featureId: FeatureKey.toId('test.a'),
                requires: ['test.b', 'test.c']
            });
            expect(FeatureDefinition.toModuleOptions(defineFeature('test.d', () => featureModule('test.d')))).toEqual({
                featureId: FeatureKey.toId('test.d'),
                requires: undefined
            });
        });
        it('should throw if a factory returns a module with a different feature id', async () => {
            const definition = defineFeature('test.a', () => featureModule('test.b'));
            await expect(loadFeatures(resolveFeatures(definition))).rejects.toThrow(expect.objectContaining({ kind: 'mismatch' }));
        });
        it('should throw if an asynchronous feature is resolved synchronously', () => {
            expect(() => resolveContainerConfiguration(lazyFeature('test.a'))).toThrow(/synchronously/);
        });
        it('should load synchronous feature definitions synchronously', () => {
            const module = featureModule('test.a');
            expect(resolveContainerConfiguration(FeatureDefinition.fromModule(module))).toEqual([module]);
        });
        it('should load lazily defined features into the container', async () => {
            const loaded = vi.fn();
            const definition = defineFeature('test.a', () =>
                Promise.resolve(new FeatureModule(loaded, { featureId: FeatureKey.toId('test.a') }))
            );
            const testContainer = await initializeContainerAsync(new Container(), definition);
            expect(loaded).toHaveBeenCalledOnce();
            expect(testContainer.isBound(FeatureKey.toId('test.a'))).toBe(true);
        });
    });
});
