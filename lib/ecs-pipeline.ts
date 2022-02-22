import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { SecretValue, StackProps } from 'aws-cdk-lib';
import * as  EcsClusterStack from '../lib/ecs-service-stack';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';

// export interface EcsPipelineStackProps extends cdk.StackProps {
//     ecsService: ecs.BaseService;
//     ecsCluster: ecs.ICluster;
//     //cluster: ecs.Cluster;
// }


export class PipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: any) {
        super(scope, id, props);

        //const service = props.ecsService;
        const service = ecs.BaseService.fromServiceArnWithCluster(this, 'EcsService', 'arn:aws:ecs:us-east-1:803314449489:service/dev-webapp/dev-webapp-ecs-WebServerServiceCD094CAD-5EUoq9cZVn8C')

        const sourceOutput = new codepipeline.Artifact();
        const buildOutput = new codepipeline.Artifact('buildOut');

        //Define source stage and it's actions
        const sourceAction = new codepipeline_actions.GitHubSourceAction({
            actionName: 'GitHub_Source',
            owner: 'rajureddym',
            repo: 'ecs-cdk',
            oauthToken: SecretValue.secretsManager('my-github-token', { jsonField: 'my-github-token' }),
            output: sourceOutput,
            branch: 'master'
        });

        // Define Build stage and it's actions
        const buildProject = new codebuild.PipelineProject(this, 'EcsBuildProject', {
            environment: {
                buildImage: LinuxBuildImage.STANDARD_3_0,
                computeType: codebuild.ComputeType.MEDIUM,
                privileged: true,
                environmentVariables: {
                    IMAGE_REPO_NAME: {
                        value: 'webapp',
                    },

                },
            }
        });

        const buildAction = new codepipeline_actions.CodeBuildAction({
            actionName: 'CodeBuild',
            project: buildProject,
            input: sourceOutput,
            outputs: [buildOutput],
        });

        // Define Deploy stage and it's actions
        const deployAction = new codepipeline_actions.EcsDeployAction({
            actionName: 'EcsDeployActions',
            service,
            imageFile: new codepipeline.ArtifactPath(buildOutput, `imagedefinitions.json`)
        });

        // Create CodePipeline and add all stages to pipeline
        const pipeline = new codepipeline.Pipeline(this, 'EcsPipeline', {
            pipelineName: 'ECS-DevOps',
            stages: [{
                stageName: 'Source',
                actions: [sourceAction],
            },
            {
                stageName: 'Build',
                actions: [buildAction],
            },
            {
                stageName: 'Deploy',
                actions: [deployAction]
            },
            ]

        });

    }
}