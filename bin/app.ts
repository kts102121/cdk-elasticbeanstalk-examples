#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ElasticBeanstalkStack } from '../lib/elasticbeanstalk-stack';
import { VpcStack } from '../lib/vpc-stack';
import { CloudFrontStack } from '../lib/cloudfront-stack'
import 'dotenv/config'
import { RdsStack } from '../lib/rds-stack';
import { GlueStack } from '../lib/glue-stack';
import { TestInfraStack } from '../lib/TestInfraStack';
import { ElastiCacheStack } from '../lib/elasticache-stack';
import { LinuxBastionStack } from '../lib/linux-bastion'
import { PipelineStack } from '../lib/pipeline-stack';
import { TestVpcStack } from '../lib/test-vpc-stack';

const app = new cdk.App();

const env = {
    account: process.env.ACCOUNT_ID,
    region: process.env.REGION
}

const vpcStack = new VpcStack(app, 'VpcStack', { env: env });

const bastionHost = new LinuxBastionStack(app, 'BastionHostStack', { myVpc: vpcStack.myVpc, bastionHostSecurityGroup: vpcStack.bastionHostSecurityGroup, env: env });

const rdsStack = new RdsStack(app, 'RdsStack', {myVpc: vpcStack.myVpc, rdsSecurityGroup: vpcStack.rdsSecurityGroup, env: env });

const elasticacheStack = new ElastiCacheStack(app, 'ElastiCacheStack', { myVpc: vpcStack.myVpc, elastiCacheSecurityGroup: vpcStack.elastiCacheSecurityGroup, env: env })

const ebStack = new ElasticBeanstalkStack(app, 'ElasticBeanstalkStack', { myVpc: vpcStack.myVpc, asgSecurityGroup: vpcStack.asgSecurityGroup, databaseCredentialsSecret: rdsStack.databaseCredentialsSecret, myRds: rdsStack.myRds, myElastiCache: elasticacheStack.myElastiCache, env: env });

const cdnStack = new CloudFrontStack(app, 'CloudFrontStack', { ebEnv: ebStack.ebEnv, env: env });

const glueStack = new GlueStack(app, 'GlueStack', { myLoggingBucket: cdnStack.myLoggingBucket, env: env })

bastionHost.addDependency(vpcStack);
rdsStack.addDependency(vpcStack);
ebStack.addDependency(rdsStack);
ebStack.addDependency(elasticacheStack);
cdnStack.addDependency(ebStack);
glueStack.addDependency(cdnStack);

const testInfraStack = new TestInfraStack(app, 'TestInfraStack', { env: env });

const pipelineStack = new PipelineStack(app, 'PipelineStack', { env: env });

new TestVpcStack(app, 'TestVpcStack', { env: env });
