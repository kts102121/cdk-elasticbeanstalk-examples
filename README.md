# Welcome to your CDK TypeScript project!

This project harnesses CDK technology (v1.60) for basic VPC, RDS, Elastic Beanstalk, CloudFront with Lambda@Edge stack creation.

To run this, please rename `example.env` to `.env` and change the values

## Stacks
As you can see in `lib/app.ts`, some stacks depend on one or more stacks. 
Elastic Beanstalk Java SE listens to port 5000, not 8080. Please bear this in mind. 

### VPC
Simple AWS VPC Stack. You might want to change maxAzs and so on for your needs. (Will put this in env file too in the near future)

### RDS
Aurora RDS Database cluster. If you wish to use `serverless` option, please refer [aws-rds module](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-rds-readme.html). Addtionally, should you wish to change the default database name, please change in the java project and `rds-stack.ts` (it is set as `test`)

### Elastic Beanstalk
Standard Java SE 11 environment. You need to build your own project and submit jar file OR use the one in `demo/target`. Should you wish to run this in your local environment, you need your own mysql database running. 

### CloudFront
Cloudfront creates two origins: `s3` for static web hosting and `elb` from elastic beanstalk. The stack deploys static files from `website` folder. Please change the url to the cloudfront elb origin

### Glue and Athena
CloudFront pushes access logs to s3. Glue and Athena helps the user to pull out useful insights from it without provisioning additional infrastructure

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## How to use this?

 * `npm run build && cdk synth && cdk deploy "*"` does magic.
 * `cdk destroy "*"` destroys them. 

 Should you wish to select which stacks to deploy, please use `cdk deploy VpcStack RdsStack ElasticBeanstalkStack` and so on.

## TODOs

 * Improve overall code quality
 * Find better ways to manage environment variables in both code and cdk projects


## Kudos
[Spring-Jpa Best Practices](https://github.com/cheese10yun/spring-jpa-best-practices) for general Spring Best Practices

[Complete AWS Elastic Beanstalk Application through CDK (TypeScript)](https://medium.com/@joshmustill/complete-node-js-aws-elastic-beanstalk-application-packaging-through-cdk-in-typescript-e91b7ffe4928) for overall elastic beanstalk CDK

[AWS CDK Part 3: How to create an RDS instance](https://blog.codecentric.de/en/2019/11/aws-cdk-part-3-how-to-create-an-rds-instance/) for creating Aurora RDS instance using CDK

[Multiple Cloudfront Origins with Behavior Path Redirection](https://stackoverflow.com/questions/31567994/multiple-cloudfront-origins-with-behavior-path-redirection) for awssome CloudFront + Lambda@Edge 

[Implementing Default Directory Indexes in Amazon S3-backed Amazon CloudFront Origins Using Lambda@Edge](https://aws.amazon.com/blogs/compute/implementing-default-directory-indexes-in-amazon-s3-backed-amazon-cloudfront-origins-using-lambdaedge/) for S3 Subdirectory Root Object with CloudFront issue
 * [Default files in S3 subdirectories using CloudFront and Lambda@Edge](https://medium.com/@chrispointon/default-files-in-s3-subdirectories-using-cloudfront-and-lambda-edge-941100a3c629) -> The previous one needs to have ending 'slash'. This takes care of it with querystrings.

### For Awesome Spring Security form based login tutorials
 * [[Spring Security] Database Authentication - Spring Boot (6)](https://velog.io/@minholee_93/Spring-Security-Database-Authentication-Spring-Boot-6)
 * [Kotlin + Spring boot security + thymeleaf 로그인 구현(3)](https://bob-full.tistory.com/9)