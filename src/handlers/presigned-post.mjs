import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getScopedS3Client } from "/opt/nodejs/helpers.mjs";
import { v5 as uuidv5 } from "uuid"

// Duration presigned url is valid for.
const TTL = 600

const UUID_NAMESPACE = '9369b034-56d8-4371-b530-15f88d7e42cb'

/**
Handler for client file upload. 

The client's bucket name and temporary credentials for access to the bucket are provided by the auth response from
the lambda authorizer and are accessible on `requestContext.authorizer.lambda.credentials`. 
*/

export const LambdaHandler = async (event) => {
  //TODO: use content-MD5 header to verify integrity of transmitted file
  const credentials = event.requestContext.authorizer.lambda.credentials;
  const bucket = event.requestContext.authorizer.lambda.bucket;
  const data = JSON.parse(event.body)
  const filename = data.file_name;
  
  // TODO: reimplement UUID
  // const key = uuidv5(filename, UUID_NAMESPACE);
  
  const client = getScopedS3Client(credentials);

  const upload_options = {
    Bucket: bucket,
    Key: filename,
    Fields: {
      "x-amz-meta-filename": filename
    },
    Expires: TTL
  }

  const resp = await createPresignedPost(client, upload_options);

  return {
    statusCode: "200",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(resp)
  }
  
}


