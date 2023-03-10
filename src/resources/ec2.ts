import { DataAwsAmi, DataAwsAmiConfig } from "@cdktf/provider-aws/lib/data-aws-ami";
import { EbsVolume } from "@cdktf/provider-aws/lib/ebs-volume";
import { Instance, InstanceConfig } from "@cdktf/provider-aws/lib/instance";
import { VolumeAttachment } from "@cdktf/provider-aws/lib/volume-attachment";
import { TerraformStack } from "cdktf";
import { IMainStackConfig } from "../config";
import { makeId } from "../util";
import { Output } from "./output";

export class EC2 {
  constructor(
    readonly stack: TerraformStack,
    readonly config: IMainStackConfig,
    readonly output: Output,
  ) {
  }

  createEbsVolume(name: string, size: number, az: string) {
    return new EbsVolume(this.stack, makeId('ebs_volume', name), {
      availabilityZone: az,
      size,
    });
  }

  createVolumeAttachment(name: string, instanceId: string, volumeId: string, deviceName: string) {
    return new VolumeAttachment(this.stack, makeId('volume_attachment', name), {
      deviceName,
      instanceId,
      volumeId,
    });
  }

  createDataAmi(name: string, config: DataAwsAmiConfig) {
    return new DataAwsAmi(this.stack, makeId('ami', name), config);
  }

  createEc2(name: string, config: InstanceConfig) {
    return new Instance(this.stack, makeId('ec2', name), config);
  }
}