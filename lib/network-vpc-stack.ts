import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { NatInstanceProvider, PrivateSubnet, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';

export class MyVPCStack extends cdk.Stack {
    static vpc: any;
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'MyVPC', {
            maxAzs: 3,
            cidr: '10.0.0.0/21',
            vpcName: 'dev-Vpc',
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,

                },
                // {
                //     cidrMask: 24,
                //     name: 'PublicSubnet-02',
                //     subnetType: ec2.SubnetType.PUBLIC
                // },
                {
                    cidrMask: 24,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
                }
                // {
                //     cidrMask: 24,
                //     name: 'PrivateSubnet-02',
                //     subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
                // }

            ],
            natGatewayProvider: NatInstanceProvider.gateway(),

        });

        const S3GatewayEndpoint = vpc.addGatewayEndpoint('S3GatwayEndpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            subnets: [{
                subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
            }]
        });

        const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSG', {
            vpc: vpc,
            allowAllOutbound: true,
            description: 'Security group for lambda functions to run inside VPC'
        });

        lambdaSecurityGroup.addEgressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            'connect to aws service endpoints on 443'
        );

        const InterfaceEndPointSG = new ec2.SecurityGroup(this, 'VpcEndpointSG', {
            vpc: vpc,
            description: 'Security group to attach to VPC Interface Endpoint'
        });

        InterfaceEndPointSG.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            'Opening Ingress on 443 for InterfaceVPCEndopints to communicate with AWS Services'
        );

        const ecsEndpoint = vpc.addInterfaceEndpoint('EcsEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECS,
            subnets: vpc.selectSubnets({
                subnetType: SubnetType.PRIVATE_WITH_NAT
            }),
            privateDnsEnabled: true

        });
    }
}

