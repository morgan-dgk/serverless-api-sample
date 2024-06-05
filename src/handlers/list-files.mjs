import {
  ListObjectsV2Command,
} from "@aws-sdk/client-s3"

import { getScopedS3Client } from "/opt/nodejs/helpers.mjs"

export const LambdaHandler = async (event) => {
  const credentials = event.requestContext.authorizer.lambda.credentials;
  const bucket = event.requestContext.authorizer.lambda.bucket

  const client = getScopedS3Client(credentials);
  
  try {
    const command = new ListObjectsV2Command({Bucket: bucket})
    const data = await client.send(command);
    
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
      "content-type": "application/json"
      }
    }
  //TODO: Handle errors gracefully
  } catch (err) {
    console.log(err);
    return {statusCode: 404}
  }
}


