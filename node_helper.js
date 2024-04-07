var moment = require("moment");
// uncomment node-fetch for older MM versions
// const fetch = require("node-fetch");
var NodeHelper = require("node_helper");

function getSchedule(baseUrl, apikey, stop, successCb, errorCB) {
    const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
    const headers = {
        "Content-Type": "application/graphql",
        "User-Agent": "Mozilla/5.0 (Node.js " + nodeVersion + ") MagicMirror/" + global.version,
        "Cache-Control": "max-age=0, no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        "digitransit-subscription-key": apikey
    };

    fetch(baseUrl, {
        method: 'POST',
        body:    getHSLPayload(stop.id || stop, moment().format("YYYYMMDD")),
        headers: headers })
        .then(NodeHelper.checkFetchStatus)
        .then(response => response.json())
        .then(json => {
            if (!json.data) {
                errorCB('No data');
                return;
            }
            const data = json.data.stop;
            if (!data) {
                errorCB('No stop data');
                return;
            }
            var response = {
                stop: stop.id || stop,
                name: stop.name || data.name,
                busses: processBusData(data.stoptimesForServiceDate, stop.minutesFrom)
            };
            successCb(response);
        })
        .catch((error) => {
            errorCB(error);
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
            if (datVal.getTime() < new Date(Date.now()).getTime() + (minutesFrom * 60 * 1000)) {
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
                this.config.apikey,
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
