import {
  GetObjectAttributesCommand,
  GetObjectCommand,
  NoSuchKey,
  NoSuchBucket
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getScopedS3Client } from "/opt/nodejs/helpers.mjs";

// Duration presigned url is valid for.
const TTL = 300;

/**
Handler for client file download. 

The client's bucket name and temporary credentials for access to the bucket are provided by the auth response from
the lambda authorizer and are accessible on `requestContext.authorizer.lambda.credentials`. The file name
should be passed as a path parameter, e.g. files/{url-encoded-file-name-here}.

The getSignedUrl function does not throw an error when attempting to generate a URL for a non-existant object.
For this reason, it is necessary to first check if an object exists with `GetObjectAttributesCommand`.

*/
export const LambdaHandler = async (event) => {
  const credentials = event.requestContext.authorizer.lambda.credentials;
  const bucket = event.requestContext.authorizer.lambda.bucket;
  const key = event.pathParameters.file_name;

  const client = getScopedS3Client(credentials);

  // check if object exists before generating presigned url. 
  const getObjAttrCommand = new GetObjectAttributesCommand({Bucket: bucket, Key: key, ObjectAttributes:["ObjectSize"]}) 
  try {
    await client.send(getObjAttrCommand);
  } catch (err) {
    if (err instanceof NoSuchKey) {
    // TODO: handle case where object/file does not exist.
      console.log(`Object ${key} not found!`);
      return
    } else if (err instanceof NoSuchBucket) {
      //TODO: handle case where client bucket not found.
      console.log(`Bucket ${bucket} not found!`);
    } else {
      // Catch-all for any other errors
      console.log(err);
      return
    } 
  }

  const getObjCommand = new GetObjectCommand({Bucket: bucket, Key: key});
  const url = await getSignedUrl(client, getObjCommand, {expiresIn: TTL});
  
  return {
    statusCode: 200,
    body: url,
    headers: {
      "content-type": "application/json"
    }
  }
}


  
