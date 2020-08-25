import * as cdk from '@aws-cdk/core';
import * as glue from '@aws-cdk/aws-glue';
import { Bucket } from '@aws-cdk/aws-s3';

interface GlueStackProps extends cdk.StackProps {
    myLoggingBucket: Bucket;
}

export class GlueStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: GlueStackProps) {
        super(scope, id, props);

        // const view_prefix = '/* Presto View: ';
        // const view_suffix = ' */';

        /* const presto_view_body = {
                "originalSql": "SELECT *\nFROM\n  cloudfront_logs\nWHERE ((((NOT (\"useragent\" LIKE '%Googlebot%')) AND (NOT (\"useragent\" LIKE '%bingbot%'))) AND (NOT (\"useragent\" LIKE 'Twitterbot%'))) AND (NOT (\"useragent\" LIKE '%DuckDuckBot%')))\n",
                "catalog":"awsdatacatalog",
                "schema":"my_cloudfront_access_log",
                "columns": [{"name":"date","type":"date"},{"name":"time","type":"varchar"},{"name":"location","type":"varchar"},{"name":"bytes","type":"bigint"},{"name":"requestip","type":"varchar"},{"name":"method","type":"varchar"},{"name":"host","type":"varchar"},{"name":"uri","type":"varchar"},{"name":"status","type":"integer"},{"name":"referrer","type":"varchar"},{"name":"useragent","type":"varchar"},{"name":"querystring","type":"varchar"},{"name":"cookie","type":"varchar"},{"name":"resulttype","type":"varchar"},{"name":"requestid","type":"varchar"},{"name":"hostheader","type":"varchar"},{"name":"requestprotocol","type":"varchar"},{"name":"requestbytes","type":"bigint"},{"name":"timetaken","type":"real"},{"name":"xforwardedfor","type":"varchar"},{"name":"sslprotocol","type":"varchar"},{"name":"sslcipher","type":"varchar"},{"name":"responseresulttype","type":"varchar"},{"name":"httpversion","type":"varchar"},{"name":"filestatus","type":"varchar"},{"name":"encryptedfields","type":"integer"}]
            } */

        // Base64.encode(`${view_prefix} ${presto_view_body} ${view_suffix}`)

        const glueDatabase = new glue.Database(this, 'MyGlueDatabase', {
            databaseName: 'my_cloudfront_access_log',
        });
        
        const glueTable = new glue.CfnTable(this, 'myCloudFrontAccessLogTable', {
            catalogId: glueDatabase.catalogId,
            databaseName: glueDatabase.databaseName,
            tableInput: {
                name: 'cloudfront_logs',
                description: 'stores cloudfront logs in certain formats',
                tableType: 'EXTERNAL_TABLE',
                parameters: {
                    'skip.header.line.count': '2',
                    'transient_lastDdlTime': `${Math.floor(Date.now() / 1000)}`,
                }, 
                storageDescriptor: {
                    outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
                    columns: [
                        {
                            name: 'date',
                            type: 'date'
                        },
                        {
                            name: 'time',
                            type: 'string'
                        },
                        {
                            name: 'location',
                            type: 'string'
                        },
                        {
                            name: 'bytes',
                            type: 'bigint'
                        },
                        {
                            name: 'requestip',
                            type: 'string'
                        },
                        {
                            name: 'method',
                            type: 'string'
                        },
                        {
                            name: 'host',
                            type: 'string'
                        },
                        {
                            name: 'uri',
                            type: 'string'
                        },
                        {
                            name: 'status',
                            type: 'int'
                        },
                        {
                            name: 'referrer',
                            type: 'string'
                        },
                        {
                            name: 'useragent',
                            type: 'string'
                        },
                        {
                            name: 'querystring',
                            type: 'string'
                        },
                        {
                            name: 'cookie',
                            type: 'string'
                        },
                        {
                            name: 'resulttype',
                            type: 'string'
                        },
                        {
                            name: 'requestid',
                            type: 'string'
                        },
                        {
                            name: 'hostheader',
                            type: 'string'
                        },
                        {
                            name: 'requestprotocol',
                            type: 'string'
                        },
                        {
                            name: 'requestbytes',
                            type: 'bigint'
                        },
                        {
                            name: 'timetaken',
                            type: 'float'
                        },
                        {
                            name: 'xforwardedfor',
                            type: 'string'
                        },
                        {
                            name: 'sslprotocol',
                            type: 'string'
                        },
                        {
                            name: 'sslcipher',
                            type: 'string'
                        },
                        {
                            name: 'responseresulttype',
                            type: 'string'
                        },
                        {
                            name: 'httpversion',
                            type: 'string'
                        },
                        {
                            name: 'filestatus',
                            type: 'string'
                        },
                        {
                            name: 'encryptedfields',
                            type: 'int'
                        }
                    ],
                    inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
                    location: `s3://${props?.myLoggingBucket.bucketName as string}/cloudfront/web`,
                    serdeInfo: {
                        parameters: {
                            'field.delim': '\t',
                            'serialization.format': '\t'
                        },
                        serializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe'
                    },
                    storedAsSubDirectories: false
                }
            }
        }); // end of table

