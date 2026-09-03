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

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { baseCommand, execForeground } from '../../util';
import { configureRepoEnv, resolveRepoDir } from './common/utils';
import { collectPassthroughArgs, resolveCommand } from './start';

// ── Layout ──────────────────────────────────────────────────────────────────

// glsp-core is a single pnpm workspace, so the client and the node server are not separate repositories
// but example packages within it. The component commands below address them by their workspace path.
export const STANDALONE_EXAMPLE_DIR = 'examples/workflow-standalone';
export const WORKFLOW_SERVER_EXAMPLE_DIR = 'examples/workflow-server';

export const NODE_BUNDLE_PATH = 'examples/workflow-server-bundled/wf-glsp-server-node.js';
export const BROWSER_BUNDLE_PATH = 'examples/workflow-server-bundled-web/wf-glsp-server-webworker.js';

export function resolveBundlePath(repoDir: string, relativePath: string, label: string): string {
    const bundlePath = path.resolve(repoDir, relativePath);
    if (!fs.existsSync(bundlePath)) {
        throw new Error(`${label} not found at ${bundlePath}. Run 'glsp repo core build' first.`);
    }
    return bundlePath;
}

/** Resolves an example package directory inside the glsp-core checkout. */
export function resolveExampleDir(exampleDir: string, cliDir?: string): string {
    return path.join(resolveRepoDir('glsp-core', cliDir), exampleDir);
}

// ── Client component ────────────────────────────────────────────────────────

interface ClientStartCliOptions {
    dir?: string;
    browser: boolean;
    dryRun: boolean;
    verbose: boolean;
}

export const CoreClientStartCommand = baseCommand()
    .name('start')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .description('Start the standalone workflow example client')
    .option('-d, --dir <path>', 'Target directory where repos are cloned')
    .option('--browser', 'Run in browser-only mode with a WebWorker server', false)
    .option('--dry-run', 'Print the resolved command instead of executing it', false)
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (_cmdOptions: ClientStartCliOptions, thisCmd: Command) => {
        const cli = thisCmd.opts<ClientStartCliOptions>();
        configureRepoEnv(cli);

        const exampleDir = resolveExampleDir(STANDALONE_EXAMPLE_DIR, cli.dir);
        const script = cli.browser ? 'start:browser' : 'start';
        const passthrough = collectPassthroughArgs(thisCmd);
        const resolved = resolveCommand(`${script}${passthrough}`, exampleDir, cli.dryRun);
        if (resolved) {
            await execForeground(resolved, { verbose: cli.verbose });
        }
    });

export const CoreClientCommand: Command = baseCommand()
    .name('client')
    .description('Operations on the GLSP client and its standalone example')
    .option('-d, --dir <path>', 'Target directory where repos are cloned (inherited by subcommands)')
    .addCommand(CoreClientStartCommand);

// ── Server component ────────────────────────────────────────────────────────

interface ServerStartCliOptions {
    dir?: string;
    port?: number;
    socket: boolean;
    dryRun: boolean;
    verbose: boolean;
}

export const CoreServerStartCommand = baseCommand()
    .name('start')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .description('Start the workflow example node GLSP server')
    .option('-d, --dir <path>', 'Target directory where repos are cloned')
    .option('-p, --port <port>', 'Port to start the server on')
    .option('--socket', 'Use a socket connection instead of websocket', false)
    .option('--dry-run', 'Print the resolved command instead of executing it', false)
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (_cmdOptions: ServerStartCliOptions, thisCmd: Command) => {
        const cli = thisCmd.opts<ServerStartCliOptions>();
        configureRepoEnv(cli);

        const exampleDir = resolveExampleDir(WORKFLOW_SERVER_EXAMPLE_DIR, cli.dir);
        const script = cli.socket ? 'start:socket' : 'start';
        // The scripts pin a default port; a trailing `--port` overrides it (last occurrence wins).
        const portArg = cli.port ? ` --port ${cli.port}` : '';
        const passthrough = collectPassthroughArgs(thisCmd);
        const resolved = resolveCommand(`${script}${portArg}${passthrough}`, exampleDir, cli.dryRun);
        if (resolved) {
            await execForeground(resolved, { verbose: cli.verbose });
        }
    });

export const CoreServerNodeBundleCommand: Command = baseCommand()
    .name('node-bundle')
    .description('Print the absolute path to the Node.js server bundle')
    .option('-d, --dir <path>', 'Target directory where repos are cloned')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (_cmdOptions: unknown, thisCmd: Command) => {
        const cli = thisCmd.opts<{ dir?: string; verbose: boolean }>();
        configureRepoEnv(cli);
        const repoDir = resolveRepoDir('glsp-core', cli.dir);
        process.stdout.write(resolveBundlePath(repoDir, NODE_BUNDLE_PATH, 'Node server bundle'));
    });

export const CoreServerBrowserBundleCommand: Command = baseCommand()
    .name('browser-bundle')
    .description('Print the absolute path to the browser (Web Worker) server bundle')
    .option('-d, --dir <path>', 'Target directory where repos are cloned')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (_cmdOptions: unknown, thisCmd: Command) => {
        const cli = thisCmd.opts<{ dir?: string; verbose: boolean }>();
        configureRepoEnv(cli);
        const repoDir = resolveRepoDir('glsp-core', cli.dir);
        process.stdout.write(resolveBundlePath(repoDir, BROWSER_BUNDLE_PATH, 'Browser bundle'));
    });

export const CoreServerCommand: Command = baseCommand()
    .name('server')
    .description('Operations on the node GLSP server and its workflow example')
    .option('-d, --dir <path>', 'Target directory where repos are cloned (inherited by subcommands)')
    .addCommand(CoreServerStartCommand)
    .addCommand(CoreServerNodeBundleCommand)
    .addCommand(CoreServerBrowserBundleCommand);

// ── Wiring ──────────────────────────────────────────────────────────────────

/** The component command groups contributed by the glsp-core repository. */
export const CORE_COMPONENT_COMMANDS: Command[] = [CoreClientCommand, CoreServerCommand];

// Component groups sit between `repo <repo>` and the leaf command, so they have to forward `--dir` one
// more level down (mirroring the hooks on RepoCommand and the subrepo commands).
for (const componentCmd of CORE_COMPONENT_COMMANDS) {
    componentCmd.hook('preSubcommand', (_, subcommand) => {
        const parentDir = componentCmd.getOptionValue('dir');
        if (parentDir && !subcommand.getOptionValue('dir')) {
            subcommand.setOptionValue('dir', parentDir);
        }
    });
}
