import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import ddb = require('@aws-cdk/aws-dynamodb');
import s3 = require('@aws-cdk/aws-s3');
import s3deploy = require('@aws-cdk/aws-s3-deployment');




export class AzLatencyTestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /*
    const uploadBucketName = new cdk.CfnParameter(this, "PingTestBucketName", {
      type: "String",
      description:
        "The name of the Amazon S3 bucket where uploaded files will be stored.",
    });
    */
   const uploadBucketName = this.node.tryGetContext('bucketname');
   const keypairName = this.node.tryGetContext('keypairname');
   const ddbTableName = this.node.tryGetContext('ddbname');

    // Make S3 to copy ping script. 
    const pingtestbucket = new s3.Bucket(this, `pingtest-script-bucket`, {
      bucketName: uploadBucketName,
    });
    // upload ping test script into bucket.
    new s3deploy.BucketDeployment(this, "DeployFiles", {
      sources: [s3deploy.Source.asset("./resources")],
      destinationBucket: pingtestbucket,
    });

    // The code that defines your stack goes here
    const vpcLatencyTestCidr = "172.24.0.0/16";
    const vpcLatencyTest = new ec2.Vpc(this, `VpcLatencyTest`, {
      cidr: vpcLatencyTestCidr,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PRIVATE,
          name: "privateSubnet",
          cidrMask: 26,
        },
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: "publicSubnet",
          cidrMask: 26,
        }
      ],
    });

    // make a security group to test ping test.
    const pingsg = new ec2.SecurityGroup(this, "pingsg", {
      vpc: vpcLatencyTest,
      securityGroupName: "pingsg",
      description: "this sg contains only ingress rule for ICMP.",
    });

    pingsg.addIngressRule(
      ec2.Peer.ipv4(vpcLatencyTestCidr),
      ec2.Port.allIcmp(),
      "allow private ips in a vpc for all icmp packet."
    );

    // TOKEN=\`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"\` \
    // && curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/placement/availability-zone

    // Make an IAM role to read/write configuration and result to DDB
    const pingtestdb = new ddb.Table(this, ddbTableName, {
      partitionKey : {
        name : "pk", 
        type : ddb.AttributeType.STRING
      },
      sortKey : {
        name : "sk",
        type : ddb.AttributeType.STRING
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST
    });

    // After to create all ec2 instances. write 'START' messages in the CloudWatchLogStream to trigger ping test.
    
    const userdata = ec2.UserData.forLinux({
      shebang: `#!/bin/bash -ex
      exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
      echo BEGIN_USERSCRIPT
      date '+%Y-%m-%d %H:%M:%S'
      curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
      unzip awscliv2.zip
      sudo ./aws/install
      aws s3 cp s3://${pingtestbucket.bucketName}/ping-test.sh ~ec2-user/
      chmod +x ~ec2-user/ping-test.sh
      ~ec2-user/ping-test.sh &
      echo END_USERSCRIPT
      `,
    });
    const amznImage = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE
    });


    // make instances each private subnet 
    const testec2list: ec2.Instance[] = [];
    const privateSubnets = vpcLatencyTest.privateSubnets;
    for (let pos = 0; pos < privateSubnets.length; pos++) {
      let privateSubnet = vpcLatencyTest.privateSubnets[pos];
      let testinst = new ec2.Instance(
        this,
        `pingtestinst-${pos}`,
        {
          instanceType: ec2.InstanceType.of(
            ec2.InstanceClass.T3,
            ec2.InstanceSize.LARGE
          ),
          machineImage: amznImage,
          vpc: vpcLatencyTest,
          userData: userdata,
          allowAllOutbound: true,
          instanceName: `pingtestinst-${privateSubnet.availabilityZone}`,
          keyName: keypairName,
          securityGroup: pingsg,
          vpcSubnets: {
            subnets: [privateSubnet],
          },
          sourceDestCheck: false,
        }
      );
      testinst.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["*"],
          resources: [pingtestdb.tableArn],
          effect: iam.Effect.ALLOW,
        })
      );
      testinst.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["*"],
          resources: [pingtestbucket.bucketArn],
          effect: iam.Effect.ALLOW,
        })
      );
      testec2list.push(testinst);
    }
  }
}
