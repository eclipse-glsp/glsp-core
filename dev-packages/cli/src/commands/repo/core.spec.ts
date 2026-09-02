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

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { cleanupTempDir, createTempDir } from '../../../tests/helpers/test-helper';
import { Command } from 'commander';
import {
    BROWSER_BUNDLE_PATH,
    CoreClientCommand,
    CoreClientStartCommand,
    CoreServerCommand,
    CoreServerStartCommand,
    NODE_BUNDLE_PATH,
    WORKFLOW_SERVER_EXAMPLE_DIR,
    resolveBundlePath,
    resolveExampleDir
} from './core';

function subcommandNames(cmd: Command): string[] {
    return cmd.commands.map(c => c.name());
}

/** Captures everything written to stdout until `restore()` is called, which returns the output. */
function captureStdout(): { restore: () => string } {
    const chunks: string[] = [];
    const original = process.stdout.write;
    (process.stdout.write as any) = (chunk: string) => {
        chunks.push(chunk);
        return true;
    };
    return {
        restore: () => {
            process.stdout.write = original;
            return chunks.join('');
        }
    };
}

describe('core', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        cleanupTempDir(tempDir);
    });

    describe('resolveBundlePath', () => {
        function createBundle(relativePath: string): string {
            const bundlePath = path.join(tempDir, relativePath);
            fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
            fs.writeFileSync(bundlePath, 'fake-bundle');
            return bundlePath;
        }

        it('should return absolute path when browser bundle exists', () => {
            createBundle(BROWSER_BUNDLE_PATH);
            const result = resolveBundlePath(tempDir, BROWSER_BUNDLE_PATH, 'Browser bundle');
            expect(result).toBe(path.resolve(tempDir, BROWSER_BUNDLE_PATH));
        });

        it('should return absolute path when node bundle exists', () => {
            createBundle(NODE_BUNDLE_PATH);
            const result = resolveBundlePath(tempDir, NODE_BUNDLE_PATH, 'Node server bundle');
            expect(result).toBe(path.resolve(tempDir, NODE_BUNDLE_PATH));
        });

        it('should throw when bundle does not exist', () => {
            expect(() => resolveBundlePath(tempDir, BROWSER_BUNDLE_PATH, 'Browser bundle')).toThrow(/Browser bundle not found/);
        });

        it('should include the expected path in the error message', () => {
            expect(() => resolveBundlePath(tempDir, NODE_BUNDLE_PATH, 'Node server bundle')).toThrow(
                new RegExp(NODE_BUNDLE_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            );
        });

        it('should include build hint in the error message', () => {
            expect(() => resolveBundlePath(tempDir, BROWSER_BUNDLE_PATH, 'Browser bundle')).toThrow(/glsp repo core build/);
        });
    });

    describe('resolveExampleDir', () => {
        it('should resolve an example inside the glsp-core checkout', () => {
            fs.mkdirSync(path.join(tempDir, 'glsp-core'), { recursive: true });
            const result = resolveExampleDir('examples/workflow-standalone', tempDir);
            expect(result).toBe(path.join(tempDir, 'glsp-core', 'examples/workflow-standalone'));
        });

        it('should not duplicate the repo segment when --dir already points at glsp-core', () => {
            const repoDir = path.join(tempDir, 'glsp-core');
            fs.mkdirSync(repoDir, { recursive: true });
            const result = resolveExampleDir('examples/workflow-server', repoDir);
            expect(result).toBe(path.join(repoDir, 'examples/workflow-server'));
        });
    });

    describe('component command groups', () => {
        it('should expose client and server groups', () => {
            expect(CoreClientCommand.name()).toBe('client');
            expect(CoreServerCommand.name()).toBe('server');
        });

        it('should expose a start command per component', () => {
            expect(subcommandNames(CoreClientCommand)).toContain('start');
            expect(subcommandNames(CoreServerCommand)).toContain('start');
        });

        it('should expose the bundle-path commands on the server group', () => {
            expect(subcommandNames(CoreServerCommand)).toEqual(expect.arrayContaining(['node-bundle', 'browser-bundle']));
        });

        it('should allow passthrough args on the start commands', () => {
            for (const cmd of [CoreClientStartCommand, CoreServerStartCommand]) {
                expect((cmd as any)._allowUnknownOption).toBe(true);
                expect((cmd as any)._allowExcessArguments).toBe(true);
            }
        });

        it('should propagate --dir from the component group down to the resolved command', async () => {
            fs.mkdirSync(path.join(tempDir, 'glsp-core'), { recursive: true });
            const written = captureStdout();
            await CoreServerCommand.parseAsync(['node', 'test', '-d', tempDir, 'start', '--dry-run'], { from: 'node' });
            expect(written.restore()).toContain(path.join(tempDir, 'glsp-core', WORKFLOW_SERVER_EXAMPLE_DIR));
        });
    });
});
