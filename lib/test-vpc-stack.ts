import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { SecurityGroup, GatewayVpcEndpointAwsService } from '@aws-cdk/aws-ec2';

export class TestVpcStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
      
        const myTestVpc = new ec2.Vpc(this, 'MyTestVPC', {
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

        myTestVpc.addGatewayEndpoint('test-s3-gateway', {
            service: GatewayVpcEndpointAwsService.S3,
            subnets: [{
                subnetType: ec2.SubnetType.PRIVATE
            }]
        })

        const testBastionHostSecurityGroup = new SecurityGroup(this, 'testBastionHostSecurityGroup', {
            allowAllOutbound: true,
            securityGroupName: 'test-bastion-sg',
            vpc: myTestVpc,
        });

        testBastionHostSecurityGroup.addIngressRule(ec2.Peer.ipv4(`${process.env.MY_IP as string}`), ec2.Port.tcp(22));

        const testElbSecurityGroup = new SecurityGroup(this, 'testElbSecurityGroup', {
            allowAllOutbound: true,
            securityGroupName: 'test-elb-sg',
            vpc: myTestVpc,
        });

        testElbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        testElbSecurityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(80));

        const testAsgSecurityGroup = new SecurityGroup(this, 'testAsgSecurityGroup', {
            allowAllOutbound: false,
            securityGroupName: 'test-asg-sg',
            vpc: myTestVpc,
        });

        testAsgSecurityGroup.connections.allowFrom(testElbSecurityGroup, ec2.Port.tcp(80), 'Application Load Balancer Security Group');
        testAsgSecurityGroup.connections.allowFrom(testBastionHostSecurityGroup, ec2.Port.tcp(22), 'Allows connections from bastion hosts');

        const testRdsSecurityGroup = new SecurityGroup(this, 'testRdsSecurityGroup', {
            allowAllOutbound: false,
            securityGroupName: 'test-rds-sg',
            vpc: myTestVpc,
        })

        testRdsSecurityGroup.connections.allowFrom(testAsgSecurityGroup, ec2.Port.tcp(3306), 'Allow connections from eb Auto Scaling Group Security Group');
        testRdsSecurityGroup.connections.allowFrom(testBastionHostSecurityGroup, ec2.Port.tcp(3306), 'Allow connections from bastion hosts');

        const testElastiCacheSecurityGroup = new SecurityGroup(this, 'testElastiCacheSecurityGroup', {
            allowAllOutbound: false,
            securityGroupName: 'test-elasti-sg',
            vpc: myTestVpc,
        });

        testElastiCacheSecurityGroup.connections.allowFrom(testAsgSecurityGroup, ec2.Port.tcp(6379), 'Allow connections from eb Auto Scaling Security Group');
    }
}