import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { SecretValue, StackProps } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { BuildSpec, ImagePullPrincipalType, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { LogStream } from 'aws-cdk-lib/aws-logs';

// export interface EcsPipelineStackProps extends cdk.StackProps {
//     ecsService: ecs.BaseService;
//     ecsCluster: ecs.ICluster;
//     //cluster: ecs.Cluster;
// }


export class PipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: any) {
        super(scope, id, props);

        //const service = props.ecsService;
        const service = ecs.BaseService.fromServiceArnWithCluster(this, 'EcsService', 'arn:aws:ecs:us-east-1:803314449489:service/dev-webapp/dev-webapp-ecs-WebServerServiceCD094CAD-5EUoq9cZVn8C');

        // getting existing VPC Id to create resources in it 
        const myvpc = Vpc.fromLookup(this, 'DevVpc', { isDefault: false, vpcName: 'dev-Vpc' });
        
        //Define pipeline artifacts
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

        // Define Build project and it's actions
        const buildProject = new codebuild.PipelineProject(this, 'EcsBuildProject', {
            buildSpec: codebuild.BuildSpec.fromSourceFilename('src/buildspec.yml'),
            environment: {
                buildImage: LinuxBuildImage.STANDARD_3_0,
                computeType: codebuild.ComputeType.SMALL,
                privileged: true,
                environmentVariables: {
                    IMAGE_REPO_NAME: {
                        value: 'webapp',
                    },
                    AWS_ACCOUNT_ID: {
                        value: this.account,
                    },

                },
            },
            vpc: myvpc,
            subnetSelection:{
                subnetType: SubnetType.PRIVATE_WITH_NAT
            },
            logging: {
                cloudWatch: {
                    logGroup:  new logs.LogGroup(this, 'WebappBuildLogs')
                },
            },
        });

        // Build actions
        const buildAction = new codepipeline_actions.CodeBuildAction({
            actionName: 'CodeBuild',
            project: buildProject,
            input: sourceOutput,
            outputs: [buildOutput],
        });

        //Adding ECR permissions to CodeBuild service role
        buildProject.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                "ecs:DescribeClusters",
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:BatchGetImage",
                "ecr:GetDownloadUrlForLayer",
                "ecr:PutImage",
                "ecr:CompleteLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:InitiateLayerUpload",
            ],
            resources: ['*'],
        }));

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