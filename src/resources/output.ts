import { DataAwsCallerIdentity } from '@cdktf/provider-aws/lib/data-aws-caller-identity';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { DataTerraformRemoteStateS3, TerraformStack } from 'cdktf';
import { MainStackConfig, isStgEnv } from '../config';

export class Output {
  readonly identity: DataAwsCallerIdentity;

  readonly defaultProvider: AwsProvider;
  readonly useast1Provider: AwsProvider;

  readonly tfvpc: DataTerraformRemoteStateS3;
  readonly tfroute53zone: DataTerraformRemoteStateS3;
  readonly tfsg: DataTerraformRemoteStateS3;
  readonly tfiam: DataTerraformRemoteStateS3;

  constructor(stack: TerraformStack, readonly config: MainStackConfig) {
    this.identity = new DataAwsCallerIdentity(stack, 'identity');

    // define resources here
    this.defaultProvider = new AwsProvider(stack, 'aws', {
      profile: config.profile,
      region: config.region,
    });

    this.useast1Provider = new AwsProvider(stack, 'global_us_east_1', {
      alias: 'global_us_east_1',
      profile: config.profile,
      region: 'us-east-1',
      endpoints: [
        {
          sts: 'https://sts.us-east-1.amazonaws.com',
        },
      ],
    });

    this.tfvpc = this.getRemoteStateS3(stack, 'tf_vpc');
    this.tfroute53zone = this.getRemoteStateS3(stack, 'tf_route53_zone');
    this.tfsg = this.getRemoteStateS3(stack, 'tf_sg');
    this.tfiam = this.getRemoteStateS3(stack, 'tf_iam');

  }

  private getRemoteStateS3(stack: TerraformStack, name: string) {
    return new DataTerraformRemoteStateS3(stack, name, {
      bucket: this.config.tfstateBucket,
      key: `${name}.tfstate`,
      region: this.config.region,
      profile: this.config.profile,
    });
  }
}
