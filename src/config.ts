import { join } from 'path';
import * as fs from 'fs';
import merge from 'deepmerge';
import YAML from 'yamljs';
import { makeId } from './util';

export class MainStackConfig {
  env: string = '';
  profile: string = '';
  tfstateBucket: string = '';
  region: string = '';
  dynamoTable: string = '';
  namePrefix: string = '';
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
  } = {
    normal: '',
    warning: '',
    critical: '',
    poolAddrAlarm: '',
    feePayerAlarm: '',
    adminAlarm: '',
    balanceAlarm: '',
    balanceAlarmSecond: '',
    commonTrackerAlarm: '',
    commonTrackerAlarmSecond: '',
  };
  ecr: {
    private: string[];
    public: string[];
  } = {
    private: [],
    public: [],
  };

  toPrefixedName(name: string): string {
    return `${this.namePrefix}-${this.env}-${name}`;
  }
  
  toPrefixedId(type: string, name: string): string {
    return makeId(type, name);
  }
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

export function getConfig(env: string): MainStackConfig {
  const config = merge.all([configFile[env], configFile.aws[configFile[env]['aws']], { env }]);
  console.log('using config', config);
  return Object.assign(new MainStackConfig(), config);
}

export function isLocalEnv(config: MainStackConfig): boolean {
  return config.env.startsWith('local');
}

export function isDQEnv(config: MainStackConfig): boolean {
  return config.env.startsWith('dq');
}

export function isStgEnv(config: MainStackConfig): boolean {
  return config.env.startsWith('stg');
}
