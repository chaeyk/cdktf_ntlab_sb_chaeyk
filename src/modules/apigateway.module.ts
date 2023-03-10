import * as util from '../util';
import { AssetType, DataTerraformRemoteStateS3, Fn, TerraformAsset, TerraformStack } from 'cdktf';
import { apigateway, iam, lambdafunction, route53 } from '@cdktf/provider-aws';
import path from 'path';
import {
  ApiGatewayBasePathMapping,
  ApiGatewayDeployment,
  ApiGatewayDeploymentConfig,
  ApiGatewayDomainName,
  ApiGatewayRestApiConfig,
  ApiGatewayStage,
} from '@cdktf/provider-aws/lib/apigateway';
import { Route53RecordConfig } from '@cdktf/provider-aws/lib/route53';
import { Output } from '../resources/output';
import { IMainStackConfig } from '../config';

export class ApiGatewayModule {
  constructor(readonly stack: TerraformStack, readonly resources: Output) {}

  public create(name: string, config: IMainStackConfig) {
    const asset = new TerraformAsset(this.stack, name, {
      path: path.resolve(__dirname, `../../lambda-${name}`),
      type: AssetType.ARCHIVE, // if left empty it infers directory and file
    });

    const lambdaName = `${config.namePrefix}-${config.env}-${name}-api`; // cowv2-dq-sns-notify-api
    const gatewayName = `${config.namePrefix}-${config.env}-${name}-api-gateway`; // cowv2-dq-sns-notify-api-gateway

    let domainName = `${name}.${this.resources.tfroute53zone.getString(`domain.public`)}`; // sns-notify.dq.cow.pmang.cloud / live : sns-notify.intellax.io
    if (config.env === 'local')
      domainName = `${name}-local.${this.resources.tfroute53zone.getString(`domain.public`)}`; // local test용 sns-notify-local.dq.cow.pmang.cloud
    else if (config.env === 'stg')
      domainName = `${name}-stg.${this.resources.tfroute53zone.getString(`domain.public`)}`; // local test용 sns-notify-local.dq.cow.pmang.cloud

    let queueUrl = `https://sqs.ap-northeast-1.amazonaws.com/516886701767/cowv2-${config.env}-${name}.fifo`;
    if (config.env === 'live' || config.env === 'stg')
      queueUrl = `https://sqs.ap-northeast-1.amazonaws.com/838909768541/cowv2-${config.env}-${name}.fifo`;

    // 사용할 lambda function create
    const iamRole = this.createIamRolesWithPolicy(lambdaName);
    const lambdaFunctionId = util.makeId('lambda_function', lambdaName);
    const lambdaFunc = new lambdafunction.LambdaFunction(this.stack, lambdaFunctionId, {
      functionName: lambdaName,
      filename: asset.path,
      sourceCodeHash: Fn.filebase64sha256(asset.path),
      role: iamRole.arn,
      handler: `${name}.handler`,
      runtime: 'nodejs14.x',
      environment: {
        variables: {
          QUEUE_URL: queueUrl,
        },
      },
      lifecycle: {
        ignoreChanges: ['last_modified'],
      },
    });

    // api body값
    const gatewayBody = this.getGatewayBody(gatewayName, domainName, lambdaFunc.invokeArn);

    // gateway create
    const apigw = new apigateway.ApiGatewayRestApi(this.stack, gatewayName, {
      name: gatewayName,
      description: `cowv2 ${gatewayName}`,
      body: gatewayBody,
    });

    // deployment 생성
    const apiGatewayDeployment = new ApiGatewayDeployment(
      this.stack,
      util.makeId('apigw-deployment', config.env, name),
      {
        restApiId: apigw.id,

        triggers: {
          redeployment: Fn.sha1(Fn.rawString(gatewayBody)),
        },

        lifecycle: {
          createBeforeDestroy: true,
        },
      } as ApiGatewayDeploymentConfig,
    );

    // stage 생성
    const apiGatewayStage = new ApiGatewayStage(this.stack, util.makeId('apigw-stage', config.env, name), {
      deploymentId: apiGatewayDeployment.id,
      restApiId: apigw.id,
      stageName: config.env,
    });

    // domain name 생성
    const apiGatewayDomain = new ApiGatewayDomainName(this.stack, util.makeId('apigw-domain-name', config.env, name), {
      domainName: domainName,
      regionalCertificateArn: this.resources.tfacm.getString('cert_arns.public_domain'),
      endpointConfiguration: {
        types: ['REGIONAL'],
      },
    });

    // route53 record 생성
    const record = new route53.Route53Record(this.stack, util.makeId('apigw-route53-record', config.env, name), {
      name: apiGatewayDomain.domainName,
      type: 'A',
      zoneId: this.resources.tfroute53zone.getString(`zone_id.public`),

      alias: [
        {
          evaluateTargetHealth: true,
          name: apiGatewayDomain.regionalDomainName,
          zoneId: apiGatewayDomain.regionalZoneId,
        },
      ],
    } as Route53RecordConfig);

    // domain mapping
    const pathMapping = new ApiGatewayBasePathMapping(
      this.stack,
      util.makeId('apigw-domain-mapping', config.env, name),
      {
        apiId: apigw.id,
        stageName: apiGatewayStage.stageName,
        domainName: apiGatewayDomain.domainName,
      },
    );

    const lambdaPermissionId = util.makeId('lambda_function_permission', lambdaName);
    const lambdaPermission = new lambdafunction.LambdaPermission(this.stack, lambdaPermissionId, {
      statementId: 'AllowExecutionFromAPIGateway',
      action: 'lambda:InvokeFunction',
      functionName: lambdaFunc.arn,
      principal: 'apigateway.amazonaws.com',
      sourceArn: `${apigw.executionArn}/*/*/*`,
    });

    return iamRole;
  }

