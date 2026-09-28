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
import { Metafile, Plugin, build } from 'esbuild';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Loads stylesheets as JS modules that inject the style when they are evaluated, like webpack's `style-loader`.
 * Note that esbuild's native CSS bundling does not split stylesheets: it merges the stylesheets of all lazily imported
 * chunks into the stylesheet of the entry point, so a removed feature's stylesheet is only excluded with bundlers that
 * load stylesheets per chunk.
 */
const injectStylesPlugin: Plugin = {
    name: 'inject-styles',
    setup: pluginBuild => {
        pluginBuild.onLoad({ filter: /\.css$/ }, args => ({
            contents: `document.head.append(Object.assign(document.createElement('style'), { dataset: { file: ${JSON.stringify(args.path)} } }));`,
            loader: 'js'
        }));
    }
};

/**
 * Bundles the given entry source (resolved relative to `src`) with code splitting and returns the input files and
 * stylesheets that are statically reachable from the entry chunk, i.e. that are loaded when the entry is loaded.
 * External packages are not bundled, so only the sources of this package are checked.
 *
 * Stylesheets are bundled as JS modules that inject the style (see {@link injectStylesPlugin}), i.e. they belong to the
 * chunk that imports them.
 */
async function bundleStatically(contents: string): Promise<string[]> {
    const result = await build({
        stdin: { contents, resolveDir: __dirname, sourcefile: 'entry.ts', loader: 'ts' },
        bundle: true,
        splitting: true,
        format: 'esm',
        platform: 'browser',
        packages: 'external',
        outdir: path.join(__dirname, 'out'),
        write: false,
        metafile: true,
        plugins: [injectStylesPlugin],
        logLevel: 'silent'
    });
    const outputs = result.metafile.outputs;
    const entry = Object.keys(outputs).find(file => outputs[file].entryPoint?.endsWith('entry.ts'));
    if (!entry) {
        throw new Error('Could not find entry chunk');
    }
    const reachable = new Set<string>();
    const visit = (file: string): void => {
        if (reachable.has(file)) {
            return;
        }
        reachable.add(file);
        const output: Metafile['outputs'][string] = outputs[file];
        output.imports.filter(i => i.kind === 'import-statement' && !i.external).forEach(i => visit(i.path));
    };
    visit(entry);
    return [...reachable].flatMap(file => Object.keys(outputs[file].inputs));
}

/**
 * Note that these tests bundle the TypeScript sources, which esbuild parses as ES modules. The published `lib` is
 * compiled to CommonJS, where the lazy `import()`s become `require` calls that bundlers treat as static dependencies, i.e.
 * adopters don't get separate chunks for the default features yet. The tests guard that the sources stay splittable
 * (no static import of a feature implementation from the feature definitions), which an ES module build of `lib` relies on.
 *
 * Importing the `index` barrel is not covered: its `export *` of each feature module keeps every module that imports a
 * stylesheet (a declared side effect) in the entry chunk, so an ES module build alone would not help adopters that
 * import from the package entry point.
 */
const CHANGE_BOUNDS_TOOL = 'features/tools/change-bounds/change-bounds-tool-module.ts';
const CHANGE_BOUNDS_CSS = 'css/change-bounds.css';

describe('default features bundling', () => {
    it('should not statically include the code and stylesheet of a removed default feature', async () => {
        const inputs = await bundleStatically(`
            import { Container } from 'inversify';
            import { initializeDiagramContainer } from './client-init';
            import { GLSPClientFeature } from './client-feature-keys';
            export const load = () => initializeDiagramContainer(new Container(), { remove: GLSPClientFeature.ChangeBoundsTool });
        `);
        expect(inputs.some(input => input.endsWith('client-feature-definitions.ts'))).toBe(true);
        expect(inputs.some(input => input.endsWith(CHANGE_BOUNDS_TOOL))).toBe(false);
        expect(inputs.some(input => input.endsWith(CHANGE_BOUNDS_CSS))).toBe(false);
    }, 30_000);

    it('should statically include the code and stylesheet of a feature module that is imported directly', async () => {
        const inputs = await bundleStatically(`
            export { changeBoundsToolModule } from './features/tools/change-bounds/change-bounds-tool-module';
        `);
        expect(inputs.some(input => input.endsWith(CHANGE_BOUNDS_TOOL))).toBe(true);
        expect(inputs.some(input => input.endsWith(CHANGE_BOUNDS_CSS))).toBe(true);
    }, 30_000);
});
