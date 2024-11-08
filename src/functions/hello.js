const { app } = require('@azure/functions');
const df = require('durable-functions');

const activityName = 'hello';

df.app.orchestration('helloOrchestrator', function* (context) {
    const outputs = [];
    //pushing elements to the outputs like an array
    outputs.push(yield context.df.callActivity(activityName, 'Tokyo'));
    outputs.push(yield context.df.callActivity(activityName, 'Seattle'));
    outputs.push(yield context.df.callActivity(activityName, 'Cairo'));

    // Wait for the external event named "GoAhead"
    const updatedByExternalApp = yield context.df.waitForExternalEvent('GoAhead');

    // You can now use the value of updatedByExternalApp in your workflow
    if (updatedByExternalApp) {
        outputs.push('External event received: GoAhead');
      
    } else {
        outputs.push('External event received: Do not proceed');
    }
    return outputs;
});



df.app.activity(activityName, {
    handler: (input) => {
        return `Hello, ${input}`;
    },
});

app.http('helloHttpStart', {
    route: 'orchestrators/{orchestratorName}',
    extraInputs: [df.input.durableClient()],
    handler: async (request, context) => {
        const client = df.getClient(context);
        const body = await request.text();
        const instanceId = await client.startNew(request.params.orchestratorName, { input: body });

        context.log(`Started orchestration with ID = '${instanceId}'.`);

        return client.createCheckStatusResponse(request, instanceId);
    },
});