  private createIamRolesWithPolicy(name: string) {
    const iamRole = this.createIamRole(
      name + '-iam-role',
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Effect: 'Allow',
          },
        ],
      }),
    );

    this.createIamRolePolicy(
      iamRole.id,
      name + '-iam-role-policy',
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      }),
    );
    return iamRole;
  }

  private createIamRole(roleName: string, role: string) {
    const id = util.makeId('iam_role', roleName);
    return new iam.IamRole(this.stack, id, {
      name: roleName + '-role',
      assumeRolePolicy: role,
    });
  }

  private createIamRolePolicy(iamRoleId: string, policyName: string, policy: string) {
    const id = util.makeId('iam_role_policy', policyName);
    new iam.IamRolePolicy(this.stack, id, {
      name: policyName + '-role-policy',
      role: iamRoleId,
      policy: policy,
    });
  }

  private getGatewayBody(desc: string, url: string, lambdaArn: string) {
    return JSON.stringify({
      openapi: '3.0.1',
      info: {
        title: 'ntlab-sb-cowapi',
        description: `cowv2 ${desc}`,
        version: '2022-01-19T11:05:40Z',
      },
      servers: [
        {
          url: `https://${url}`,
        },
      ],
      paths: {
        '/checkKey': {
          post: {
            responses: {
              '200': {
                description: '200 response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Empty',
                    },
                  },
                },
              },
            },
            'x-amazon-apigateway-integration': {
              httpMethod: 'POST',
              uri: lambdaArn,
              passthroughBehavior: 'when_no_match',
              timeoutInMillis: 29000,
              type: 'aws_proxy',
            },
          },
        },
        '/notify': {
          post: {
            responses: {
              '200': {
                description: '200 response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Empty',
                    },
                  },
                },
              },
            },
            'x-amazon-apigateway-integration': {
              httpMethod: 'POST',
              uri: lambdaArn,
              passthroughBehavior: 'when_no_match',
              timeoutInMillis: 29000,
              type: 'aws_proxy',
            },
          },
        },
        '/infura': {
          post: {
            responses: {
              '200': {
                description: '200 response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Empty',
                    },
                  },
                },
              },
            },
            'x-amazon-apigateway-integration': {
              httpMethod: 'POST',
              uri: lambdaArn,
              passthroughBehavior: 'when_no_match',
              timeoutInMillis: 29000,
              type: 'aws_proxy',
            },
          },
        },
        '/web3auth': {
          post: {
            responses: {
              '200': {
                description: '200 response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Empty',
                    },
                  },
                },
              },
            },
            'x-amazon-apigateway-integration': {
              httpMethod: 'POST',
              uri: lambdaArn,
              passthroughBehavior: 'when_no_match',
              timeoutInMillis: 29000,
              type: 'aws_proxy',
            },
          },
        },
      },
      components: {
        schemas: {
          Empty: {
            title: 'Empty Schema',
            type: 'object',
          },
        },
      },
    });
  }
}
