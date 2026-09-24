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
import glspConfig from '@eclipse-glsp/oxlint-config';
import { defineConfig } from 'oxlint';

// Relative index and src imports restricted by the shared @eclipse-glsp/oxlint-config.
// Must be included in every `no-restricted-imports` override since an override replaces the entire rule value.
const restrictedBaseImports = ['..', '../index', '../..', '../../index', 'src'];

// Example packages by framework layer. The `examples/` directory is flat (no client/server
// subdirs), so the client/server lint distinction is expressed per example package rather than
// by path prefix.
const clientExampleGlobs = ['examples/workflow-glsp/**/*.{ts,tsx}', 'examples/workflow-standalone/**/*.{ts,tsx}'];
const serverExampleGlobs = ['examples/workflow-server/**/*.{ts,tsx}', 'examples/workflow-server-mcp-demo/**/*.{ts,tsx}'];

/** `no-restricted-imports` entries that forbid a package and all of its subpaths with the same message. */
function restrictPackage(name: string, message: string): { name: string; message: string }[] {
    return [
        { name, message },
        { name: `${name}/*`, message }
    ];
}

function restrictUuid(helperSource: string): { name: string; message: string }[] {
    return restrictPackage('uuid', `Use the 'generateUuid'/'isUuid' helpers (from ${helperSource}) instead of importing 'uuid' directly.`);
}

/**
 * Import specifiers that resolve to the importing module's own directory barrel or to one of its
 * parent barrels, up to `depth` levels: `'.'`, `'..'`, `'../..'`, ...
 */
function ownAndParentBarrels(depth: number): string[] {
    return [
        '.',
        ...Array.from({ length: depth }, (_, level) =>
            Array(level + 1)
                .fill('..')
                .join('/')
        )
    ];
}

