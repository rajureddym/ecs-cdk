import * as cdk from 'aws-cdk-lib';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import { CodeBuildStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { MyVPCStack } from './network-vpc-stack';
import { EcsClusterStack }from './ecs-service-stack';


export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

  }
}

const app = new cdk.App();

const stackName = app.node.tryGetContext("stack_name") ?? "dev";
const vpcStackName = `${stackName}-vpc`;

const vpcStack = new MyVPCStack(app, 'vpc-stack', {
  env: {
    account: app.account || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: app.region || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
  },
  stackName: vpcStackName,
});

const ecsStackName = `${stackName}-ecs`;

const ecsStack = new EcsClusterStack(app, 'ecs-stack', {
  env: {
    account: app.account || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: app.region || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
  },
  stackName: ecsStackName
});


export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // creating CodeCommit repository
    const repo = new codecommit.Repository(this, 'SampleRepo', {
      repositoryName: "SampleRespository"
    })

    // definiting pipeline resource

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'DemoPipeline',
      synth: new CodeBuildStep('SynthStep', {
        input: CodePipelineSource.codeCommit(repo, 'master'),
        installCommands: [
          'npm install -g aws-cdk'
        ],
        commands: [
          'npm ci',
          'npx cdk build',
          'npx cdk synth'
        ]
      }
      )
    });

  }

}
