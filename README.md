# Module: Timetable for HSL data (Finland)
The `mm-hsl-timetable` fetches bus timetable data from HSL (Helsinki region Finland)and shows the timetables for configured stops.

You will need to check the "solmutunnus" from https://www.avoindata.fi/data/fi/dataset/hsl-n-joukkoliikenteen-pysakit and add the number of the bus stop you want to show in the config stops-array.

## Screenshot

- HSL Timetable screenshot
![HSL Timetable screenshot](screenshot.png)

## Using the module

To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [
	{
		module: "mm-hsl-timetable",
		position: "top_right",
		header: "Bus schedule",
		config: {
			stops: [1130113],
			busCount: 5
		}
    }
]
````

## Configuration options

The following properties can be configured:


| Option                       | Description
| ---------------------------- | -----------
| `busCount`                   | Amount of busses to show/stop
| `stops`                 	   | The stop numbers to show as an array
