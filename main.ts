import { App, S3Backend } from 'cdktf';
import { MainStack } from './src/main.stack';
import { getConfig, IMainStackConfig } from './src/config';

const app = new App();

function createStack(config: IMainStackConfig, app: App) {
  const stack = new MainStack(app, config.env, config);
  new S3Backend(stack, {
    bucket: config.tfstateBucket,
    key: `tf_dev_${config.namePrefix}_${config.env}.tfstate`,
    dynamodbTable: config.dynamoTable,
    region: config.region,
    profile: config.profile,
    stsEndpoint: `https://sts.${config.region}.amazonaws.com`,
  });
}

createStack(getConfig('ntech'), app);

app.synth();