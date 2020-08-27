import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { InstanceType, InstanceClass, InstanceSize, MachineImage } from '@aws-cdk/aws-ec2';
import 'dotenv/config';

interface LinuxBastionStackProps extends cdk.StackProps {
    myVpc: ec2.IVpc;
    bastionHostSecurityGroup: ec2.SecurityGroup;
}

export class LinuxBastionStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: LinuxBastionStackProps) {
        super(scope, id, props);

        new ec2.Instance(this, 'bastionHost', {
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
            machineImage: MachineImage.genericLinux({
                'us-east-1': 'ami-0758470213bdd23b1'
            }),
            securityGroup: props.bastionHostSecurityGroup,
            vpc: props.myVpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            keyName: process.env.KEY_NAME,
        });
    }
} 