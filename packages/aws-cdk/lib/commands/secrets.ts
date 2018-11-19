import cxapi = require('@aws-cdk/cx-api');
import AWS = require('aws-sdk');
import colors = require('colors/safe');
import table = require('table');
import util = require('util');
import yargs = require('yargs');
import { debug, print, warning } from '../../lib/logging';
import { Mode } from '../api/aws-auth/credentials';
import { collectMetadataEntries } from '../api/cxapp/stacks';
import { SDK } from '../api/util/sdk';
import { CommandOptions } from '../command-api';

// tslint:disable-next-line:no-var-requires
const promptly = require('promptly');
const prompt = util.promisify(promptly.prompt);

export const command = 'secrets [STACKS..]';
export const describe = 'Manage secrets referenced from your CDK app';
export const builder = {
  write: {
    alias: 'w',
    desc: 'Secret to write',
    type: 'string',
    requiresArg: 'KEY'
  },
  value: {
    desc: 'Secret value to write (if omitted, will be prompted for the value)',
    type: 'string',
    requiresArg: 'VALUE'
  },
};

export function handler(args: yargs.Arguments) {
  args.commandHandler = realHandler;
}

export async function realHandler(options: CommandOptions): Promise<number> {
  const stacks = await options.appStacks.selectStacks(...(options.args.STACKS || []));
  const secrets = collectSecrets(stacks);
  const store = new SecretsStore(options.aws);

  if (options.args.write) {
    await writeSecret(store, secrets, options.args.write, options.args.value);
  } else {
    if (options.args.json) {
      process.stdout.write(JSON.stringify(secrets.map(x => x[1]), undefined, 2));
    } else {
      await printSecrets(secrets);
    }
  }

  return 0;
}

async function printSecrets(secrets: NumberedSecret[]) {
  // Print config by default
  const data: any[] = [[colors.green('#'), colors.green('Secret'), colors.green('Used')]];
  for (const [i, secret] of secrets) {
    data.push([i, describeSecret(secret.secret), secret.paths.join(' ')]);
  }

  print(`Secrets used this app:\n`);

  print(table.table(data, {
      border: table.getBorderCharacters('norc'),
      columns: {
        1: { wrapWord: true } as any,
        2: { width: 60, wrapWord: true } as any
      }
  }));

  // tslint:disable-next-line:max-line-length
  print(`Run ${colors.blue('cdk secrets --write KEY_OR_NUMBER')} to write a secret's value to Secrets Manager.`);
}

async function writeSecret(store: SecretsStore, secrets: NumberedSecret[], identifier: string, value?: string) {
  const secret = selectSecret(secrets, identifier);
  if (secret.secret.versionId || secret.secret.versionStage) {
    throw new Error('Cannot set a value for this secret because it uses a versionId or versionStage');
  }
  if (!value) {
    for (let attempts = 0; attempts < 3; attempts++) {
      const value1 = await prompt(`New value for secret ${colors.blue(describeSecret(secret.secret))}:`, { silent: true });
      const value2 = await prompt(`Confirm new secret value:`, { silent: true });
      if (value1 === value2) {
        value = value1;
        break;
      }

      warning('Secret values do not match. Try again.');
    }
    if (!value) {
      throw new Error('Too many failed attempts. Stopping');
    }
  }

  await store.putValue(secret, value);
}

type NumberedSecret = [number, Secret];

/**
 * Recurse over all stacks, collect all secret metadata entries and number then
 */
function collectSecrets(stacks: cxapi.SynthesizedStack[]): NumberedSecret[] {
  // Find all referenced secrets in all selected apps
  const secretMap = new Map<string, Secret>();
  collectMetadataEntries(cxapi.SECRET_METADATA, stacks, (entry, path, stack) => {
    const secret = entry.data as cxapi.SecretMetadataEntry;
    const key = secretKey(secret, stack.environment);
    const previous = secretMap.get(key);
    if (previous) {
      previous.paths.push(path);
    } else {
      secretMap.set(key, { secret, environment: stack.environment, paths: [path] });
    }
  });

  const secrets = Array.from(secretMap.values());

  // Filter down to only the ones we know
  const supportedTypes = ['secretsmanager'];
  secrets.filter(s => !supportedTypes.includes(s.secret.type)).forEach(s => {
    warning(`Unrecognized secret type: ${s.secret.type}, used at ${s.paths}`);
  });

  const supportedSecrets = secrets.filter(s => supportedTypes.includes(s.secret.type)) ;

  return enumerate1(supportedSecrets);
}

