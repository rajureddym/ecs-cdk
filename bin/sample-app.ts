#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EcsClusterStack } from '../lib/ecs-service-stack';
import { MyVPCStack } from '../lib/network-vpc-stack';
import { SampleAppStack, SamplePipelineStack } from '../lib';

const app = new cdk.App();
new SampleAppStack(app, 'SampleAppStack');
new SamplePipelineStack(app, 'SamplePipelineStack');
new MyVPCStack(app, 'MyVPCStack');
new EcsClusterStack(app, 'MyEcsStack');