var fs = require("fs");
var path = require("path");
var moment = require("moment");
const request = require("request");
var NodeHelper = require("node_helper");

function getSchedule(baseUrl, stop, successCb, errorCB) {
	var self = this;

	const options = {
		method: "POST",
		url: baseUrl,
		headers: {
			"Content-Type": "application/graphql"
		},
		body: getHSLPayload(stop, moment().format("YYYYMMDD"))
	};
	request(options, (err, res, body) => {
		if (err) {
			errorCB(err);
			return;
		}
		try {
			var json = JSON.parse(body);
			const data = json.data.stop;
			if (!data) {
				errorCB(err);
				return;
			}
			var response = {
				stop,
				name: data.name,
				busses: processBusData(data.stoptimesForServiceDate)
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

function processBusData(json) {
	let times = [];
	json.forEach(value => {
		const line = value.pattern.route.shortName;
		value.stoptimes.forEach(stopTime => {
			// times in seconds so multiple by 1000 for ms
			let datVal = new Date(
				(stopTime.serviceDay + stopTime.realtimeDeparture) * 1000
			);
			if (datVal.getTime() < new Date().getTime()) {
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
	return times.slice(0, this.count);
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
