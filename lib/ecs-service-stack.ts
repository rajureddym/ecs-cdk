import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling'
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import { Construct } from 'constructs';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';


export class EcsClusterStack extends cdk.Stack {
    //public readonly ecsService: ecs.BaseService;
    //public readonly ecsCluster: ecs.ICluster;

    constructor(scope: Construct, id: string, props: any) {
        super(scope, id, props);

        // getting existing VPC Id to create resources in it 
        const myvpc = Vpc.fromLookup(this, 'DevVpc', { isDefault: false, vpcName: 'dev-Vpc' });

        // Create ECR repository
        const ecrRepo = new ecr.Repository(this, 'WebAppEcrRepo', {
            repositoryName: 'webapp',
            imageScanOnPush: true,
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
        });

        // Create ECS Cluster
        const ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
            vpc: myvpc,
            clusterName: 'dev-webapp',
            enableFargateCapacityProviders: true,
            containerInsights: true,
        });

        // Define SecurityGroup & it's Ingress rules to attach to Loadbalancer
        const ecsAlbSecurityGroup = new ec2.SecurityGroup(this, 'EcsAlbSG', {
            vpc: myvpc,
            allowAllOutbound: true,
            description: 'Security group for Loadbalancer'
        });

        ecsAlbSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80),
            'connect to load balancer from public internet on TCP port 80'
        );

        // SecurityGroup to attach to EC2 Instances or Fargate Service tasks
        const ecsEc2SecurityGroup = new ec2.SecurityGroup(this, 'EcsEC2SG', {
            vpc: myvpc,
            allowAllOutbound: true,
            description: 'Security group for EC2 Instances'
        });

        // Allowing Inbound to ECS EC2 Instances from ALB
        ecsEc2SecurityGroup.connections.allowFrom(
            new ec2.Connections({
                securityGroups: [ecsAlbSecurityGroup]
            }),
            ec2.Port.allTcp()
        )


        // create ALB for ecs service
        const ecsAlb = new elb.ApplicationLoadBalancer(this, 'ecsalb', {
            vpc: myvpc,
            internetFacing: true,
            securityGroup: ecsAlbSecurityGroup
        });

        // create ALB listener
        const listener = ecsAlb.addListener('ecsalb-listener', {
            port: 80
        });


        // Create EC2 AutoScalingGroup to provide infrastructure to run ECS Tasks
        const ecsAsg = new autoscaling.AutoScalingGroup(this, 'ecsAsgLC', {
            instanceType: new ec2.InstanceType('t3.micro'),
            vpc: myvpc,
            machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
            minCapacity: 0,
            maxCapacity: 100,
            securityGroup: ecsEc2SecurityGroup
        });

        // Define ECS CapacityProvider based off ASG
        const clusterCapacityProviders = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', {
            autoScalingGroup: ecsAsg

        });

        //Add or associate defined ECS CP to Cluster
        ecsCluster.addAsgCapacityProvider(clusterCapacityProviders);

        //Create Task Execution role policy 
        const executionRolePolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ]
        });

        // Create Task Definition
        const taskDef = new ecs.TaskDefinition(this, 'WebServerTaskDef', {
            cpu: '256',
            memoryMiB: '512',
            compatibility: ecs.Compatibility.EC2,
        });

        // Add execution role policy to Task Execution Role
        taskDef.addToExecutionRolePolicy(executionRolePolicy);

        // Add container to TaskDefinition created above
        const webContainer = taskDef.addContainer('web', {
            image: ecs.ContainerImage.fromRegistry('nginx:latest'),
            memoryLimitMiB: 512,
            logging: ecs.LogDriver.awsLogs({
                streamPrefix: 'webapp',
            })
        });

        // Add portmappings to above created container
        webContainer.addPortMappings({
            containerPort: 80,
            protocol: ecs.Protocol.TCP
        });

        // create ECS Service
        const ecsService = new ecs.Ec2Service(this, 'WebServerService', {
            cluster: ecsCluster,
            taskDefinition: taskDef,
            circuitBreaker: { rollback: true },
            minHealthyPercent: 100,
            maxHealthyPercent: 200,
            capacityProviderStrategies: [{
                capacityProvider: clusterCapacityProviders.capacityProviderName,
                weight: 1
            }]
        });

        // Add ecs service tasks to load balancer as targets
        const targateGroup = listener.addTargets('EcsTG', {
            port: 80,
            targets: [ecsService]
        });

        //Define ECS Service AutoScaling 
        const ecsServiceAutoscale = ecsService.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 20
        });

        ecsServiceAutoscale.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 75,
        });
        ecsServiceAutoscale.scaleOnRequestCount('AlbRequestCount', {
            requestsPerTarget: 1000,
            targetGroup: targateGroup,
        });


        // define ECS Service task placement strategy
        ecsService.addPlacementStrategies(
            ecs.PlacementStrategy.packedBy(ecs.BinPackResource.MEMORY),
            ecs.PlacementStrategy.spreadAcross(ecs.BuiltInAttributes.AVAILABILITY_ZONE)
        );

    }
}