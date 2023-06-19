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
const express = require('express');
const got = require('got');
const opentelemetry = require("@opentelemetry/api");

const WEATHER_API_URL = 'https://weather.workshop.epsagon.com/weather';
const NEWS_API_URL = 'https://news.workshop.epsagon.com/news';
const FACT_API_URL = 'https://facts.workshop.epsagon.com/facts';

const tracer = opentelemetry.trace.getTracer(
    'haddas-service-tracer'
  );

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

    tracer.startActiveSpan('main', async (span) => {
        const city = req.params.city;
        const [weather, news, fact] = await Promise.all([
            getWeather(city),
            getNews(city),
            getFactForToday()
        ]);
        res.json({ weather, news, fact });      
        // Be sure to end the span!
        span.end();
    });
});

app.get('/proxy/:city', async(req, res) => {
    res.json(await got(`http://localhost:3000/digest/${req.params.city}`).json().catch((err) => null))
})

app.get('/', async(req, res) => {
    res.send('choose a city, and go to http://localhost:3000/proxy/:city to get information about it')
})

app.get('/error', async(req, res) => {
    res.status(404).send('404 Not Found :(');
})

app.use('*', (req, res) => {
    res.status(404).send('Not Found');
})
app.listen(3000, () => console.log('App is running at http://localhost:3000'));


