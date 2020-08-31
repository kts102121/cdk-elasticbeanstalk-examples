import 'dotenv/config'
import * as cdk from '@aws-cdk/core'
import * as codebuild from '@aws-cdk/aws-codebuild'
import * as codepipeline from '@aws-cdk/aws-codepipeline'
import * as cpaction from '@aws-cdk/aws-codepipeline-actions'
import { BuildEnvironmentVariableType } from '@aws-cdk/aws-codebuild'

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        
        const sourceArtifact = new codepipeline.Artifact();
        const cdkBuildOutput = new codepipeline.Artifact('CdkBuildOutput');

        const cdkBuild = new codebuild.PipelineProject(this, 'CdkBuild', {
            buildSpec: codebuild.BuildSpec.fromObject({
              version: '0.2',
              env: {
                variables: {
                    ACCOUNT_ID: process.env.ACCOUNT_ID,
                    REGION: process.env.REGION,
                    MY_IP: process.env.MY_IP,
                    CIDR: process.env.CIDR,
                },
              },
              phases: {
                install: {
                  commands: [
                    'npm install',
                    'npm install -g cdk',
                    'npm install -g typescript'
                  ],
                },
                build: {
                  commands: [
                    'cd demo/',
                    'mvn package -DskipTests=true -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn',
                    'cd ..',
                    'ls -ltr',
                    'npm run build',
                    'npm run cdk synth VpcStack -- -v -o dist',

                  ],
                },
              },
              artifacts: {
                'base-directory': 'dist',
                files: [
                  'VpcStack.template.json',
                ],
              },
            }),
            environment: {
              buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
              environmentVariables: {
                    ACCOUNT_ID: {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: process.env.ACCOUNT_ID,
                    },
                    REGION: {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: process.env.REGION,
                    },
                    MY_IP: {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: process.env.MY_IP,
                    },
                    CIDR: {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: process.env.CIDR
                    },
                }
            },
        });

        new codepipeline.Pipeline(this, 'Pipeline', {
            stages: [
                {
                    stageName: 'Source',
                    actions: [
                        new cpaction.GitHubSourceAction({
                            actionName: 'Github',
                            output: sourceArtifact,
                            owner: process.env.REPO_OWNER as string,
                            repo: process.env.REPO_NAME as string,
                            oauthToken: cdk.SecretValue.secretsManager('github-token'),
                            trigger: cpaction.GitHubTrigger.WEBHOOK
                        })
                    ],
                },
                {
                    stageName: 'Build',
                    actions: [
                        new cpaction.CodeBuildAction({
                            actionName: 'Build_CDK_Action',
                            project: cdkBuild,
                            input: sourceArtifact,
                            outputs: [cdkBuildOutput],
                        })
                    ],
                },
                {
                    stageName: 'Deploy',
                    actions: [
                        new cpaction.CloudFormationCreateUpdateStackAction({
                            actionName: 'CFN_Deploy',
                            templatePath: cdkBuildOutput.atPath('VpcStack.template.json'),
                            stackName: 'VpcStack',
                            adminPermissions: true,

                        })
                    ]
                }
            ]
        });
    }
}