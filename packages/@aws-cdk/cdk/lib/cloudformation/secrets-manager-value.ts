import cxapi = require('@aws-cdk/cx-api');
import { Construct } from "../core/construct";
import { Token, unresolved } from "../core/tokens";

/**
 * Properties for a SecretsManagerValue
 */
export interface SecretsManagerValueProps {
  /**
   * Unique identifier or ARN of the secret
   */
  secretId: string;

  /**
   * Specifies the secret version that you want to retrieve by the staging label attached to the version.
   *
   * Can specify at most one of versionId and versionStage.
   *
   * @default AWSCURRENT
   */
  versionStage?: string;

  /**
   * Specifies the unique identifier of the version of the secret that you want to use in stack operations.
   *
   * Can specify at most one of versionId and versionStage.
   *
   * @default AWSCURRENT
   */
  versionId?: string;
}

/**
 * References a secret value in Secrets Manager
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references.html
 */
export class SecretsManagerValue extends Construct {
  private readonly emittedMeta = new Set<string>();

  constructor(parent: Construct, id: string, private readonly props: SecretsManagerValueProps) {
    super(parent, id);

  }

  /**
   * Return the full value of the secret
   */
  public get value(): string {
    return this.makeResolveString();
  }

  /**
   * Return a key from the JSON object that is stored in the secret
   */
  public jsonKey(key: string) {
    return this.makeResolveString(key);
  }

  private makeResolveString(jsonKey?: string) {
    const parts = [
      'resolve',
      'secretsmanager',
      this.props.secretId,
      'SecretString',
      jsonKey || '',
      this.props.versionStage || '',
      this.props.versionId || ''
    ];

    for (const part of parts) {
      if (unresolved(part)) {
        throw new Error(`Cannot use unresolved values when constructing a SecretsManagerValue, got: ${part}`);
      }
    }

    // Only emit every secret once per object
    if (!this.emittedMeta.has(jsonKey || '')) {
      this.addMetadata(cxapi.SECRET_METADATA, {
        type: 'secretsmanager',
        identifier: this.props.secretId,
        jsonKey,
        versionId: this.props.versionId,
        versionStage: this.props.versionStage,
      } as cxapi.SecretsManagerSecretMetadataEntry);
      this.emittedMeta.add(jsonKey || '');
    }

    const resolveString = '{{' + parts.join(':') + '}}';

    // We don't actually need to return a Token here, but we do it anyway to be perfectly
    // clear that SecretsManagerValue.value is unparseable.
    return new Token(resolveString).toString();
  }
}