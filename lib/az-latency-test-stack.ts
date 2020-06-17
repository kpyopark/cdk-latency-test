import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import logs = require('@aws-cdk/aws-logs');
import iam = require('@aws-cdk/aws-iam');
import { RetentionDays } from '@aws-cdk/aws-logs';

export class AzLatencyTestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);



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

    // Make an IAM role to write logs to cloudwatch logs. 
    const testloggroup = new logs.LogGroup(this, 
      'LatencyTestGroup', {
        retention: RetentionDays.ONE_DAY
      });
    const teststream = new logs.LogStream(this, 
      'LatencyTestGroupStream', {
        
      });

    const ec2servicerole = new iam.Role(this, "testlogstreamwriterrole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
    });

    ec2servicerole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ListTagsLogGroup",
          "PutLogEvents",
          "GetLogEvents",
          "GetLogRecord",
        ],
        resources: [teststream.logGroupArn],
        effect: iam.Effect.ALLOW,
      })
    );

    // After to create all ec2 instances. write 'START' messages in the CloudWatchLogStream to trigger ping test.
    
    const userdata = ec2.UserData.forLinux({
      shebang: `#!/bin/bash -ex
      exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
      echo BEGIN_USERSCRIPT
      date '+%Y-%m-%d %H:%M:%S'
      curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
      unzip awscliv2.zip
      sudo ./aws/install
      TOKEN=\`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"\`
      az_loc=\`curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/placement/availability-zone\`
      local_ip4=\`curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/local-ipv4\`
      alias ms='echo $((\`date +%s\` * 1000))'
      aws logs put-log-events --log-group-name '${testloggroup.logGroupName}' --log-stream-name '${teststream.log}'
      echo END_USERSCRIPT
      `,
    });

    // make instances each private subnet 
    vpcLatencyTest.privateSubnets.forEach(privateSubnet => {
      const testInstance = new ec2.Instance()
    });

  }
}
