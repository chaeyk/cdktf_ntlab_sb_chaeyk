import { join } from 'path';
import * as fs from 'fs';
import merge from 'deepmerge';
import YAML from 'yamljs';

export interface IMainStackConfig {
  env: string;
  profile: string;
  tfstateBucket: string;
  region: string;
  dynamoTable: string;
  namePrefix: string;
  webHookUrls: {
    normal: string;
    warning: string;
    critical: string;
    poolAddrAlarm: string;
    feePayerAlarm: string;
    adminAlarm: string;
    balanceAlarm: string;
    balanceAlarmSecond: string;
    commonTrackerAlarm: string;
    commonTrackerAlarmSecond: string;
  };
  ecr: {
    private: string[];
    public: string[];
  };
}

function loadYaml(filename: string) {
  const path = join('config', filename);

  if (fs.existsSync(path)) {
    return YAML.load(path);
  }

  return {};
}

function loadMergedYaml(): any {
  const configs = [];
  configs.push(loadYaml('config.yaml'));
  configs.push(loadYaml('config-personal.yaml'));
  return merge.all(configs);
}

const configFile = loadMergedYaml();

export function getConfig(env: string): IMainStackConfig {
  const config = merge.all([configFile[env], configFile.aws[configFile[env]['aws']], { env }]);
  console.log('using config', config);
  return config as IMainStackConfig;
}

export function isLocalEnv(config: IMainStackConfig): boolean {
  return config.env.startsWith('local');
}

export function isDQEnv(config: IMainStackConfig): boolean {
  return config.env.startsWith('dq');
}

export function isStgEnv(config: IMainStackConfig): boolean {
  return config.env.startsWith('stg');
}
