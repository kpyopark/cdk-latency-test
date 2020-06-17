# This test suite for checking the cross az latency in one AWS Region

 Some guys wanted for me to check network latency between cross AZs in one region. 
 I couldn't deliver the latency result directly to them, so I made this project to meet their needs. 
 

# Prerequsite

This project uses 'CDK' & 'TypeScript' language. So you should prepare prerequiste requirements as followings.

1. Install aws cli (https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
2. Install Node version manager (https://github.com/nvm-sh/nvm#installing-and-updating)
3. Install Node & NPM (https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
4. Install typescript (TypeScript >= 2.7) (https://www.typescriptlang.org/v2/download)
5. Install cdk cli (https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
6. Install Git
7. Install secret Key & access Key to use CDK/AWS cl.

# How to install

1. Clone this project
2. Before to deploy. you should choose 3 parameters. 
   - bucketname : This CDK project will make one bucket used as deployment content repository. 
   - keypairname : EC2 keypair used in a test instances
   - ddbname : This CDK project will make one dynamodb table. This table can control the test operation. (STOP/START) and also stores the test results. 
3. Use 'cdk deploy' command. 
   ex : cdk deploy -c bucketname=pingtestsomething -c keypairname=example.pem -c ddbname=pingtestddb

4. After deployment, you can see one dynamodb table name of which includes 'AzLatencyTestStack...' keyword.
5. Open it in the ddb console, in "Items" tab, you can see the current status record and all private IPs used in each test instance.

pk               | sk              | value           | result
-------------------------------------------------------------------------- 
CONTROL          | STATUS_KEY      | STOP            | 
IP               | 172.24.0.176    |ap-northeast-2c  |
IP               | 172.24.0.5      |ap-northeast-2a  |
IP               | 172.24.0.81     |ap-northeast-2b  |

6. You can start testing to modify value to 'START' in the first 'CONTROL' record.
pk               | sk              | value           | result
-------------------------------------------------------------------------- 
CONTROL          | STATUS_KEY      | START           | 

7. After some times, you could see the result test such like belows. 
pk               | sk              | value                  | result
-------------------------------------------------------------------------- 
CONTROL          | STATUS_KEY      | START                  | 
SRC172.24.0.176  | TGT172.24.0.5   |                        | 0.911/0.940/0.983/0.035

 One result record contains min/average/max/deviation value. 

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth -c bucketname='bucket used pingtest script store.' -c keypairname='ec2 instance keypair name' -c ddbname='ddb tablename used as pingtest result store'`  
