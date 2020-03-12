var moment = require("moment");
const request = require("request");
var NodeHelper = require("node_helper");

function getSchedule(baseUrl, stop, successCb, errorCB) {
	const options = {
		method: "POST",
		url: baseUrl,
		headers: {
			"Content-Type": "application/graphql"
		},
		body: getHSLPayload(stop.id || stop, moment().format("YYYYMMDD"))
	};
	request(options, (err, res, body) => {
		if (err || body.indexOf('<') === 0) {
			errorCB(err);
			return;
		}
		try {
			var json = JSON.parse(body);
			if (!json.data) {
				errorCB(err);
				return;
			}
			const data = json.data.stop;
			if (!data) {
				errorCB(err);
				return;
			}
			var response = {
				stop: stop.id || stop,
				name: stop.name || data.name,
				busses: processBusData(data.stoptimesForServiceDate, stop.minutesFrom)
			};
			successCb(response);
		} catch (e) {
			errorCB(e);
		}
	});
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

function processBusData(json, minutesFrom = 0) {
	let times = [];
	if (!json || json.length < 1) {
		return times;
	}
	json.forEach(value => {
		if (value && !value.stoptimes) {
			return;
		}
		const line = value.pattern.route.shortName;
		value.stoptimes.forEach(stopTime => {
			// times in seconds so multiple by 1000 for ms
			let datVal = new Date(
				(stopTime.serviceDay + stopTime.realtimeDeparture) * 1000
			);
			if (datVal.getTime() < new Date().getTime() + (minutesFrom * 60 * 1000)) {
				return;
			}
			const date = moment(datVal);
			const bus = {
				line,
				info: stopTime.trip.alerts.join(),
				time: date.format("H:mm"),
				until: date.fromNow(),
				ts: datVal.getTime()
			};
			times.push(bus);
		});
	});
	times.sort((a, b) => a.ts - b.ts);
	return times;
}

module.exports = NodeHelper.create({
	config: {},
	updateTimer: null,
	start: function () {
		moment.locale(config.language || "fi");
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "CONFIG") {
			this.config = payload;
			this.scheduleNextFetch(this.config.initialLoadDelay);
		}
	},

	fetchTimetables() {
		var self = this;
		this.config.stops.forEach(stop => {
			getSchedule(
				this.config.apiURL,
				stop,
				data => {
					self.sendSocketNotification("TIMETABLE", data);
					self.scheduleNextFetch(this.config.updateInterval);
				},
				err => {
					console.error(err);
					self.scheduleNextFetch(this.config.retryDelay);
				}
			);
		});
	},

	scheduleNextFetch: function (delay) {
		if (typeof delay === "undefined") {
			delay = 60 * 1000;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function () {
			self.fetchTimetables();
		}, delay);
	}
});
