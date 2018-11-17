/**
 * Attached to constructs that represent secrets
 */
export const SECRET_METADATA = 'aws:cdk:secret';

export type SecretMetadataEntry = SecretsManagerSecretMetadataEntry;

export interface SecretsManagerSecretMetadataEntry {
  /**
   * The type of secret
   *
   * Currently only 'secretsmanager' is supported.
   */
  type: 'secretsmanager';

  /**
   * Identifier of the secret
   */
  identifier: string;

  /**
   * JSON key in the secret value
   */
  jsonKey?: string;

  /**
   * VersionStage of the secret
   */
  versionStage?: string;

  /**
   * ID of the secret
   */
  versionId?: string;
}