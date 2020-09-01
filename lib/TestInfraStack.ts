import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as eb from '@aws-cdk/aws-elasticbeanstalk'
import * as s3assets from '@aws-cdk/aws-s3-assets'
import * as iam from '@aws-cdk/aws-iam'
import * as ssm from '@aws-cdk/aws-ssm'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import { CfnDBCluster, CfnDBSubnetGroup } from '@aws-cdk/aws-rds';
import { ServicePrincipal, Effect, ManagedPolicy, Policy } from '@aws-cdk/aws-iam';
import { SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';

export class TestInfraStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const myVpc = new ec2.Vpc(this, 'MyTestVPC', {
            cidr: '10.1.0.0/16',
            natGateways: 0,
            subnetConfiguration: [
                {
                    subnetType: ec2.SubnetType.PUBLIC,
                    name: 'Public',
                    cidrMask: 20,
                },
                {
                    subnetType: ec2.SubnetType.ISOLATED,
                    name: 'Database',
                    cidrMask: 28,
                }
            ]
        });
        
        const elbSecurityGroup = new SecurityGroup(this, 'elbSecurityGroup', {
            allowAllOutbound: true,
            securityGroupName: 'elb-sg',
            vpc: myVpc,
        });

        elbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        elbSecurityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(80));

        const asgSecurityGroup = new SecurityGroup(this, 'asgSecurityGroup', {
            allowAllOutbound: false,
            securityGroupName: 'asg-sg',
            vpc: myVpc,
        });

        asgSecurityGroup.connections.allowFrom(elbSecurityGroup, ec2.Port.tcp(80), 'Application Load Balancer Security Group');

        const rdsSecurityGroup = new SecurityGroup(this, 'rdsSecurityGroup', {
            allowAllOutbound: false,
            securityGroupName: 'rds-sg',
            vpc: myVpc,
        })

        rdsSecurityGroup.connections.allowFrom(asgSecurityGroup, ec2.Port.tcp(3306), 'Allow connections from eb Auto Scaling Group Security Group');

        // RDS start
        // get subnetids from vpc
        const subnetIds: string[] = [];
        myVpc.isolatedSubnets.forEach(subnet => {
            subnetIds.push(subnet.subnetId);
        });

        // create subnetgroup
        const dbSubnetGroup: CfnDBSubnetGroup = new CfnDBSubnetGroup(this, 'AuroraSubnetGroup', {
            dbSubnetGroupDescription: 'Subnet group to access aurora',
            dbSubnetGroupName: 'aurora-serverless-subnet-group',
            subnetIds
        });

        const databaseUsername = process.env.DB_USER;

        const databaseCredentialsSecret = new secretsmanager.Secret(this, 'DBCredentialsSecret', {
            secretName: 'mysecret-db-credentials-test',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: databaseUsername
                }),
                excludePunctuation: true,
                includeSpace: false,
                generateStringKey: 'password',
            }
        });

        new ssm.StringParameter(this, 'DBCredentialsArn', {
            parameterName: 'mysecret-db-credentials-arn-test',
            stringValue: databaseCredentialsSecret.secretArn,
        });

        const aurora = new CfnDBCluster(this, 'AuroraServerlessCdk', {
            databaseName: 'test',
            dbClusterIdentifier: 'aurora-serverless-test',
            engine: 'aurora',
            engineMode: 'serverless',
            masterUsername: databaseCredentialsSecret.secretValueFromJson('username').toString(),
            masterUserPassword: databaseCredentialsSecret.secretValueFromJson('password').toString(),
            port: 3306,
            vpcSecurityGroupIds: [rdsSecurityGroup.securityGroupId],
            dbSubnetGroupName: dbSubnetGroup.dbSubnetGroupName,
            scalingConfiguration: {
              autoPause: true,
              maxCapacity: 2,
              minCapacity: 2,
              secondsUntilAutoPause: 3600
            }
        });

        aurora.addDependsOn(dbSubnetGroup);
        // RDS end

        // This is the role that your application will assume
        const ebRole = new iam.Role(this, 'CustomEBRole', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com')
        })
  
        // This is the Instance Profile which will allow the application to use the above role
        const ebInstanceProfile = new iam.CfnInstanceProfile(this, 'CustomInstanceProfile', {
            roles: [ebRole.roleName],
        });
  
        // Policies for Instance Profile role 
        const secretsManagerPolicy: Policy = new iam.Policy(this, 'secretsManagerPolicy', {
            policyName: `myEbSecretsManagerPolicy`,
            statements: [
                new iam.PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['secretsmanager:GetSecretValue',],
                resources: [databaseCredentialsSecret.secretArn]
                })
            ]
        });
    

        const taggingPolicy: Policy = new iam.Policy(this, 'taggingPolicy', {
            policyName: `myEbTaggingPolicy`,
            statements: [
            new iam.PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                'tag:GetResources', 'tag:TagResources', 'tag:UntagResources', 'tag:GetTagKeys', 'tag:GetTagValues', 'cloudfront:GetDistribution', 'acm:ListCertificates',
                ],
                resources: ['*'],
            })
            ]
        });

        // Allow the app to get secret values
        ebRole.attachInlinePolicy(secretsManagerPolicy);
        ebRole.attachInlinePolicy(taggingPolicy);

        // Needed for all those extra things
        ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'));
        ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkMulticontainerDocker'));
        ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWorkerTier'));
        ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        
        const envVars = [
            ['SECRET_ARN', `${databaseCredentialsSecret.secretArn}`],
            ['SPRING_PROFILES_ACTIVE', 'test'],
            ['DB_URL', `${aurora.attrEndpointAddress}`]
        ];

        const optionSettingProperties: eb.CfnEnvironment.OptionSettingProperty[] = [
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'VPCId',
                value: myVpc.vpcId,
            },
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'Subnets',
                value: myVpc.publicSubnets.map(value => value.subnetId).join(','),
            },
            // Attach the instance profile!
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'IamInstanceProfile',
                value: ebInstanceProfile.attrArn,
            },
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'InstanceType',
                value: 't2.micro'
            },
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'SecurityGroups',
                value: asgSecurityGroup.securityGroupId,
            },
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'SSHSourceRestriction',
                value: 'tcp, 22, 22, 72.21.198.67/32',
            },
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'EC2KeyName',
                value: process.env.KEY_NAME
            },
            {
                namespace: 'aws:elasticbeanstalk:environment',
                optionName: 'EnvironmentType',
                value: 'SingleInstance'
            },
            ...envVars.map(([optionName, value]) => ({
              namespace: 'aws:elasticbeanstalk:application:environment',
              optionName,
              value,
            })),
        ];

        // Construct an S3 asset from the ZIP located from directory up
        const ebZipArchive = new s3assets.Asset(this, 'MyEbAppZip', {
            path: `${__dirname}/../demo/target/demo-0.0.1-SNAPSHOT.jar`,
        });

        const appName = 'MyApp2';
        const app = new eb.CfnApplication(this, 'Application', {
            applicationName: appName,
        });


        // Create an app version from the S3 asset defined above
        // The S3 "putObject" will occur first before CF generates the template
        const appVersionProps = new eb.CfnApplicationVersion(this, 'AppVersion', {
            applicationName: appName,
            sourceBundle: {
                s3Bucket: ebZipArchive.s3BucketName,
                s3Key: ebZipArchive.s3ObjectKey,
            },
        });

        // eslist-disable-next-line @typescript-eslint/no-unused-vars
        const myEb = new eb.CfnEnvironment(this, 'Environment', {
            environmentName: 'MyTestSampleEnvironment',
            applicationName: app.applicationName || appName,
            solutionStackName: '64bit Amazon Linux 2 v3.1.0 running Corretto 11',
            optionSettings: optionSettingProperties,
            // This line is critical - reference the label created in this same stack
            versionLabel: appVersionProps.ref,
        });

        // Also very important - make sure the `app` exists before creating an app version.
        appVersionProps.addDependsOn(app);
    }
}
