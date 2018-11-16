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
   * JSON key to retrieve from the secret value
   *
   * @default Retrieve the whole secret string value
   */
  jsonKey?: string;

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
  /**
   * Return the value of the secret
   */
  public readonly value: string;

  constructor(parent: Construct, id: string, props: SecretsManagerValueProps) {
    super(parent, id);

    const parts = [
      'resolve',
      'secretsmanager',
      props.secretId,
      'SecretString',
      props.jsonKey || '',
      props.versionStage || '',
      props.versionId || ''
    ];

    for (const part of parts) {
      if (unresolved(part)) {
        throw new Error(`Cannot use unresolved values when constructing a SecretsManagerValue, got: ${part}`);
      }
    }

    const resolveString = '{{' + parts.join(':') + '}}';

    // We don't actually need to return a Token here, but we do it anyway to be perfectly
    // clear that SecretsManagerValue.value is unparseable.
    this.value = new Token(resolveString).toString();

    this.addMetadata(cxapi.SECRET_METADATA, {
      type: 'secretsmanager',
      identifier: props.secretId,
      jsonKey: props.jsonKey,
      versionId: props.versionId,
      versionStage: props.versionStage,
    } as cxapi.SecretsManagerSecretMetadataEntry);
  }
}