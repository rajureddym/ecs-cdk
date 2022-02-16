#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SampleAppStack, SamplePipelineStack } from '../lib/sample-app-stack';

const app = new cdk.App();
new SampleAppStack(app, 'SampleAppStack');
new SamplePipelineStack(app,'SamplePipelineStack');


const stackName = app.node.tryGetContext("stack_name") ?? "dev";

//const pipelineStackName = `${stackName}-pipeline`;