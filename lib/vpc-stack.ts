import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { SecurityGroup, GatewayVpcEndpointAwsService } from '@aws-cdk/aws-ec2';

export class VpcStack extends cdk.Stack {
    readonly myVpc: ec2.IVpc;
    readonly bastionHostSecurityGroup: SecurityGroup;
    readonly elbSecurityGroup: SecurityGroup;
    readonly asgSecurityGroup: SecurityGroup;
    readonly rdsSecurityGroup: SecurityGroup;
    readonly elastiCacheSecurityGroup: SecurityGroup;

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
            ]
        });

        this.myVpc.addGatewayEndpoint('s3-gateway', {
            service: GatewayVpcEndpointAwsService.S3,
            subnets: [{
                subnetType: ec2.SubnetType.PRIVATE
            }]
        })

        this.bastionHostSecurityGroup = new SecurityGroup(this, 'bastionHostSecurityGroup', {
            allowAllOutbound: true,
            securityGroupName: 'bastion-sg',
            vpc: this.myVpc,
        });

        this.bastionHostSecurityGroup.addIngressRule(ec2.Peer.ipv4(`${process.env.MY_IP as string}`), ec2.Port.tcp(22));

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
        this.asgSecurityGroup.connections.allowFrom(this.bastionHostSecurityGroup, ec2.Port.tcp(22), 'Allows connections from bastion hosts');

        this.rdsSecurityGroup = new SecurityGroup(this, 'rdsSecurityGroup', {
            allowAllOutbound: false,
            securityGroupName: 'rds-sg',
            vpc: this.myVpc,
        })

        this.rdsSecurityGroup.connections.allowFrom(this.asgSecurityGroup, ec2.Port.tcp(3306), 'Allow connections from eb Auto Scaling Group Security Group');
        this.rdsSecurityGroup.connections.allowFrom(this.bastionHostSecurityGroup, ec2.Port.tcp(3306), 'Allow connections from bastion hosts');

        this.elastiCacheSecurityGroup = new SecurityGroup(this, 'elastiCacheSecurityGroup', {
            allowAllOutbound: false,
            securityGroupName: 'elasti-sg',
            vpc: this.myVpc,
        });

        this.elastiCacheSecurityGroup.connections.allowFrom(this.asgSecurityGroup, ec2.Port.tcp(6379), 'Allow connections from eb Auto Scaling Security Group');
    }
}