import { S3Client } from "@aws-sdk/client-s3"

/**
Creates an S3 client based on the previously retrieved
scoped temporary access credentials. 

@param temp_access_credentials {Object} - a set of temporary access credentials retrieved from AWS sts. 
@param {string} temp_access_credentials.accessKeyId
@param {string} temp_access_credentials.secretAccessKey
@param {string} temp_access_credentials.sessionToken
*/

export function getScopedS3Client(temp_access_credentials) {

  return new S3Client({
    region: "us-west-2",
    credentials: temp_access_credentials
  }) 
}






