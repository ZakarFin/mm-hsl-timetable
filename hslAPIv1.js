var moment = require("moment");

/*
V1 supposedly deprecated and shut down on 1.4.2025, but still works as of 6.4.2025
 */
function processBusData(data, minutesFrom = 0) {
	const { stoptimesForServiceDate:json } = data;
    let times = [];
    if (!json || json.length < 1) {
        return times;
    }
    json.forEach((value) => {
        if (value && !value.stoptimes) {
            return;
        }
        const line = value.pattern.route.shortName;
        value.stoptimes.forEach((stopTime) => {
            // times in seconds so multiple by 1000 for ms
            let datVal = new Date(
                (stopTime.serviceDay + stopTime.realtimeDeparture) * 1000
            );
            if (
                datVal.getTime() <
                new Date(Date.now()).getTime() + minutesFrom * 60 * 1000
            ) {
                return;
            }
            const date = moment(datVal);
            const bus = {
                line,
                info: stopTime.trip.alerts.join(),
                time: date.format("H:mm"),
                until: date.fromNow(),
                ts: datVal.getTime(),
            };
            times.push(bus);
        });
    });
    times.sort((a, b) => a.ts - b.ts);
    return times;
}


function getHSLPayload(stop, date) {
    return `{
      stop(id: "HSL:${stop}") {
        name
        lat
        lon
        url
        stoptimesForServiceDate(date:"${date}") {
          pattern {
            name
            route {
              shortName
            }
          }
          stoptimes {
            serviceDay
            scheduledDeparture
            realtimeDeparture
            trip {
              serviceId
              alerts {
                alertHeaderText
              }
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
