# client-portal-backend

This project contains source code and supporting files for a serverless application that you can deploy with the AWS Serverless Application Model (AWS SAM) command line interface (CLI). It includes the following files and folders:

- `src/handlers` - Code for the application's Lambda function.
- `events` - Invocation events that you can use to invoke the function (to be created).
- `__tests__` - Unit tests for the application code (to be added). 
- `template.yaml` - A template that defines the application's AWS resources.

The application uses several AWS resources, including Lambda functions, an API Gateway API. These resources are defined in the `template.yaml` file in this project. You can update the template to add AWS resources through the same deployment process that updates your application code.

## Installing

Clone the repository. 

**SSO authorisation**
aws sso login --profile [Your profile name]

**Build and Deploy**

Pre-build: node C:/Projects/metric-data-sam/metric-api/compile_templates.mjs
Build: sam build
Run locally for testing: sam local start-api --static-dir ../../static
Deploy: sam deploy --guided

To use handlebars templates in a lambda function:
```
import { file_list } from "templates/templates.cjs"`;
import runtime from "handlebars/runtime.js;
let html = runtime.template(file_list)

// To pass variables to the template and return it as a response:

const response = {
        statusCode: 200,
        body: html({files: data.Contents, client: "test-client"}), 
        headers: {
          "content-type": "text/html"
        }
    };
return response
```

After the initial build, it may be faster to rebuild only those elements which have changed (e.g. the templates if adding new templates, see below). To do this, run `sam build TemplatesLayer`.

## Testing

Lambda functions can be individual invoked and tested using `sam local invoke HandlerFunctionName -e events/{event.json}`, where `event.json` contains a JSON document matching a valid lambda event. 
The sam tool can be used to quickly generate the scaffolding for such an event using `sam local generate-event apigateway http-api-proxy`. This event can be saved to file and modified as required.

The api-gateway can also be run locally in a docker container mimicking the AWS environment. To do so, run `sam local start-api --profile my_aws_sso_profile`.

Supply the `--static-dir` argument to `sam local start-api` to specify the location of any static files (e.g. images, css, etc.).

If you receive any errors about invalid tokens, ensure you have run `aws sso login --profile my_aws_sso_profile`.

`sam local start-api --static-dir ../../static --profile my_aws_sso_profile`


## Adding new templates

Templates should be added to the `templates` folder in the project root. In addition to passing data at runtime, it is also possible to pass data to handlebars templates at compile time using the `--data` flag.
The data flag expects a json object with values to be substituted in the template.

This is useful when the value of some variables is known at build time, e.g. the href value for the `base` element.

