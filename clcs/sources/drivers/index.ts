import type {ShellDriver} from '../types';

import {BashDriver}       from './BashDriver';
import {FishDriver}       from './FishDriver';
import {PowerShellDriver} from './PowerShellDriver';
import {ZshDriver}        from './ZshDriver';

const drivers = [
  BashDriver,
  ZshDriver,
  FishDriver,
  PowerShellDriver,
];

let supportedShells: Array<string> | undefined;

/**
 * @returns The list of supported shells.
 */
export function getSupportedShells(): Array<string> {
  return supportedShells ??= drivers.map(driver => driver.shellName);
}

/**
 * @returns The driver corresponding to the default shell.
 */
function getDefaultDriver(): ShellDriver {
  const defaultDriver = drivers.find(driver => driver.isDefaultShell());

  if (typeof defaultDriver === `undefined`) {
    if (typeof process.env.SHELL !== `undefined`)
      throw new Error(`Default shell ${JSON.stringify(process.env.SHELL)} is not supported. Supported shells: ${getSupportedShells().join(`, `)}.`);

    throw new Error(`No default shell could be detected`);
  }

  return defaultDriver;
}

/**
 * @returns The driver corresponding to the requested shell.
 */
function getRequestedDriver(shellName: string): ShellDriver {
  const requestedDriver = drivers.find(driver => driver.shellName === shellName);

  if (typeof requestedDriver === `undefined`)
    throw new Error(`Requested shell ${JSON.stringify(shellName)} is not supported. Supported shells: ${getSupportedShells().join(`, `)}.`);

  return requestedDriver;
}

/**
 * @returns The driver corresponding to the requested shell or to the default shell if no shell is requested.
 */
export function getDriver(shellName?: string): ShellDriver {
  return typeof shellName === `string` ? getRequestedDriver(shellName) : getDefaultDriver();
}
