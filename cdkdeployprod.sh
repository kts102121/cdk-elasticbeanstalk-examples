#!/bin/sh
npm run build && cdk synth && cdk deploy VpcStack BastionHostStack RdsStack ElastiCacheStack ElasticBeanstalkStack CloudFrontStack GlueStack
