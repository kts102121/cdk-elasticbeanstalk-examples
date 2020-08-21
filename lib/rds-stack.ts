import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as rds from '@aws-cdk/aws-rds'
import { DatabaseCluster, DatabaseClusterEngine } from '@aws-cdk/aws-rds';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as ssm from '@aws-cdk/aws-ssm'
import 'dotenv/config'
import { ISecurityGroup, IVpc } from '@aws-cdk/aws-ec2';
import { Secret } from '@aws-cdk/aws-secretsmanager';

interface RdsStackProps extends cdk.StackProps {
    myVpc: ec2.IVpc;
    rdsSecurityGroup: ec2.ISecurityGroup;
}

export class RdsStack extends cdk.Stack {
    readonly myRds: DatabaseCluster;
    readonly databaseCredentialsSecret: Secret;

    constructor(scope: cdk.Construct, id: string, props?: RdsStackProps) {
        super(scope, id, props);

        const databaseUsername = process.env.DB_USER;

        this.databaseCredentialsSecret = new secretsmanager.Secret(this, 'DBCredentialsSecret', {
            secretName: 'mysecret-db-credentials',
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
            parameterName: 'mysecret-db-credentials-arn',
            stringValue: this.databaseCredentialsSecret.secretArn,
        });

        this.myRds = new rds.DatabaseCluster(this, 'MyDatabase', {
            engine: DatabaseClusterEngine.auroraMysql({
                version: rds.AuroraMysqlEngineVersion.VER_2_08_1,
            }),
            masterUser: {
                username: this.databaseCredentialsSecret.secretValueFromJson('username').toString(),
                password: this.databaseCredentialsSecret.secretValueFromJson('password')
            },
            instanceProps: {
                instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
                securityGroups: [props?.rdsSecurityGroup as ISecurityGroup],
                vpcSubnets: {
                    subnetType: ec2.SubnetType.ISOLATED,
                },
                vpc: props?.myVpc as IVpc,
            },
            defaultDatabaseName: 'test',
            storageEncrypted: true
        });
    }   
}