function selectSecret(secrets: NumberedSecret[], description: string) {
  let n = parseInt(description, 10);
  if (`${n}` !== description) {
    // Not a number, so set to a number that cannot match any entry
    n = -1;
  }

  // Select by key
  for (const [i, secret] of secrets) {
    if (n === i || describeSecret(secret.secret) === description) {
      return secret;
    }
  }

  throw new Error(`No secret with name or number: ${description}`);
}

function enumerate1<T>(xs: T[]): Array<[number, T]> {
  const ret = new Array<[number, T]>();
  let i = 1;
  for (const x of xs) {
    ret.push([i, x]);
    i += 1;
  }
  return ret;
}

/**
 * Return a unique key string per secret
 */
function secretKey(entry: cxapi.SecretMetadataEntry, env: cxapi.Environment) {
  return [entry.type, entry.identifier, entry.jsonKey, entry.versionStage, entry.versionId, env.account, env.region].toString();
}

/**
 * Return a descriptive string per secret
 */
function describeSecret(entry: cxapi.SecretMetadataEntry) {
  const parts = [entry.identifier];
  if (entry.jsonKey) { parts.push(`.${entry.jsonKey}`); }
  if (entry.versionStage) { parts.push(`@${entry.versionStage}`); }
  if (entry.versionId) { parts.push(`@${entry.versionId}`); }
  return parts.join('');
}

interface Secret {
  secret: cxapi.SecretMetadataEntry;
  environment: cxapi.Environment;
  paths: string[];
}

class SecretsStore {
  private clientsCache: {[key: string]: Promise<AWS.SecretsManager>} = {};

  constructor(private readonly aws: SDK) {
  }

  public async putValue(secret: Secret, value: string) {
    // FIXME: JSON value
    const client = await this.client(secret.environment, Mode.ForWriting);

    // First get/check the existing value
    debug(`Looking for existing secret with identifier ${secret.secret.identifier}`);
    let existingValue;
    try {
      existingValue = await client.getSecretValue({
        SecretId: secret.secret.identifier,
        VersionStage: secret.secret.versionStage
      }).promise();
    } catch (e) {
      if (e.code !== 'ResourceNotFoundException' && e.message.indexOf('because it was deleted') === -1) { throw e; }
      existingValue = undefined;
    }

    if (existingValue && existingValue.SecretBinary) {
      throw new Error('Cannot update a binary secret');
    }

    let newValue: string;
    if (secret.secret.jsonKey) {
      // Update or set field in JSON
      let parsed: any = {};
      if (existingValue) {
        debug(`Updating field '${secret.secret.jsonKey}' in existing secret value`);
        try {
          parsed = JSON.parse(existingValue.SecretString!);
        } catch (e) {
          throw new Error('Existing value is not a JSON object, so cannot update JSON field in secret');
        }
      }
      parsed[secret.secret.jsonKey] = value;
      newValue = JSON.stringify(parsed);
    } else {
      // Replace entire string
      newValue = value;
    }

    let response;
    if (existingValue) {
      debug(`Updating secret with identifier ${secret.secret.identifier}`);
      response = await client.putSecretValue({
        SecretId: secret.secret.identifier,
        SecretString: newValue,
      }).promise();
    } else {
      debug(`Creating secret with identifier ${secret.secret.identifier}`);
      response = await client.createSecret({
        Name: secret.secret.identifier,
        SecretString: newValue,
      }).promise();
    }
    print(`Successfully wrote secret ${colors.blue(response.ARN!)}. Redeploy to apply the new value to your app.`);
  }

  private client(environment: cxapi.Environment, mode: Mode): Promise<AWS.SecretsManager> {
    const key = [environment.account, environment.region, mode].toString();
    if (!(key in this.clientsCache)) {
      this.clientsCache[key] = this.aws.secretsManager(environment, mode);
    }
    return this.clientsCache[key];
  }
}