import fs                               from 'fs';
import path                             from 'path';

import {getDriver}                      from './drivers';
import type {GetCompletionBlockOptions} from './types';

/**
 * The options of the `setupShellConfigurationFile` function.
 */
export interface SetupShellConfigurationFileOptions extends GetCompletionBlockOptions {
  shellName?: string;
}

/**
 * Adds the completion block (which registers the completion provider) to the user's shell configuration file.
 *
 * It also deletes all existing occurrences of the completion block to prevent duplicates from appearing.
 */
export async function setupShellConfigurationFile({
  shellName,
  ...getCompletionBlockOptions
}: SetupShellConfigurationFileOptions): Promise<void> {
  const driver = getDriver(shellName);

  const configurationFile = driver.getShellConfigurationFile();

  const oldContent = fs.existsSync(configurationFile)
    ? await fs.promises.readFile(configurationFile, `utf8`)
    : ``;

  const completionBlock = driver.getCompletionBlock(getCompletionBlockOptions);

  await fs.promises.mkdir(path.dirname(configurationFile), {recursive: true});
  await fs.promises.writeFile(
    configurationFile,
    oldContent.replaceAll(completionBlock, ``) + completionBlock,
  );
}
