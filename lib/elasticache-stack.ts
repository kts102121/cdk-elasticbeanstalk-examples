import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import { CfnCacheCluster, CfnSubnetGroup, CfnParameterGroup } from '@aws-cdk/aws-elasticache'

interface ElastiCacheStackProps extends cdk.StackProps {
    myVpc: ec2.IVpc;
    elastiCacheSecurityGroup: ec2.ISecurityGroup;
}

export class ElastiCacheStack extends cdk.Stack {
    readonly myElastiCache: CfnCacheCluster;

    constructor(scope: cdk.Construct, id: string, props?: ElastiCacheStackProps) {
        super(scope, id, props);

        const subnetIds: string[] = [];
        props?.myVpc.isolatedSubnets.forEach(subnet => {
            subnetIds.push(subnet.subnetId);
        });

        const cacheSubnetGroup = new CfnSubnetGroup(this, 'RedisSubnetGroup', {
            cacheSubnetGroupName: 'myCacheSubnetGroup',
            description: 'Isolated subnet group for elasti cache',
            subnetIds: subnetIds,
        });

        const cacheParameterGroup = new CfnParameterGroup(this, 'RedisParameterGroup', {
            cacheParameterGroupFamily: 'redis5.0',
            description: 'Enable notify-keyspace-events for Spring Session',
            properties: {
                'notify-keyspace-events': 'Egx'
            }
        })

        this.myElastiCache = new CfnCacheCluster(this, 'RedisInstance', {
            engine: 'redis',
            cacheNodeType: 'cache.t2.small',
            numCacheNodes: 1,
            clusterName: 'redis-cluster',
            vpcSecurityGroupIds: [props?.elastiCacheSecurityGroup.securityGroupId as string],
            cacheSubnetGroupName: cacheSubnetGroup.cacheSubnetGroupName,
            cacheParameterGroupName: cacheParameterGroup.ref,
        })

        this.myElastiCache.addDependsOn(cacheSubnetGroup);
    }
}