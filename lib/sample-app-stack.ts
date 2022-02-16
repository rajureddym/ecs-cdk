import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { CodeCommitSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import { CodeBuildStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { MyVPCStack } from './network-vpc-stack';

export class SampleAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const stackName = this.node.tryGetContext("stack_name") ?? "dev";

    const vpcStackName = `${stackName}-vpc`;

    const vpcStack = new MyVPCStack(this, vpcStackName, {
      env: {
        account: this.account || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: this.region || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
      },
      stackName: vpcStackName,
    })

  }
}

export class SamplePipelineStack extends Stack {
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
          'npm run build',
          'npx cdk synth'
        ]
      }
      )
    });

  }

}
