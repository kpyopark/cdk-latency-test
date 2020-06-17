#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AzLatencyTestStack } from '../lib/az-latency-test-stack';

const app = new cdk.App();
new AzLatencyTestStack(app, "AzLatencyTestStack", {
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
