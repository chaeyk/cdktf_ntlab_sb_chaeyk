import { DataAwsRoute53Zone } from "@cdktf/provider-aws/lib/data-aws-route53-zone";
import { Route53Record, Route53RecordConfig } from "@cdktf/provider-aws/lib/route53-record";
import { TerraformStack } from "cdktf";
import { IMainStackConfig } from "../config";
import { makeId } from "../util";
import { Output } from "./output";

export class ROUTE53 {
  constructor(
    readonly stack: TerraformStack,
    readonly config: IMainStackConfig,
    readonly output: Output,
  ) {
  }

  createDataRoute53Zone(name: string, type: string) {
    return new DataAwsRoute53Zone(this.stack, makeId('data_route53_zone', name), {
      name: type,
      privateZone: false,
    });
  }

  createRecord(name: string, config: Route53RecordConfig) {
    return new Route53Record(this.stack, makeId('route53_record', name), config);
  }
}
