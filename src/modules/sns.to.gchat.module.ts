import * as util from '../util';
import { AssetType, Fn, TerraformAsset, TerraformStack } from 'cdktf';
import { iam, lambdafunction } from '@cdktf/provider-aws';
import path from 'path';
import { SnsTopicSubscription } from '@cdktf/provider-aws/lib/sns';

export class SnsToGChatModule {
  constructor(readonly stack: TerraformStack) {}

  public create(name: string, webHhookUrl: string, topicArn: string) {
    const asset = new TerraformAsset(this.stack, name, {
      path: path.resolve(__dirname, '../../lambda'),
      type: AssetType.ARCHIVE, // if left empty it infers directory and file
    });

    //const assetBucketId = util.makeId('assetBucket', name);
    // const assetBucket = new s3.S3Bucket(this.stack, assetBucketId, {
    //   bucket: name
    // });

    // const lambdaArchive = new s3.S3BucketObject(this.stack, util.makeId('lambdaArchive', name), {
    //   bucket:assetBucket.bucket,
    //   key:asset.fileName,
    //   source:asset.path
    // });

    const iamRole = this.createIamRolesWithPolicy(name);
    const lambdaFunctionId = util.makeId('lambda_function', name);
    const lambdaFunc = new lambdafunction.LambdaFunction(this.stack, lambdaFunctionId, {
      functionName: name,
      // s3 버킷을 사용하는 경우
      //s3Bucket: assetBucket.bucket,
      //s3Key: lambdaArchive.key,
      ////sourceCodeHash: `filebase64sha256(${path.join(__dirname, 'lambda/lambda_chat.zip')})`, // 동작안함

      filename: asset.path,
      // TerraformAsset의 assetHash는 path 경로에 대한 hash라서 lambda의 hash하고 다르다.
      // 그래서 asset.assetHash를 쓰면 lambda의 hash와 달라서 매번 업데이트 하는 문제가 생긴다.
      // terraform의 filebase64sha256()을 써야 한다.
      sourceCodeHash: Fn.filebase64sha256(asset.path),

      role: iamRole.arn,
      handler: 'lambda_chat.send_message',
      runtime: 'python3.8',
      environment: {
        variables: {
          CHAT_WEBHOOK: webHhookUrl,
        },
      },
      lifecycle: {
        ignoreChanges: ['last_modified'],
      },
    });

    const lambdaPermissionId = util.makeId('lambda_function_permission', name);
    const lambdaPermission = new lambdafunction.LambdaPermission(this.stack, lambdaPermissionId, {
      statementId: 'AllowExecutionFromSNS',
      action: 'lambda:InvokeFunction',
      functionName: lambdaFunc.arn,
      principal: 'sns.amazonaws.com',
      sourceArn: topicArn,
    });

    const subscriptionId = util.makeId('sns_topin_subscription', name);
    new SnsTopicSubscription(this.stack, subscriptionId, {
      topicArn,
      protocol: 'lambda',
      endpoint: lambdaFunc.arn,
      endpointAutoConfirms: true,
    });
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
}
