'use strict'

export const handler = async (event, context) => {
    console.debug(event)
    if (event.protocolData?.mqtt) {
        let username = event.protocolData.mqtt.username;
        const password = Buffer.from(event.protocolData.mqtt.password, 'base64').toString()
        console.debug(`Got [${username}] and [${password}]`)
        let match = username.match(/^(.*)\?(.*)$/)
        let query = undefined
        if (match) {
            username = match[1];
            query = match[2];
        }
        if (username === process.env['USERNAME'] && password === process.env['PASSWORD']) {
            return buildPolicy(username, true)
        }
    } 
    if (event.token !== undefined && event.token == process.env['TOKEN']) {
        return buildPolicy('username', true)
    }
    console.error('Invalid or missing username/password')
    return buildPolicy(null, false);
}

const buildPolicy = (username, authenticated) => {
    console.debug(username, authenticated)
    if (authenticated) {
        return {
            context: {},
            isAuthenticated: true,
            principalId: `${username.replace(/[^a-zA-Z0-9]/gi, '')}`, // Make sure the principalId is valid
            disconnectAfterInSeconds: 300,
            refreshAfterInSeconds: 300,
            policyDocuments: [
                {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            "Action": "iot:Connect",
                            "Effect": "Allow",
                            "Resource": [
                                '*'
                            ]
                        },
                        {
                            "Action": "iot:Subscribe",
                            "Effect": "Allow",
                            "Resource": [
                                `arn:aws-cn:iot:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT}:topicfilter/d/${username}`,
                                `arn:aws-cn:iot:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT}:topicfilter/$aws/things/${username}/shadow/get/accepted`
                            ]
                        },
                        {
                            "Action": ["iot:Receive", "iot:Publish"], // Publish permission of d/<id> only for testing
                            "Effect": "Allow",
                            "Resource": [
                                `arn:aws-cn:iot:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT}:topic/d/${username}`,
                                `arn:aws-cn:iot:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT}:topic/$aws/things/${username}/shadow/get`,
                                `arn:aws-cn:iot:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT}:topic/$aws/things/${username}/shadow/get/accepted`
                            ]
                        }
                    ]
                }
            ]
        }
    } else {
        return {
            isAuthenticated: false,
            principalId: "custom",
            disconnectAfterInSeconds: 0,
            refreshAfterInSeconds: 0,
            context: {},
            policyDocuments: []
        }
    }
}
