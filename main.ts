import { App, S3Backend } from 'cdktf';
import { MainStack } from './src/main.stack';
import { getConfig, MainStackConfig } from './src/config';
import { lookup } from 'dns';

const myip: string = await new Promise((resolve, reject) => {
  lookup('chaeyk.iptime.org', (err, address, family) => {
    if (err) reject(err);
    resolve(address);
  });
});

const app = new App();

function createStack(config: MainStackConfig, app: App) {
  const stack = new MainStack(app, config.env, config, myip);
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
