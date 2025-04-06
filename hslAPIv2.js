var moment = require("moment");

/*
		[{
		  "realtimeArrival": 77071,
		  "realtimeDeparture": 77071,
		  "departureDelay": 91,
		  "realtime": true,
		  "realtimeState": "UPDATED",
		  "serviceDay": 1743886800,
		  "headsign": "Leppävaara as.",
		  "trip": {
			"route": {
			  "shortName": "215"
			}
		  }
		}, ... ]
*/
function processBusData(data, minutesFrom = 0) {
	const { stoptimesWithoutPatterns:json } = data
	let times = [];
	if (!json || json.length < 1) {
		return times;
	}
	json.forEach((value) => {
		if (value && typeof value.realtimeArrival !== "number") {
			return;
		}
		const line = value.trip.route.shortName;
		// times in seconds so multiple by 1000 for ms
		let datVal = new Date(
			(value.serviceDay + value.realtimeArrival) * 1000
		);

		if (
			datVal.getTime() <
			new Date(Date.now()).getTime() + minutesFrom * 60 * 1000
		) {
			// skip if its too close to current time
			return;
		}
		const date = moment(datVal);
		const bus = {
			line,
			info: "",
			time: date.format("H:mm"),
			until: date.fromNow(),
			ts: datVal.getTime(),
		};
		times.push(bus);
	});
	times.sort((a, b) => a.ts - b.ts);
	return times;
}


function getHSLPayload(stop, date, busCount = 5) {
	// add a couple of extras for busCount so ones that are too
	//  close to current time doesn't leave the target amount short
    return `{
        stop(id: "HSL:${stop}") {
            name
            stoptimesWithoutPatterns (numberOfDepartures:${busCount + 2}) {
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
    }`;
}

module.exports = {
	processBusData,
	getHSLPayload
};
