import { DataAwsRoute53Zone } from "@cdktf/provider-aws/lib/data-aws-route53-zone";
import { Route53Record, Route53RecordConfig } from "@cdktf/provider-aws/lib/route53-record";
import { TerraformStack } from "cdktf";
import { MainStackConfig } from "../config";
import { Output } from "./output";

export class ROUTE53 {
  constructor(
    readonly stack: TerraformStack,
    readonly config: MainStackConfig,
    readonly output: Output,
  ) {
  }

  createDataRoute53Zone(name: string, type: string) {
    return new DataAwsRoute53Zone(this.stack, this.config.toPrefixedId('data_route53_zone', name), {
      name: type,
      privateZone: false,
    });
  }

  createRecord(name: string, config: Route53RecordConfig) {
    return new Route53Record(this.stack, this.config.toPrefixedId('route53_record', name), config);
  }
}
