import { DataAwsAmi, DataAwsAmiConfig } from "@cdktf/provider-aws/lib/data-aws-ami";
import { EbsVolume } from "@cdktf/provider-aws/lib/ebs-volume";
import { Instance, InstanceConfig } from "@cdktf/provider-aws/lib/instance";
import { VolumeAttachment } from "@cdktf/provider-aws/lib/volume-attachment";
import { TerraformStack } from "cdktf";
import { MainStackConfig } from "../config";
import { Output } from "./output";

export class EC2 {
  constructor(
    readonly stack: TerraformStack,
    readonly config: MainStackConfig,
    readonly output: Output,
  ) {
  }

  createEbsVolume(name: string, size: number, az: string) {
    return new EbsVolume(this.stack, this.config.toPrefixedId('ebs_volume', name), {
      availabilityZone: az,
      size,
    });
  }

  createVolumeAttachment(name: string, instanceId: string, volumeId: string, deviceName: string) {
    return new VolumeAttachment(this.stack, this.config.toPrefixedId('volume_attachment', name), {
      deviceName,
      instanceId,
      volumeId,
    });
  }

  createDataAmi(name: string, config: DataAwsAmiConfig) {
    return new DataAwsAmi(this.stack, this.config.toPrefixedId('ami', name), config);
  }

  createEc2(name: string, config: InstanceConfig) {
    return new Instance(this.stack, this.config.toPrefixedId('ec2', name), config);
  }
}