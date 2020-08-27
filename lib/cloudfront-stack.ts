import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment'
import * as eb from '@aws-cdk/aws-elasticbeanstalk'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam';
import { Policy, Effect, CompositePrincipal } from '@aws-cdk/aws-iam';
import { RemovalPolicy } from '@aws-cdk/core';
import { PriceClass } from '@aws-cdk/aws-cloudfront';

interface CloudFrontStackProps extends cdk.StackProps {
    ebEnv: eb.CfnEnvironment;
}

export class CloudFrontStack extends cdk.Stack {
    readonly myLoggingBucket: s3.Bucket;

    constructor(scope: cdk.Construct, id: string, props?: CloudFrontStackProps) {
        super(scope, id, props);

        const myWebHostingBucket = new s3.Bucket(this, 'MyStaticWebHostingBucket', {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            websiteIndexDocument: 'index.html'
        });

        this.myLoggingBucket = new s3.Bucket(this, 'MyLoggingBucket', {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'MyOriginAccessIdentity', {
            comment: 'Allows read access from cloudfront'
        });

        myWebHostingBucket.grantRead(originAccessIdentity);
        this.myLoggingBucket.grantReadWrite(originAccessIdentity);

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

        const modifyOriginRequestURILambda = new lambda.Function(this, 'MyModifyOriginRequestURILambda', {
            runtime: lambda.Runtime.NODEJS_12_X,
            code: lambda.Code.fromAsset('lambda'),
            handler: 'modifyHandleEndingSlash.handler',
            role: lambdaRole,
            currentVersionOptions: {
                removalPolicy: RemovalPolicy.RETAIN,
                retryAttempts: 5
            },
        })

        const modifyOriginRequestURILambdaVersion = new lambda.Version(this, 'MyModifyOriginRequestURILambdaFunctionVersion', {
            lambda: modifyOriginRequestURILambda,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        const myStaticResourceDistribution = new cloudfront.CloudFrontWebDistribution(this, 'MyStaticWebDistribution', {
            originConfigs: [{
                    s3OriginSource: {
                        s3BucketSource: myWebHostingBucket,
                        originAccessIdentity: originAccessIdentity,
                    },
                    behaviors: [{ 
                        isDefaultBehavior: true,
                        lambdaFunctionAssociations: [{
                            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
                            lambdaFunction: modifyOriginRequestURILambdaVersion,
                        }]
                    }]
            }],
            loggingConfig: {
                bucket: this.myLoggingBucket,
                prefix: 'cloudfront/web/'
            },
            priceClass: PriceClass.PRICE_CLASS_ALL
        });
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        new s3Deployment.BucketDeployment(this, 'MyStaticWebHostingDeployment', {
            sources: [s3Deployment.Source.asset(`${__dirname}/../website`)],
            destinationBucket: myWebHostingBucket,
            distribution: myStaticResourceDistribution,
            retainOnDelete: false
        });

        const elbDistribution = new cloudfront.CloudFrontWebDistribution(this, 'MyDynamicDistribution', {
            originConfigs: [{
                customOriginSource: {
                    domainName: props?.ebEnv.attrEndpointUrl || '',
                    originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
                },
                behaviors: [{
                    isDefaultBehavior: true,
                    allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                    forwardedValues: {
                        queryString: true,
                        cookies: {
                            forward: 'all',
                        },
                        headers: ["*"]
                    },
                }],
            }],
            loggingConfig: {
                bucket: this.myLoggingBucket,
                prefix: 'cloudfront/elb/'
            },
            defaultRootObject: '',
            priceClass: PriceClass.PRICE_CLASS_ALL,
        });

        (elbDistribution.node.tryFindChild("CFDistribution") as cloudfront.CfnDistribution).addPropertyOverride("Tags", [
            {
                'Key': 'ResourceType',
                'Value': 'ElbDistribution'
            }
        ]);

        (myStaticResourceDistribution.node.tryFindChild("CFDistribution") as cloudfront.CfnDistribution).addPropertyOverride("Tags", [
            {
                'Key': 'ResourceType',
                'Value': 'StaticDistribution'
            }
        ]);
    }
}
