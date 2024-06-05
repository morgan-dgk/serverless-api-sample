import { jwtVerify } from "jose"
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

const stsClient = new STSClient();

function getApiPolicyDocument(api_id) {
  const policy = {
      "Version": "2012-10-17",
      "Statement": [
        {  
          "Action": "execute-api:Invoke",
          "Effect": "Allow",
          "Resource": `arn:aws:execute-api:${process.env.REGION}:${process.env.AWS_ACCOUNT_ID}:${api_id}/*`
        }
      ]
    }
  return policy
}

/**
Returns a policy document with scoped access based on the client_uuid
passed in JWT to lambda authorizer. 

@param {string} client_uuid - the unique identifier for the client the user belongs to. 
*/
function getPolicyForTenantUser(client_uuid) {
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "s3:PutObject",
          "s3:GetObject",
          "s3:GetObjectAttributes"
        ],
        Resource: [
          `arn:aws:s3:::${client_uuid}/*`        
        ]
      },
      {
        Effect: "Allow",
        Action: [
          "s3:ListBucket",
        ],
        Resource: [
          `arn:aws:s3:::${client_uuid}`        
        ]
    } 
  ]}

  return JSON.stringify(policy);
}

/**
Retrieves temporary access credentials from Amazon's Secure Token Service (sts).
These credentials provided scoped access to the client's S3 bucket only; access is limited
by the policy document returned by `getPolicyForTenantUser`.

@param {string} client_uuid - the unique identifier for the client the user belongs to.
@param {string} sub - the subject / userid as provided in the JWT. This value is provided by the cognito user pool.
@returns {object} Credentials - contains the temporary credentials retrieved from sts.
*/
async function assumeUserRole(client_uuid, sub) {
  const iam_policy = getPolicyForTenantUser(client_uuid, sub);
  const command = new AssumeRoleCommand({
    RoleArn:process.env.ROLEARN,
    RoleSessionName:`${client_uuid}-${sub}`,
    Policy:iam_policy
  });
  const resp = await stsClient.send(command);

  return resp.Credentials

}

/**
  Extracts JWT from Authorization header of incoming requests. Note that the lambda authorizer
  will reject any incoming requests missing the Authorization header with a 401 error. 
  
  @param {object} event - an AWS lambda event, see https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-concepts.html#gettingstarted-concepts-event
*/
function parseTokenData(event) {
  let default_response = {valid: false}

  const auth_data = event.headers?.Authorization || event.headers?.authorization;
  
  if (!auth_data) {
    return default_response;
  }

  const auth_header_list = auth_data.split(' ');

  if (auth_header_list.length != 2 || auth_header_list[0] != 'Bearer') {
    return default_response;  
  }

  const access_token = auth_header_list[1]

  return {
    'valid': true,
    'token': access_token
  }
}

/**
Verifies the signature and audience of JWT and returns the decoded claims. Does most of the work of validating user authorization.
If either of these values are incorrect, this function will throw an error. 

@param {string} token - a JWT
*/
async function getClaims(token) {
    const { payload } = await jwtVerify(
      token, 
      Buffer.from(process.env.COGNITO_CLIENT_SECRET, 'base64'), 
      { 
        audience: process.env.COGNITO_APP_CLIENT_ID, 
        algorithms: ["HS256"]
      }
  );
    return payload
}

/** 
Main lambda authorizer function. 

@param {object} event - an AWS lambda event, see https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-concepts.html#gettingstarted-concepts-event
@returns {object} auth_response - auth'z response in the required output format, see https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html
*/
export async function authorize(event) {
  // TODO: include user email from session / id token?
  const token_data = parseTokenData(event);

  if (!token_data.valid) {
    console.log('token data invalid!');
    // TODO: handle case where token data is invalid
    return 
  }
  try {
    const claims = await getClaims(token_data.token);
    const { client_uuid, sub } = claims;

    const temp_credentials = await assumeUserRole(client_uuid, sub);
    const api_policy_doc = getApiPolicyDocument(event.requestContext.apiId);
    
    const auth_response = {
      "principalId": sub,
      "policyDocument": api_policy_doc,
      "context": {
        "credentials": {
          "secretAccessKey": temp_credentials.SecretAccessKey,
          "sessionToken": temp_credentials.SessionToken,
          "accessKeyId": temp_credentials.AccessKeyId
        },
        "client_uuid": client_uuid,
        "bucket": `${client_uuid}-metricdata`
      }
    }
    return auth_response;

  } catch (error) {
    // TODO: properly handle errors getting claims
    console.log(error);
    return error
  }
}

