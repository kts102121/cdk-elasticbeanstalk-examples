import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment'
import * as eb from '@aws-cdk/aws-elasticbeanstalk'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam';
import { Policy, Effect, CompositePrincipal } from '@aws-cdk/aws-iam';

interface CloudFrontStackProps extends cdk.StackProps {
    ebEnv: eb.CfnEnvironment;
}

export class CloudFrontStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: CloudFrontStackProps) {
        super(scope, id, props);

        const myWebHostingBucket = new s3.Bucket(this, 'MyStaticWebHostingBucket', {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            websiteIndexDocument: 'index.html'
        });

        const myLoggingBucket = new s3.Bucket(this, 'MyLoggingBucket', {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'MyOriginAccessIdentity', {
            comment: 'Allows read access from cloudfront'
        });

        myWebHostingBucket.grantRead(originAccessIdentity);
        myLoggingBucket.grantReadWrite(originAccessIdentity);

        const lambdaRole = new iam.Role(this, 'MyRequestModifyLambdaFunctionRole', {
            assumedBy: new CompositePrincipal(
                new iam.ServicePrincipal('lambda.amazonaws.com'), new iam.ServicePrincipal('edgelambda.amazonaws.com'),
            )
        })

        const cloudwatchLogsPolicy: Policy = new iam.Policy(this, 'MyRequestModifyLambdaFunctionPolicy', {
            policyName: `myCloudwatchLogsPolicyForLambdaEdge`,
            statements: [
                new iam.PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        'logs:CreateLogGroup',
                        'logs:CreateLogStream',
                        'logs:PutLogEvents'
                    ],
                    resources: ['arn:aws:logs:*:*:*'],
                }),
            ]
        });

        lambdaRole.attachInlinePolicy(cloudwatchLogsPolicy);

        const modifyViewerRequestURILambda = new lambda.Function(this, 'MyModifyViewerRequestURILambda', {
            runtime: lambda.Runtime.NODEJS_12_X,
            code: lambda.Code.fromAsset('lambda'),
            handler: 'modifyViewerRequestURI.handler',
            role: lambdaRole,
        })

        const modifyOriginRequestURILambda = new lambda.Function(this, 'MyModifyOriginRequestURILambda', {
            runtime: lambda.Runtime.NODEJS_12_X,
            code: lambda.Code.fromAsset('lambda'),
            handler: 'modifyOriginRequestURI.handler',
            role: lambdaRole,
        })


        const modifyViewerRequestLambdaVersion = new lambda.Version(this, 'MyModifyViewerRequestURILambdaFunctionVersion', {
            lambda: modifyViewerRequestURILambda,
        });

        const modifyOriginRequestURILambdaVersion = new lambda.Version(this, 'MyModifyOriginRequestURILambdaFunctionVersion', {
            lambda: modifyOriginRequestURILambda,
        });

        const distribution = new cloudfront.CloudFrontWebDistribution(this, 'MyDynamicDistribution', {
            originConfigs: [
                {
                    customOriginSource: {
                        domainName: props?.ebEnv.attrEndpointUrl || '',
                        originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
                    },
                    behaviors: [{
                        pathPattern: 'api/*',
                        allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                        forwardedValues: {
                            queryString: true,
                            cookies: {
                                forward: 'all',
                            },
                            headers: ["*"]
                        },
                        lambdaFunctionAssociations: [{
                            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
                            lambdaFunction: modifyViewerRequestLambdaVersion,
                        }]
                    }]
                },
                {
                    s3OriginSource: {
                        s3BucketSource: myWebHostingBucket,
                        originAccessIdentity: originAccessIdentity,
                    },
                    behaviors: [{ 
                        isDefaultBehavior: true,
                        lambdaFunctionAssociations: [{
                            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                            lambdaFunction: modifyOriginRequestURILambdaVersion,
                        }]
                    }]
                }
            ],
            loggingConfig: {
                bucket: myLoggingBucket,
                prefix: 'cloudfront/'
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        new s3Deployment.BucketDeployment(this, 'MyStaticWebHostingDeployment', {
            sources: [s3Deployment.Source.asset(`${__dirname}/../website`)],
            destinationBucket: myWebHostingBucket,
            distribution: distribution,
            retainOnDelete: false
        });
    }
}