import glspConfig from '@eclipse-glsp/eslint-config';

// Relative index and src imports restricted by the shared @eclipse-glsp/eslint-config.
// Must be included in every `no-restricted-imports` override since flat config replaces the entire rule value.
const restrictedBaseImports = ['..', '../index', '../..', '../../index', 'src'];

// Example packages by framework layer. The `examples/` directory is flat (no client/server
// subdirs), so the client/server lint distinction is expressed per example package rather than
// by path prefix.
const clientExampleGlobs = ['examples/workflow-glsp/**/*.{ts,tsx}', 'examples/workflow-standalone/**/*.{ts,tsx}'];
const serverExampleGlobs = ['examples/workflow-server/**/*.{ts,tsx}', 'examples/workflow-server-mcp-demo/**/*.{ts,tsx}'];

export default [
    ...glspConfig,
    // Ignore JS/MJS/CJS config/build files, script directories and local git worktrees
    { ignores: ['**/*.js', '**/*.mjs', '**/*.cjs', '**/scripts/', '.worktrees/'] },
    // TypeScript parser options
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: import.meta.dirname
            }
        }
    },

    /* ----------------------------------------------------------------------------------------
     * Common packages shared between client and server (migrated from glsp-client)
     * ---------------------------------------------------------------------------------------- */
    // packages/common/protocol: restrict sprotty and uuid direct imports
    {
        files: ['packages/common/protocol/src/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'warn',
                ...restrictedBaseImports,
                {
                    name: 'sprotty',
                    message: "The protocol package should not have any direct 'sprotty' dependencies. Try to use 'sprotty-protocol' instead"
                },
                {
                    name: 'sprotty/*',
                    message: "The protocol package should not have any direct 'sprotty' dependencies. Try to use 'sprotty-protocol' instead"
                },
                {
                    name: 'uuid',
                    message:
                        "Use the 'generateUuid'/'isUuid' helpers (from this package's 'utils/uuid' module) instead of importing 'uuid' directly."
                },
                {
                    name: 'uuid/*',
                    message:
                        "Use the 'generateUuid'/'isUuid' helpers (from this package's 'utils/uuid' module) instead of importing 'uuid' directly."
                }
            ]
        }
    },

    /* ----------------------------------------------------------------------------------------
     * Client packages and examples (migrated from glsp-client)
     * ---------------------------------------------------------------------------------------- */
    // svg/html template vars are intentionally unused in client/sprotty view code
    {
        files: ['packages/client/**/*.{ts,tsx}', ...clientExampleGlobs],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'none',
                    caughtErrors: 'none',
                    varsIgnorePattern: 'svg|html'
                }
            ]
        }
    },
    // Default client rules: restrict raw sprotty/sprotty-protocol and uuid direct imports
    {
        files: ['packages/client/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'warn',
                ...restrictedBaseImports,
                {
                    name: 'sprotty',
                    message: "The sprotty default exports are customized and reexported by GLSP. Please use '@eclipse-glsp/client' instead"
                },
                {
                    name: 'sprotty-protocol',
                    message:
                        "The sprotty-protocol default exports are customized and reexported by GLSP. Please use '@eclipse-glsp/client' instead"
                },
                {
                    name: 'uuid',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/protocol') instead of importing 'uuid' directly."
                },
                {
                    name: 'uuid/*',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/protocol') instead of importing 'uuid' directly."
                }
            ]
        }
    },
    // packages/client/glsp-sprotty: restrict sprotty-protocol direct imports
    {
        files: ['packages/client/glsp-sprotty/src/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'warn',
                ...restrictedBaseImports,
                {
                    name: 'sprotty-protocol',
                    message: 'Please use @eclipse-glsp/sprotty instead'
                },
                {
                    name: 'sprotty-protocol/*',
                    message: "Please use '@eclipse-glsp/protocol' instead"
                },
                {
                    name: 'uuid',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/protocol') instead of importing 'uuid' directly."
                },
                {
                    name: 'uuid/*',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/protocol') instead of importing 'uuid' directly."
                }
            ]
        }
    },
    // packages/client/client: restrict direct sprotty/sprotty-protocol/@eclipse-glsp/protocol imports
    {
        files: ['packages/client/client/src/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'warn',
                ...restrictedBaseImports,
                {
                    name: 'sprotty',
                    message: 'Please use @eclipse-glsp/sprotty instead'
                },
                {
                    name: 'sprotty/*',
                    message: 'Please use @eclipse-glsp/sprotty instead'
                },
                {
                    name: 'sprotty-protocol',
                    message: 'Please use @eclipse-glsp/sprotty instead'
                },
                {
                    name: 'sprotty-protocol/*',
                    message: 'Please use @eclipse-glsp/sprotty instead'
                },
                {
                    name: '@eclipse-glsp/protocol',
                    message: 'Please use @eclipse-glsp/sprotty instead'
                },
                {
                    name: '@eclipse-glsp/protocol/*',
                    message: 'Please use @eclipse-glsp/sprotty instead'
                },
                {
                    name: 'uuid',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/sprotty') instead of importing 'uuid' directly."
                },
                {
                    name: 'uuid/*',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/sprotty') instead of importing 'uuid' directly."
                }
            ]
        }
    },
    // client examples: only consume the public '@eclipse-glsp/client' API; the lower layers
    // (protocol, sprotty, raw sprotty/sprotty-protocol) are re-exported through it.
    {
        files: [...clientExampleGlobs],
        rules: {
            'no-restricted-imports': [
                'warn',
                ...restrictedBaseImports,
                {
                    name: 'sprotty',
                    message: 'Please use @eclipse-glsp/client instead'
                },
                {
                    name: 'sprotty/*',
                    message: 'Please use @eclipse-glsp/client instead'
                },
                {
                    name: 'sprotty-protocol',
                    message: 'Please use @eclipse-glsp/client instead'
                },
                {
                    name: 'sprotty-protocol/*',
                    message: 'Please use @eclipse-glsp/client instead'
                },
                {
                    name: '@eclipse-glsp/protocol',
                    message: 'Please use @eclipse-glsp/client instead'
                },
                {
                    name: '@eclipse-glsp/protocol/*',
                    message: 'Please use @eclipse-glsp/client instead'
                },
                {
                    name: '@eclipse-glsp/sprotty',
                    message: 'Please use @eclipse-glsp/client instead'
                },
                {
                    name: '@eclipse-glsp/sprotty/*',
                    message: 'Please use @eclipse-glsp/client instead'
                },
                {
                    name: 'uuid',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/client') instead of importing 'uuid' directly."
                },
                {
                    name: 'uuid/*',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/client') instead of importing 'uuid' directly."
                }
            ]
        }
    },

    /* ----------------------------------------------------------------------------------------
     * Server packages and examples (migrated from glsp-server-node)
     * ---------------------------------------------------------------------------------------- */
    {
        files: ['packages/server/**/*.{ts,tsx}', ...serverExampleGlobs],
        rules: {
            '@typescript-eslint/no-shadow': 'off',
            '@typescript-eslint/padding-line-between-statements': 'off',
            // The MCP SDK uses `exports` subpath patterns with explicit `.js` suffixes (e.g.
            // `@modelcontextprotocol/sdk/server/mcp.js`). The TypeScript import resolver does
            // not match these against the `./*` wildcard, even though tsc and Node resolve
            // them correctly at compile- and runtime.
            'import-x/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk/'] }]
        }
    },
    // Default server rules: restrict direct sprotty-protocol and uuid imports.
    // Covers the lower-layer packages (graph, server) which may consume '@eclipse-glsp/protocol' directly.
    {
        files: ['packages/server/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'warn',
                ...restrictedBaseImports,
                {
                    name: 'sprotty-protocol',
                    message:
                        "The sprotty-protocol default exports are customized and reexported by GLSP. Please import from '@eclipse-glsp/protocol' instead"
                },
                {
                    name: 'sprotty-protocol/*',
                    message:
                        "The sprotty-protocol default exports are customized and reexported by GLSP. Please import from '@eclipse-glsp/protocol' instead"
                },
                {
                    name: 'uuid',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/protocol') instead of importing 'uuid' directly."
                },
                {
                    name: 'uuid/*',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/protocol') instead of importing 'uuid' directly."
                }
            ]
        }
    },
    // server examples, layout-elk and server-mcp: only consume the public '@eclipse-glsp/server' API;
    // the lower layers (protocol, sprotty-protocol) are re-exported through it.
    {
        files: [...serverExampleGlobs, 'packages/server/layout-elk/src/**/*.{ts,tsx}', 'packages/server/server-mcp/src/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'warn',
                ...restrictedBaseImports,
                {
                    name: 'sprotty-protocol',
                    message: 'Please import from @eclipse-glsp/server instead'
                },
                {
                    name: 'sprotty-protocol/*',
                    message: 'Please import from @eclipse-glsp/server instead'
                },
                {
                    name: '@eclipse-glsp/protocol',
                    message: 'Please import from @eclipse-glsp/server instead'
                },
                {
                    name: '@eclipse-glsp/protocol/*',
                    message: 'Please import from @eclipse-glsp/server instead'
                },
                {
                    name: 'uuid',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/server') instead of importing 'uuid' directly."
                },
                {
                    name: 'uuid/*',
                    message: "Use the 'generateUuid'/'isUuid' helpers (from '@eclipse-glsp/server') instead of importing 'uuid' directly."
                }
            ]
        }
    },

    /* ----------------------------------------------------------------------------------------
     * Dev packages (migrated from glsp)
     * ---------------------------------------------------------------------------------------- */
    // CLI-specific overrides (import resolution doesn't fully work for the bundled CLI)
    {
        files: ['dev-packages/cli/**/*.ts'],
        rules: {
            'import-x/no-unresolved': 'off'
        }
    },

    /* ----------------------------------------------------------------------------------------
     * Test files (all groups)
     * ---------------------------------------------------------------------------------------- */
    {
        files: ['**/*.spec.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-expressions': 'off',
            'import-x/namespace': 'off'
        }
    }
];
