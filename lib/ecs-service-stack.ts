import * as cdk from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import { Construct } from 'constructs';

interface EcsClusterStackProps extends cdk.StackProps {
    vpc: Vpc,
}

export class MyEcsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
        super(scope, id, props);

        const cluster = new ecs.Cluster(this, 'EcsCluster', {
            vpc: props.vpc

        })

    }
}