import { TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { ApiGatewayModule } from './modules/apigateway.module';
import { IMainStackConfig, isLocalEnv } from './config';
import { Output } from './resources/output';
import { ECR } from './resources/ecr';

export class MainStack extends TerraformStack {
  constructor(scope: Construct, name: string, readonly config: IMainStackConfig) {
    super(scope, name);

    var output = new Output(this, config);

    new ECR(this, config, output);
  }
}
