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

import * as path from 'path';
import { Command } from 'commander';
import { LOGGER, baseCommand, execForeground } from '../../util';
import { configureRepoEnv, discoverNewestFile, resolveWorkspaceDir } from './common/utils';

// ── Action ──────────────────────────────────────────────────────────────────

export const JAR_TARGET_DIR = 'examples/org.eclipse.glsp.example.workflow/target';
const JAR_PATTERN = '*-glsp.jar';

export function discoverJar(repoDir: string): string {
    const targetDir = path.resolve(repoDir, JAR_TARGET_DIR);
    return discoverNewestFile(JAR_PATTERN, targetDir, `No *-glsp.jar found in ${targetDir}. Run \`glsp repo server build\` first.`);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Collects the arguments commander did not consume (unknown options and excess operands) so they can be
 * forwarded verbatim to the underlying package script, e.g. `--external-server` or `--no-open`.
 */
export function collectPassthroughArgs(cmd: Command): string {
    const raw = cmd.args;
    return raw.length > 0 ? ` ${raw.join(' ')}` : '';
}

export function resolveCommand(script: string, repoDir: string, dryRun: boolean): string | undefined {
    const resolved = `pnpm -C ${repoDir} ${script}`;
    if (dryRun) {
        process.stdout.write(resolved + '\n');
        return undefined;
    }
    return resolved;
}

// ── Commands ────────────────────────────────────────────────────────────────

interface TheiaStartCliOptions {
    dir?: string;
    electron: boolean;
    debug: boolean;
    dryRun: boolean;
    verbose: boolean;
}

export const TheiaStartCommand = baseCommand()
    .name('start')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .description('Start the Theia application for glsp-theia-integration')
    .option('-d, --dir <path>', 'Target directory where repos are cloned')
    .option('--electron', 'Start electron variant instead of browser', false)
    .option('--debug', 'Connect to external GLSP server for debugging', false)
    .option('--dry-run', 'Print the resolved command instead of executing it', false)
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (_cmdOptions: TheiaStartCliOptions, thisCmd: Command) => {
        const cli = thisCmd.opts<TheiaStartCliOptions>();
        configureRepoEnv(cli);

        const dir = resolveWorkspaceDir(cli.dir);
        const repoDir = path.resolve(dir, 'glsp-theia-integration');
        const target = cli.electron ? 'electron' : 'browser';
        const script = cli.debug ? 'start:debug' : 'start';
        const passthrough = collectPassthroughArgs(thisCmd);
        const resolved = resolveCommand(`${target} ${script}${passthrough}`, repoDir, cli.dryRun);
        if (resolved) {
            await execForeground(resolved, { verbose: cli.verbose });
        }
    });

interface ServerStartCliOptions {
    dir?: string;
    port?: number;
    socket: boolean;
    dryRun: boolean;
    verbose: boolean;
}

export const ServerStartCommand = baseCommand()
    .name('start')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .description('Start the glsp-server Java GLSP server')
    .option('-d, --dir <path>', 'Target directory where repos are cloned')
    .option('-p, --port <port>', 'Port to start the server on')
    .option('--socket', 'Use socket connection instead of websocket', false)
    .option('--dry-run', 'Print the resolved command instead of executing it', false)
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (_cmdOptions: ServerStartCliOptions, thisCmd: Command) => {
        const cli = thisCmd.opts<ServerStartCliOptions>();
        configureRepoEnv(cli);

        const dir = resolveWorkspaceDir(cli.dir);
        const repoDir = path.resolve(dir, 'glsp-server');
        const jarPath = discoverJar(repoDir);
        if (!cli.dryRun) {
            LOGGER.info(`Found JAR: ${jarPath}`);
        }

        const socketPort = cli.port ?? 5007;
        const wsPort = cli.port ?? 8081;
        const javaCmd = cli.socket ? `java -jar ${jarPath} --port=${socketPort}` : `java -jar ${jarPath} --websocket --port=${wsPort}`;
        const passthrough = collectPassthroughArgs(thisCmd);
        if (cli.dryRun) {
            process.stdout.write(`${javaCmd}${passthrough}\n`);
        } else {
            await execForeground(`${javaCmd}${passthrough}`, { cwd: repoDir, verbose: cli.verbose });
        }
    });