        const userView = new glue.CfnTable(this, 'MyCloudFrontAccessLogUserView', {
            catalogId: glueDatabase.catalogId,
            databaseName: glueDatabase.databaseName,
            tableInput: {
                name: 'user_logs',
                description: 'filter out bots from cloudfront logs using certain formats',
                tableType: 'VIRTUAL_VIEW',
                parameters: {
                    'presto_view': true
                },
                viewExpandedText: '/* Presto View */',
                viewOriginalText: '/* Presto View: eyJvcmlnaW5hbFNxbCI6IlNFTEVDVCAqXG5GUk9NXG4gIGNsb3VkZnJvbnRfbG9nc1xuV0hFUkUgKCgoKE5PVCAoXCJ1c2VyYWdlbnRcIiBMSUtFICclR29vZ2xlYm90JScpKSBBTkQgKE5PVCAoXCJ1c2VyYWdlbnRcIiBMSUtFICclYmluZ2JvdCUnKSkpIEFORCAoTk9UIChcInVzZXJhZ2VudFwiIExJS0UgJ1R3aXR0ZXJib3QlJykpKSBBTkQgKE5PVCAoXCJ1c2VyYWdlbnRcIiBMSUtFICclRHVja0R1Y2tCb3QlJykpKVxuIiwiY2F0YWxvZyI6ImF3c2RhdGFjYXRhbG9nIiwic2NoZW1hIjoibXlfY2xvdWRmcm9udF9hY2Nlc3NfbG9nIiwiY29sdW1ucyI6W3sibmFtZSI6ImRhdGUiLCJ0eXBlIjoiZGF0ZSJ9LHsibmFtZSI6InRpbWUiLCJ0eXBlIjoidmFyY2hhciJ9LHsibmFtZSI6ImxvY2F0aW9uIiwidHlwZSI6InZhcmNoYXIifSx7Im5hbWUiOiJieXRlcyIsInR5cGUiOiJiaWdpbnQifSx7Im5hbWUiOiJyZXF1ZXN0aXAiLCJ0eXBlIjoidmFyY2hhciJ9LHsibmFtZSI6Im1ldGhvZCIsInR5cGUiOiJ2YXJjaGFyIn0seyJuYW1lIjoiaG9zdCIsInR5cGUiOiJ2YXJjaGFyIn0seyJuYW1lIjoidXJpIiwidHlwZSI6InZhcmNoYXIifSx7Im5hbWUiOiJzdGF0dXMiLCJ0eXBlIjoiaW50ZWdlciJ9LHsibmFtZSI6InJlZmVycmVyIiwidHlwZSI6InZhcmNoYXIifSx7Im5hbWUiOiJ1c2VyYWdlbnQiLCJ0eXBlIjoidmFyY2hhciJ9LHsibmFtZSI6InF1ZXJ5c3RyaW5nIiwidHlwZSI6InZhcmNoYXIifSx7Im5hbWUiOiJjb29raWUiLCJ0eXBlIjoidmFyY2hhciJ9LHsibmFtZSI6InJlc3VsdHR5cGUiLCJ0eXBlIjoidmFyY2hhciJ9LHsibmFtZSI6InJlcXVlc3RpZCIsInR5cGUiOiJ2YXJjaGFyIn0seyJuYW1lIjoiaG9zdGhlYWRlciIsInR5cGUiOiJ2YXJjaGFyIn0seyJuYW1lIjoicmVxdWVzdHByb3RvY29sIiwidHlwZSI6InZhcmNoYXIifSx7Im5hbWUiOiJyZXF1ZXN0Ynl0ZXMiLCJ0eXBlIjoiYmlnaW50In0seyJuYW1lIjoidGltZXRha2VuIiwidHlwZSI6InJlYWwifSx7Im5hbWUiOiJ4Zm9yd2FyZGVkZm9yIiwidHlwZSI6InZhcmNoYXIifSx7Im5hbWUiOiJzc2xwcm90b2NvbCIsInR5cGUiOiJ2YXJjaGFyIn0seyJuYW1lIjoic3NsY2lwaGVyIiwidHlwZSI6InZhcmNoYXIifSx7Im5hbWUiOiJyZXNwb25zZXJlc3VsdHR5cGUiLCJ0eXBlIjoidmFyY2hhciJ9LHsibmFtZSI6Imh0dHB2ZXJzaW9uIiwidHlwZSI6InZhcmNoYXIifSx7Im5hbWUiOiJmaWxlc3RhdHVzIiwidHlwZSI6InZhcmNoYXIifSx7Im5hbWUiOiJlbmNyeXB0ZWRmaWVsZHMiLCJ0eXBlIjoiaW50ZWdlciJ9XX0= */',
                storageDescriptor: {
                    columns: [
                        {
                            name: 'date',
                            type: 'date'
                        },
                        {
                            name: 'time',
                            type: 'string'
                        },
                        {
                            name: 'location',
                            type: 'string'
                        },
                        {
                            name: 'bytes',
                            type: 'bigint'
                        },
                        {
                            name: 'requestip',
                            type: 'string'
                        },
                        {
                            name: 'method',
                            type: 'string'
                        },
                        {
                            name: 'host',
                            type: 'string'
                        },
                        {
                            name: 'uri',
                            type: 'string'
                        },
                        {
                            name: 'status',
                            type: 'int'
                        },
                        {
                            name: 'referrer',
                            type: 'string'
                        },
                        {
                            name: 'useragent',
                            type: 'string'
                        },
                        {
                            name: 'querystring',
                            type: 'string'
                        },
                        {
                            name: 'cookie',
                            type: 'string'
                        },
                        {
                            name: 'resulttype',
                            type: 'string'
                        },
                        {
                            name: 'requestid',
                            type: 'string'
                        },
                        {
                            name: 'hostheader',
                            type: 'string'
                        },
                        {
                            name: 'requestprotocol',
                            type: 'string'
                        },
                        {
                            name: 'requestbytes',
                            type: 'bigint'
                        },
                        {
                            name: 'timetaken',
                            type: 'float'
                        },
                        {
                            name: 'xforwardedfor',
                            type: 'string'
                        },
                        {
                            name: 'sslprotocol',
                            type: 'string'
                        },
                        {
                            name: 'sslcipher',
                            type: 'string'
                        },
                        {
                            name: 'responseresulttype',
                            type: 'string'
                        },
                        {
                            name: 'httpversion',
                            type: 'string'
                        },
                        {
                            name: 'filestatus',
                            type: 'string'
                        },
                        {
                            name: 'encryptedfields',
                            type: 'int'
                        }
                    ],
                    location: `s3://${props?.myLoggingBucket.bucketName as string}/cloudfront/web`,
                    serdeInfo: {},
                    storedAsSubDirectories: false
                }
            }
        });
    }
}