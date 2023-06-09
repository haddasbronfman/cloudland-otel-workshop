# cloudland2023-otel-workshop

A tutorial for how to Monitor and Troubleshoot Applications in Production using OpenTelemetry

## Table of Contents

- [cloudland2023-otel-workshop](#cloudland2023-otel-workshop)
  - [Table of Contents](#table-of-contents)
  - [Step 1 - Build express app](#step-1---build-express-app)
  - [Step 2 - Create a tracer](#step-2---create-a-tracer)
  - [Step 3 - use tracer.js in the app](#step-3---use-tracerjs-in-the-app)
  - [Step 4 - Do you have docker installed? lets work localy](#step-4---do-you-have-docker-installed-lets-work-localy)

## Step 1 - Build express app

1. Create a new folder named otelWorkshop and `cd` into it.
2. Run `npm init` to create a new package.json.
3. Create new folder otelWorkshop/src and copy app.js to there. app.js is an express server:

    ```javascript
   //app.js
    const express = require('express');
    const got = require('got');

    const WEATHER_API_URL = 'https://weather.workshop.epsagon.com/weather';
    const NEWS_API_URL = 'https://news.workshop.epsagon.com/news';
    const FACT_API_URL = 'https://facts.workshop.epsagon.com/facts';

    function getWeather(city = '') {
    const URL = `${WEATHER_API_URL}/${city}`
        return got(URL).json().catch((err) => null); // json
    }
    function getNews(city = '') {
        const URL = `${NEWS_API_URL}/${city}`
        return got(URL).json().catch((err) => null); // json
    }
    function getFactForToday() {
        const d = new Date();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const URL = `${FACT_API_URL}/${month}/${day}`;
    return got(URL).text().catch((err) => null); // string
    }

    const app = express();
    app.get('/digest/:city', async (req, res) => {
        const city = req.params.city;
        const [weather, news, fact] = await Promise.all([
                getWeather(city),
                getNews(city),
                getFactForToday()
            ]);
        res.json({ weather, news, fact });
    });

    app.get('/proxy/:city', async(req, res) => {
        res.json(await got(`http://localhost:3000/digest/${req.params.city}`).json().catch((err) => null))
    })

    app.get('/', async(req, res) => {
        res.send('choose a city, and go to http://localhost:3000/proxy/:city to get information about it')
    })

    app.use('*', (req, res) => {
        res.status(404).send('Not Found');
    })
    app.listen(3000, () => console.log('App is running at http://localhost:3000'));```

4. run `npm install express got`
5. from the folder path run `npm install`. verfy that node_modules and package-lock.json were generated.
6. Run the app! `node src/app.js`
7. you should see the log `App is running at http://localhost:3000`
8. in you browser, go to <http://localhost:3000> and make sure you get a response.

## Step 2 - Create a tracer

In this step we will create a file called tracer.js. this file is using open telemetry API in order to get traces about the actions our app does. We will build it step by step.

1. Create a new file `otelWorkshop/src/tracer.js`
2. Add to the file the following code snippets one after the other:

   The requested imports:

    ```javascript
        cosnt { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
        const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
        const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");
        const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
        const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
        const { registerInstrumentations } = require('@opentelemetry/instrumentation');
        const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
        const { SimpleSpanProcessor} = require('@opentelemetry/sdk-trace-base');
        const { Resource } = require('@opentelemetry/resources');
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
    ```

   Create a tracer provider: the NodeTracerProvider object is responsible for creating and managing instance of the tracer - the component that manages the traces:

    ```javascript
    const provider = new NodeTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: '<enter you app name>'
    })
    });
    ```

    Create exporter: We will use OTLPTraceExporter, which sends the data to the collector in grpc protocol. The collector we use is openTelemetry Collector, which already runs on this aws machine: [http://52.102.225.118](http://52.102.225.118) on port 4317.

    ```javascript
    const exporter = new OTLPTraceExporter({
        url: 'http://52.201.225.118:4317' //grpc
    });
    ```

    Create a processor: give it our exporter so it will know where to send the traces after processing.

    ```javascript
    const processor = new SimpleSpanProcessor(exporter);
    ```

    Let the tracer provider know about the processor.

    ```javascript
    provider.addSpanProcessor(processor);
    ```

    Choose what we want to instrument. traces of WHAT we want to see?

    ```javascript
    registerInstrumentations({
        tracerProvider: provider,
        instrumentations: [
            // two options here: one is to use getNodeAutoInstrumentations(),
            // which insludes all the instrumentation OTel currently has.
            // another option is using specific instrumentation objects with separated comma between them:
            new HttpInstrumentation()
        ],
    });
    ```

    Register the provider.

    ```javascript
    provider.register();
    ```

Note what we did: we used OTel API, created a procesor, chose a collector, and an exporter.
Now traces will be produces by OTel for each http request our application will get. Thos traces will be sent to the collector we defined using the exporter we defined.

## Step 3 - use tracer.js in the app

Now we want that app.js will use our tracer.js

1. Go to app.js and add this as the first line:

    ```javascript
    require('./tracer.js');
    ```

    (Bonus: what happens if you add it as the last import?)

2. Install all the new libraries needed for tracer.js:

    ```bash
    npm install \
    @opentelemetry/auto-instrumentations-node \
    @opentelemetry/semantic-conventions \
    @opentelemetry/exporter-trace-otlp-grpc \
    @opentelemetry/api \
    @opentelemetry/instrumentation-http \
    @opentelemetry/instrumentation \
    @opentelemetry/sdk-trace-node \
    @opentelemetry/sdk-trace-base \
    @opentelemetry/resources
    ```

3. Run `node src/app.js`
4. Choose a city and go to `http://localhost:3000/proxy/:city`.
5. Verify you get an answer from the express server.
6. Now we want to see the traces that were produces because of this action!
7. Go to `http://52.201.225.118:16686/` - this is the port jaeger is listening to on our AWS machine.
   you should see Jaeger UI. Jaeger is the backend we used that stores & presents the traces.
   To see your traces choose you application name under 'Services' and press 'Find Traces'.

![Jaeger](~/Downloads/CloudLand2023/Jaeger.jpg)

## Step 4 - Do you have docker installed? lets work localy

Until now we used an already prepared collector I created for you, running on an AWS machine.
Jaeger is also running on this machine.
Now lets see how to run both the collector and Jaeger locally on your machine: you will need docker for that:

1. copy this file to otelOwrkshop/src/otel-config.yaml. This is a configuration file for open telemetry collector.

    ```yaml
    //otel-config.yaml
    receivers: # specifies how data gets into the Collector
      otlp:
        protocols:
          grpc:
          http:
    processors: # processors are run on data between being received and being exported
      batch: # we want to use batch span processor, which waits for a batch of spans before it exportes them
    exporters: # where to export the traces
      jaeger: # 1. to jaeger
        endpoint: 0.0.0.0:14250
        tls:
          insecure: true
      logging: # 2. to the logging
        loglevel: debug
    service: # configure what components are enabled in the Collector
      pipelines: # A pipeline = a set of receivers + processors + exporters
        traces: # here we define a traces pipline (you can also define metrics or logs ipelines)
          receivers: [otlp]
          processors: [batch]
          exporters: [logging, jaeger]
    ```

2. Run opentelemetry collector with the configuration file you created. pay attention to change the path of the file:

   ```bash
   docker run --rm --network=host -p 13133:13133 \
      -p 55678-55679:55678-55679 -p 4317:4317 -p 4318:4318 -p 8888:8888 -p 9411:9411 \
      -v /path/otelWorkshop/src/otel-config.yaml:/otel-config.yaml \
      --name otelcol otel/opentelemetry-collector-contrib \
      --config otel-config.yaml;
    ```

3. Run jaeger locally:
   docker run --rm -d --network=host --name jaeger  -p 6831:6831/udp   -p 6832:6832/udp   -p 5778:5778   -p 16686:16686   -p 14250:14250   -p 14268:14268   -p 14269:14269   jaegertracing/all-in-one:latest

4. Now repeat the steps we did before: run the app `node src/app.js`
5. Choose a city and go to `http://localhost:3000/proxy/:city`.
6. Verify you get an answer from the express server.
7. Go to Jaeger at `http://52.201.225.118:16686/`


consider add db on the machine and access it. (redis maybe)
