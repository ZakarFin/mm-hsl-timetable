# Module for [MagicMirror](https://magicmirror.builders/): Timetable for HSL data (Finland)

The `mm-hsl-timetable` module fetches bus timetable data from HSL (Helsinki region, Finland) and shows the timetables for configured stops.

You will need to check the "solmutunnus" from https://www.avoindata.fi/data/fi/dataset/hsl-n-joukkoliikenteen-pysakit and add the number of the bus stop you want to show in the config stops-array. Or query the gtfsId from https://digitransit.fi/en/developers/apis/1-routing-api/stops/#query-stops-by-name-or-number.

Note! You will need to register at https://portal-api.digitransit.fi to get an APIkey to use this.

## Screenshot

- HSL Timetable screenshot

![HSL Timetable screenshot](screenshot.png)

## Using the module

1) Clone this repository under `MagicMirror/modules` folder
2) Add to the modules array in the `MagicMirror/config/config.js` file:
````javascript
modules: [{
  module: "mm-hsl-timetable",
  position: "top_right",
  header: "Bus schedule",
  config: {
    stops: [1130113],
    busCount: 5,
    apikey: "get one from https://portal-api.digitransit.fi"
  }
}]
````

## Configuration options

The following properties can be configured:


| Option                       | Description
| ---------------------------- | -----------
| `busCount`                   | Amount of busses to show/stop
| `stops`                 	   | The stop numbers to show as an array
| `apikey`                 	   | The digitransit API currently requires an APIkey to be used. You can get one for free by registering at https://portal-api.digitransit.fi

Stops can also be an object with:

| Key                          | Description
| ---------------------------- | -----------
| `id`                         | Stop number
| `name`                 	     | Optional name to override one from API
| `minutesFrom`                | Minutes to skip from now (if the stop is not near)

## For debugging the underlying API

v2 api:
- https://api.digitransit.fi/graphiql/hsl/v2/gtfs/v1?query=%257B%250A%2520%2520stop%28id%253A%2520%2522HSL%253Axxx%2522%29%2520%257B%250A%2520%2520%2520%2520name%250A%2520%2520%2520%2520%2520%2520stoptimesWithoutPatterns%2520%257B%250A%2520%2520%2520%2520%2520%2520realtimeArrival%250A%2520%2520%2520%2520%2520%2520departureDelay%250A%2520%2520%2520%2520%2520%2520realtime%250A%2520%2520%2520%2520%2520%2520realtimeState%250A%2520%2520%2520%2520%2520%2520serviceDay%250A%2520%2520%2520%2520%2520%2520headsign%250A%2520%2520%2520%2520%2520%2520trip%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520route%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520shortName%250A%2520%2520%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%257D%250A%2520%2520%257D%2520%2520%250A%257D%250A%250A%250A
- https://digitransit.fi/en/developers/apis/1-routing-api/stops/

Example query:
```
{
  stop(id: "HSL:xxx") {
    name
      stoptimesWithoutPatterns {
      realtimeArrival
      departureDelay
      realtime
      realtimeState
      serviceDay
      headsign
      trip {
        route {
          shortName
        }
      }
    }
  }
}
```

