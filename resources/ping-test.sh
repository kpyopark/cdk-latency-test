#!/bin/sh
target_ddb_table=$1
target_ips=""
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
az_loc=`curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/placement/availability-zone`
local_ipv4=`curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/local-ipv4`

status=''

function retrieveStatus() {
  status=`aws dynamodb get-item --table-name '${target_ddb_table}' --key '{ "pk" : { "S": "CONTROL" } , "sk" : {"S" : "STATUS_KEY" } }' | jq '.Item.value.S'`
}

function retrieveStatus() {

}

function putLocalIp() {
  aws dynamodb put-time --tablename '${target_ddb_table}' --item '{ "pk": {"S" : "IP" }, "sk" : { "S" : "${local_ipv4}"}'
}

while(true) 
do
  retrieveStatus()
  case "${status}" in
  START)
    
  ;;
  STOP)
  ;;
  TERMINATE)
  ;;
  *)
  echo "There is no matched status in DDB table (${target_ddb_table})"
  exit 1
  esac
done

echo "all process is done."


}

