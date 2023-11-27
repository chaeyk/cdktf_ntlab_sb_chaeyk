import { Fn, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { IMainStackConfig } from './config';
import { Output } from './resources/output';
import { ECR } from './resources/ecr';
import { SG } from './resources/sg';
import { EC2 } from './resources/ec2';
import { ROUTE53 } from './resources/route53';
import { resolve } from 'dns';

export class MainStack extends TerraformStack {
  private output: Output;

  private ecr: ECR;
  private sg: SG;
  private ec2: EC2;
  private route53: ROUTE53;

  constructor(scope: Construct, name: string, readonly config: IMainStackConfig) {
    super(scope, name);

    var output = new Output(this, config);

    this.output = output;
    this.ecr = new ECR(this, config, output);
    this.sg = new SG(this, config, output);
    this.ec2 = new EC2(this, config, output);
    this.route53 = new ROUTE53(this, config, output);

    this.createUbuntuInstance();
  }

  public createUbuntuInstance() {
    const sgUbuntu = this.sg.createSecurityGroup('ubuntu', 'sg for ubuntu server');

    this.sg.createSecurityGroupRule('ssh', {
      securityGroupId: sgUbuntu.id,
      description: 'ssh',
      fromPort: 22,
      toPort: 22,
      protocol: 'tcp',
      type: 'ingress',
      cidrBlocks: ['121.100.102.71/32'],
    });

    this.sg.createSecurityGroupRule('minecraft', {
      securityGroupId: sgUbuntu.id,
      description: 'minecraft',
      fromPort: 9090,
      toPort: 9091,
      protocol: 'udp',
      type: 'ingress',
      cidrBlocks: ['0.0.0.0/0'],
    });

    const ebs = this.ec2.createEbsVolume('ubuntu', 30, 'ap-northeast-2a');
    const ami = this.ec2.createDataAmi('ubuntu', {
      mostRecent: true,
      filter: [
        {
          name: 'name',
          values: ['ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*'],
        },
        {
          name: 'virtualization-type',
          values: ['hvm'],
        }
      ],
      owners: ['099720109477'], // Canonical
    });

    const ec2 = this.ec2.createEc2('ubuntu', {
      instanceType: 't3a.medium',
      ami: ami.id,
      iamInstanceProfile: this.output.tfiam.getString('common_instance_profile_id.ec2_default'),
      associatePublicIpAddress: true,
      tags: {
        Name: `${this.config.namePrefix}-ubuntu`,
        HostName: `${this.config.namePrefix}-ubuntu.${this.output.tfroute53zone.getString('domain.public')}`,
        AnsibleGroup: `${this.config.namePrefix}-ubuntu`,
        TFNamePrefix: this.config.namePrefix,
        Terraform: 'true',
      },
      vpcSecurityGroupIds: [
        this.output.tfsg.getString('sg_ids.default'),
        this.output.tfsg.getString('sg_ids.open_to_nwz_public'),
        sgUbuntu.id,
      ],
      keyName: 'chaeyk-ntlab-sb',
      subnetId: Fn.element(this.output.tfvpc.getList('public_subnet_ids'), 0),
      rootBlockDevice: {
        deleteOnTermination: true,
        volumeSize: 30,
        volumeType: 'gp3',
      },
      lifecycle: {
        ignoreChanges: ['ami'],
      },
    });

    this.ec2.createVolumeAttachment('ubuntu', ec2.id, ebs.id, '/dev/sdf');

    const zone = this.route53.createDataRoute53Zone('public', this.output.tfroute53zone.getString('domain.public'));

    this.route53.createRecord('ubuntu', {
      zoneId: zone.zoneId,
      name: 'ubuntu',
      type: 'A',
      ttl: 300,
      records: [ec2.publicIp],
    });
  }
}
