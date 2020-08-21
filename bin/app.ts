#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ElasticBeanstalkStack } from '../lib/elasticbeanstalk-stack';
import { VpcStack } from '../lib/vpc-stack';
import { CloudFrontStack } from '../lib/cloudfront-stack'
import 'dotenv/config'
import { RdsStack } from '../lib/rds-stack';

const app = new cdk.App();

const env = {
    account: process.env.ACCOUNT_ID,
    region: process.env.REGION
}

const vpcStack = new VpcStack(app, 'VpcStack', { env: env });

const rdsStack = new RdsStack(app, 'RdsStack', {myVpc: vpcStack.myVpc, rdsSecurityGroup: vpcStack.rdsSecurityGroup, env: env});

const ebStack = new ElasticBeanstalkStack(app, 'ElasticBeanstalkStack', { myVpc: vpcStack.myVpc, asgSecurityGroup: vpcStack.asgSecurityGroup, databaseCredentialsSecret: rdsStack.databaseCredentialsSecret, myRds: rdsStack.myRds, env: env});

const cdnStack = new CloudFrontStack(app, 'CloudFrontStack', { ebEnv: ebStack.ebEnv, env: env});


rdsStack.addDependency(vpcStack);
ebStack.addDependency(rdsStack);
cdnStack.addDependency(ebStack);