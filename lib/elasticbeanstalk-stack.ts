import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2'
import * as eb from '@aws-cdk/aws-elasticbeanstalk'
import * as s3assets from '@aws-cdk/aws-s3-assets'
import * as iam from '@aws-cdk/aws-iam'

import { DatabaseCluster } from '@aws-cdk/aws-rds'
import { ServicePrincipal, ManagedPolicy, Policy, Effect } from '@aws-cdk/aws-iam'
import { SecurityGroup } from '@aws-cdk/aws-ec2';
import { Secret } from '@aws-cdk/aws-secretsmanager';
import 'dotenv/config'
import { CfnCacheCluster } from '@aws-cdk/aws-elasticache';

interface ElasticBeanstalkStackProps extends cdk.StackProps {
  myVpc: ec2.IVpc;
  asgSecurityGroup: SecurityGroup;
  databaseCredentialsSecret: Secret;
  myRds: DatabaseCluster;
  myElastiCache: CfnCacheCluster;
}

export class ElasticBeanstalkStack extends cdk.Stack {
  readonly ebEnv: eb.CfnEnvironment;

  constructor(scope: cdk.Construct, id: string, props?: ElasticBeanstalkStackProps) {
    super(scope, id, props);

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
            resources: [props?.databaseCredentialsSecret.secretArn as string]
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
    })

    // Allow the app to get secret values
    ebRole.attachInlinePolicy(secretsManagerPolicy);
    ebRole.attachInlinePolicy(taggingPolicy);

    // Needed for all those extra things
    ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'));
    ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkMulticontainerDocker'));
    ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWorkerTier'));
    ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    // $(aws secretsmanager get-secret-value --secret-id arn:aws:secretsmanager:<region>:<aws-account-id>:secret:<secret-arn> --region <region> | jq --raw-output '.SecretString' | jq -r .password) 

    // Example of some options which can be configured
    const envVars = [
      ['SECRET_ARN', `${props?.databaseCredentialsSecret.secretArn as string}`],
      ['SPRING_PROFILES_ACTIVE', 'prod'],
      ['DB_URL', `${props?.myRds.clusterEndpoint.hostname as string}`],
      ['REDIS_URL', `${props?.myElastiCache.attrRedisEndpointAddress as string}`]
    ]

    const optionSettingProperties: eb.CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MinSize',
        value: '1',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MaxSize',
        value: '20',
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'VPCId',
        value: props?.myVpc.vpcId,
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'Subnets',
        value: props?.myVpc.privateSubnets.map(value => value.subnetId).join(','),
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'ELBSubnets',
        value: props?.myVpc.publicSubnets.map(value => value.subnetId).join(','),
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
        value: 't3.small'
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'SecurityGroups',
        value: props?.asgSecurityGroup.securityGroupId,
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'EC2KeyName',
        value: process.env.KEY_NAME
      },
      {
        namespace: 'aws:ec2:instances',
        optionName: 'EnableSpot',
        value: 'true',
      },
      {
        namespace: 'aws:ec2:instances',
        optionName: 'InstanceTypes',
        value: 't3.small,c3.large,c4.large,c5.large,m4.large,m5.large',
      },
      {
        namespace: 'aws:ec2:instances',
        optionName: 'SpotFleetOnDemandBase',
        value: '1',
      },
      {
        namespace: 'aws:ec2:instances',
        optionName: 'SpotFleetOnDemandAboveBasePercentage',
        value: '30',
      },
      {
        namespace: 'aws:ec2:instances',
        optionName: 'SpotMaxPrice',
        value: 'null',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'LoadBalancerType',
        value: 'application',
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

    const appName = 'MyApp';
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
    this.ebEnv = new eb.CfnEnvironment(this, 'Environment', {
      environmentName: 'MySampleEnvironment',
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
