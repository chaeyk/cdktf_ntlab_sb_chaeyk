import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule, SecurityGroupRuleConfig } from "@cdktf/provider-aws/lib/security-group-rule";
import { TerraformStack } from "cdktf";
import { MainStackConfig } from "../config";
import { Output } from "./output";

export class SG {
  constructor(
    readonly stack: TerraformStack,
    readonly config: MainStackConfig,
    readonly output: Output,
  ) {
  }

  public createSecurityGroup(name: string, description: string) {
    return new SecurityGroup(this.stack, this.config.toPrefixedId('sg', name), {
      name: `${this.config.namePrefix}-${name}`,
      description,
      vpcId: this.output.tfvpc.getString('vpc_id'),
      tags: {
        Name: name,
      },
      egress: [
        {
          description: 'Allow all outbound traffic',
          fromPort: 0,
          toPort: 0,
          protocol: '-1',
          cidrBlocks: ['0.0.0.0/0'],
        },
      ],
    });
  }

  public createSecurityGroupRule(name: string, config: SecurityGroupRuleConfig) {
    return new SecurityGroupRule(this.stack, this.config.toPrefixedId('sg_rule', name), config);
  }
}