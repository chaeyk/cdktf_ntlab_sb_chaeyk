import { EcrRepository } from '@cdktf/provider-aws/lib/ecr-repository';
import { EcrpublicRepository } from '@cdktf/provider-aws/lib/ecrpublic-repository';
import { TerraformStack } from 'cdktf';
import { IMainStackConfig } from '../config';
import * as util from '../util';
import { Output } from './output';

export class ECR {
  constructor(
    readonly stack: TerraformStack,
    readonly config: IMainStackConfig,
    readonly output: Output,
  ) {
    this.config.ecr?.private?.forEach((name) => this.createPrivateEcr(name));
    this.config.ecr?.public?.forEach((name) => this.createPublicEcr(name));
  }

  private createPrivateEcr(name: string) {
    const ecrRepo = new EcrRepository(this.stack, util.makeId('ecr_repository', name), {
      name: `${this.config.namePrefix}/${name}`,
    });
  }

  private createPublicEcr(name: string) {
    new EcrpublicRepository(this.stack, util.makeId('ecr_public_repository', name), {
      repositoryName: `${this.config.namePrefix}/${name}`,
      provider: this.output.useast1Provider,
    });
  }
}
