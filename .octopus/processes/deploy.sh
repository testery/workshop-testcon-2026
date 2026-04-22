set -e

curl -o /usr/local/bin/ecs-deploy https://raw.githubusercontent.com/sil-org/ecs-deploy/master/ecs-deploy
chmod +x /usr/local/bin/ecs-deploy

export AWS_DEFAULT_OUTPUT='json'
export AWS_REGION='us-east-1'

ENVIRONMENT_NAME=$(get_octopusvariable "Octopus.Environment.Name")
ENVIRONMENT_NAME="${ENVIRONMENT_NAME,,}"
BUILD_NUMBER=$(get_octopusvariable "Octopus.Release.Number")
ECR_REGISTRY=$(get_octopusvariable "Project.AWS.ECRRegistry")
DEV_CLUSTER=$(get_octopusvariable "Project.AWS.DevCluster")
PROD_CLUSTER=$(get_octopusvariable "Project.AWS.ProdCluster")
CLUSTER=$( [ "$ENVIRONMENT_NAME" == "production" ] && echo "$PROD_CLUSTER" || echo "$DEV_CLUSTER" )

ecs-deploy -t 500 -c "$CLUSTER" -n example-webapp-api -i "$ECR_REGISTRY/example-webapp-api:$BUILD_NUMBER"
ecs-deploy -t 500 -c "$CLUSTER" -n example-webapp-web -i "$ECR_REGISTRY/example-webapp-web:$BUILD_NUMBER"
