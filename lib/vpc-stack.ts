import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { SecurityGroup } from '@aws-cdk/aws-ec2';

export class VpcStack extends cdk.Stack {
    readonly myVpc: ec2.IVpc;
    readonly elbSecurityGroup: SecurityGroup;
    readonly asgSecurityGroup: SecurityGroup;
    readonly rdsSecurityGroup: SecurityGroup;

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
      
        this.myVpc = new ec2.Vpc(this, 'MyVPC', {
            cidr: process.env.CIDR,
            maxAzs: 4,
            natGateways: 1,
            vpnGateway: true,
            subnetConfiguration: [
                {
                    subnetType: ec2.SubnetType.PUBLIC,
                    name: 'Public',
                    cidrMask: 20,
                },
                {
                    subnetType: ec2.SubnetType.PRIVATE,
                    name: 'Application',
                    cidrMask: 20,
                },
                {
                    subnetType: ec2.SubnetType.ISOLATED,
                    name: 'Database',
                    cidrMask: 24,
                }
            ],
        });

        this.elbSecurityGroup = new SecurityGroup(this, 'elbSecurityGroup', {
            allowAllOutbound: true,
            securityGroupName: 'elb-sg',
            vpc: this.myVpc,
        });

        this.elbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        this.elbSecurityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(80));

        this.asgSecurityGroup = new SecurityGroup(this, 'asgSecurityGroup', {
            allowAllOutbound: false,
            securityGroupName: 'asg-sg',
            vpc: this.myVpc,
        });

        this.asgSecurityGroup.connections.allowFrom(this.elbSecurityGroup, ec2.Port.tcp(80), 'Application Load Balancer Security Group');

        this.rdsSecurityGroup = new SecurityGroup(this, 'rdsSecurityGroup', {
            allowAllOutbound: false,
            securityGroupName: 'rds-sg',
            vpc: this.myVpc,
        })

        this.rdsSecurityGroup.connections.allowFrom(this.asgSecurityGroup, ec2.Port.tcp(3306), 'Allow connections from eb Auto Scaling Group Security Group');
    }
}