export default defineConfig({
    extends: [glspConfig],
    options: {
        // Root-only options. `typeAware` enables the type-aware rules of the shared config (`typescript/no-deprecated`)
        // and the `no-floating-promises` check of the e2e packages via `oxlint-tsgolint`. `typeCheck` additionally
        // reports the TypeScript compiler diagnostics of the same program, so `pnpm lint` is a complete static check
        // without a prior build: workspace packages are resolved to their sources through the tsconfig project
        // references, and the root config files (which no tsconfig covers) are checked as well.
        typeAware: true,
        typeCheck: true
    },
    // Ignore JS/MJS/CJS config/build files, script directories, generated output and local git worktrees
    ignorePatterns: [
        '**/{css,node_modules,lib,dist}',
        '**/*.d.ts',
        '**/*.map',
        '**/*.js',
        '**/*.mjs',
        '**/*.cjs',
        '**/scripts/',
        '.worktrees/'
    ],
    overrides: [
        /* ----------------------------------------------------------------------------------------
         * Common packages shared between client and server
         * ---------------------------------------------------------------------------------------- */
        // packages/common/protocol: restrict sprotty and uuid direct imports
        {
            files: ['packages/common/protocol/src/**/*.{ts,tsx}'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    ...restrictedBaseImports,
                    ...restrictPackage(
                        'sprotty',
                        "The protocol package should not have any direct 'sprotty' dependencies. Try to use 'sprotty-protocol' instead"
                    ),
                    ...restrictUuid("this package's 'utils/uuid' module")
                ]
            }
        },

        /* ----------------------------------------------------------------------------------------
         * Client packages and examples
         * ---------------------------------------------------------------------------------------- */
        // svg/html template vars are intentionally unused in client/sprotty view code
        {
            files: ['packages/client/**/*.{ts,tsx}', ...clientExampleGlobs],
            rules: {
                'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: 'svg|html' }]
            }
        },
        // Default client rules: restrict raw sprotty/sprotty-protocol and uuid direct imports
        {
            files: ['packages/client/**/*.{ts,tsx}'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    ...restrictedBaseImports,
                    {
                        name: 'sprotty',
                        message:
                            "The sprotty default exports are customized and reexported by GLSP. Please use '@eclipse-glsp/client' instead"
                    },
                    {
                        name: 'sprotty-protocol',
                        message:
                            "The sprotty-protocol default exports are customized and reexported by GLSP. Please use '@eclipse-glsp/client' instead"
                    },
                    ...restrictUuid("'@eclipse-glsp/protocol'")
                ]
            }
        },
        // packages/client/glsp-sprotty: restrict direct sprotty-protocol imports
        {
            files: ['packages/client/glsp-sprotty/src/**/*.{ts,tsx}'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    ...restrictedBaseImports,
                    { name: 'sprotty-protocol', message: 'Please use @eclipse-glsp/sprotty instead' },
                    { name: 'sprotty-protocol/*', message: "Please use '@eclipse-glsp/protocol' instead" },
                    ...restrictUuid("'@eclipse-glsp/protocol'")
                ]
            }
        },
        // packages/client/client: restrict direct sprotty/sprotty-protocol/@eclipse-glsp/protocol imports
        {
            files: ['packages/client/client/src/**/*.{ts,tsx}'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    ...restrictedBaseImports,
                    ...restrictPackage('sprotty', 'Please use @eclipse-glsp/sprotty instead'),
                    ...restrictPackage('sprotty-protocol', 'Please use @eclipse-glsp/sprotty instead'),
                    ...restrictPackage('@eclipse-glsp/protocol', 'Please use @eclipse-glsp/sprotty instead'),
                    ...restrictUuid("'@eclipse-glsp/sprotty'")
                ]
            }
        },
        // client examples: only consume the public '@eclipse-glsp/client' API; the lower layers
        // (protocol, sprotty, raw sprotty/sprotty-protocol) are re-exported through it.
        {
            files: [...clientExampleGlobs],
            rules: {
                'no-restricted-imports': [
                    'error',
                    ...restrictedBaseImports,
                    ...restrictPackage('sprotty', 'Please use @eclipse-glsp/client instead'),
                    ...restrictPackage('sprotty-protocol', 'Please use @eclipse-glsp/client instead'),
                    ...restrictPackage('@eclipse-glsp/protocol', 'Please use @eclipse-glsp/client instead'),
                    ...restrictPackage('@eclipse-glsp/sprotty', 'Please use @eclipse-glsp/client instead'),
                    ...restrictUuid("'@eclipse-glsp/client'")
                ]
            }
        },

        /* ----------------------------------------------------------------------------------------
         * Server packages and examples
         * ---------------------------------------------------------------------------------------- */
        {
            files: ['packages/server/**/*.{ts,tsx}', ...serverExampleGlobs],
            rules: {
                'no-shadow': 'off'
            }
        },
        // Default server rules: restrict direct sprotty-protocol and uuid imports.
        // Covers the lower-layer packages (graph, server) which may consume '@eclipse-glsp/protocol' directly.
        {
            files: ['packages/server/**/*.{ts,tsx}'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    ...restrictedBaseImports,
                    ...restrictPackage(
                        'sprotty-protocol',
                        "The sprotty-protocol default exports are customized and reexported by GLSP. Please import from '@eclipse-glsp/protocol' instead"
                    ),
                    ...restrictUuid("'@eclipse-glsp/protocol'")
                ]
            }
        },
        // Server examples and the higher-layer server packages: consume the public '@eclipse-glsp/server' API only.
        {
            files: [...serverExampleGlobs, 'packages/server/layout-elk/src/**/*.{ts,tsx}', 'packages/server/server-mcp/src/**/*.{ts,tsx}'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    ...restrictedBaseImports,
                    ...restrictPackage('sprotty-protocol', 'Please import from @eclipse-glsp/server instead'),
                    ...restrictPackage('@eclipse-glsp/protocol', 'Please import from @eclipse-glsp/server instead'),
                    ...restrictUuid("'@eclipse-glsp/server'")
                ]
            }
        },

        /* ----------------------------------------------------------------------------------------
         * E2E packages
         * ---------------------------------------------------------------------------------------- */
        {
            files: ['e2e/**/*.{ts,tsx}'],
            rules: {
                // A dangling promise in a page object silently drops the Playwright action it wraps.
                'typescript/no-floating-promises': 'error',
                'no-restricted-imports': [
                    'error',
                    {
                        paths: [
                            // `'.'`, `'..'`, `'../..'`, ... resolve to an own or parent barrel, which
                            // re-exports the importing module itself. Type-only is fine, because the
                            // import erases; a value import closes a runtime cycle and yields a
                            // partially initialized module.
                            //
                            // Listed as exact paths rather than a pattern, because
                            // `no-restricted-imports` matches patterns gitignore-style and `'..'` would
                            // then match every relative import. Generated well past the deepest source
                            // directory so that adding a nesting level cannot silently uncover a barrel.
                            ...ownAndParentBarrels(10).map(name => ({
                                name,
                                allowTypeImports: true,
                                message:
                                    'Importing an own or parent barrel closes a runtime import cycle. Import the defining ' +
                                    'module directly, or keep the import type-only with `import type`.'
                            })),
                            { name: 'src' }
                        ],
                        patterns: [
                            { group: ['**/../index'] },
                            {
                                group: [
                                    // Matches the core package and the integration packages built on it.
                                    '@eclipse-glsp/playwright*/src/**',
                                    '@eclipse-glsp/playwright*/lib/**',
                                    '@eclipse-glsp-examples/workflow-e2e*/src/**',
                                    '@eclipse-glsp-examples/workflow-e2e*/lib/**'
                                ],
                                message:
                                    'Import from the package root instead. Deep imports are resolved by the Playwright require hook ' +
                                    'and load a second copy of the module graph. If a symbol is unreachable, export it from the barrel.'
                            }
                        ]
                    }
                ]
            }
        },

        /* ----------------------------------------------------------------------------------------
         * Framework packages
         * ---------------------------------------------------------------------------------------- */
        // `typescript/no-deprecated` is checker-exact and also reports the in-package uses of members that
        // are intentionally kept for backwards compatibility (deprecated actions, providers, compatibility
        // shims). Keep it on for consumers of the packages (examples, e2e, dev-packages), where a deprecated
        // API should be replaced, and off inside the packages that define them.
        {
            files: ['packages/**/*.{ts,tsx}'],
            rules: {
                'typescript/no-deprecated': 'off'
            }
        },

        /* ----------------------------------------------------------------------------------------
         * Test files (all groups)
         * ---------------------------------------------------------------------------------------- */
        {
            files: ['**/*.spec.{ts,tsx}'],
            rules: {
                'no-unused-expressions': 'off'
            }
        }
    ]
});
