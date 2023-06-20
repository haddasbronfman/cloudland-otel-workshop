/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { SimpleSpanProcessor} = require('@opentelemetry/sdk-trace-base');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");
// const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');



diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// 1. create tracer provider.
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'Haddas-application'
  })
});

// 2. create exporter
const exporter = new OTLPTraceExporter({
    // url: 'http://52.201.225.118:4317' //grpc
    url: 'http://127.0.0.1:4317' //grpc
});
// Other options: url: "http://localhost:4318/v1/traces" for http, JaegerExporter(), ZipkinExporter(), ConsoleSpanExporter()

// 3. create processor. give it our exporter:
const processor = new SimpleSpanProcessor(exporter);
// Other options: BatchSpanProcessor()

// 4. export spans to opentelemetry collector
provider.addSpanProcessor(processor);

// 5. choose what we want to instrument
registerInstrumentations({
    tracerProvider: provider, // optional, only if global TracerProvider shouldn't be used
    instrumentations: [
        // getNodeAutoInstrumentations(),
        new HttpInstrumentation()
        // Other option is to give a list of instrumentations:
        //new HttpInstrumentation(), new MongoDBInstrumentation()
    ],
});

// 6. register the provider
provider.register();
