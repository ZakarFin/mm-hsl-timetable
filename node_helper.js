var moment = require("moment");
// uncomment node-fetch for older MM versions
// const fetch = require("node-fetch");
var NodeHelper = require("node_helper");
// uncomment/comment the version import to try previous API version vs new one
// const DigiTrAPI = require("./hslAPIv1");
const DigiTrAPI = require("./hslAPIv2");

function getSchedule(baseUrl, apikey, stop, successCb, errorCB, busCount) {
    const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
    const headers = {
        "Content-Type": "application/graphql",
        "User-Agent": `Mozilla/5.0 (Node.js ${nodeVersion}) MagicMirror/${global.version}`,
        "Cache-Control": "max-age=0, no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        "digitransit-subscription-key": apikey,
    };

    fetch(baseUrl, {
        method: "POST",
        body: DigiTrAPI.getHSLPayload(stop.id || stop, moment().format("YYYYMMDD"), busCount),
        headers: headers,
    })
        .then(NodeHelper.checkFetchStatus)
        .then((response) => response.json())
        .then((json) => {
            if (!json.data) {
                errorCB("No data");
                return;
            }
            const data = json.data.stop;
            if (!data) {
                errorCB("No stop data");
                return;
            }
            var response = {
                stop: stop.id || stop,
                name: stop.name || data.name,
                busses: DigiTrAPI.processBusData(
                    data,
                    stop.minutesFrom
                ),
            };
            successCb(response);
        })
        .catch((error) => {
            errorCB(error);
        });
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
        this.config.stops.forEach((stop) => {
            getSchedule(
                this.config.apiURL,
                this.config.apikey,
                stop,
                (data) => {
                    self.sendSocketNotification("TIMETABLE", data);
                    self.scheduleNextFetch(this.config.updateInterval);
                },
                (err) => {
                    console.error(err);
                    self.scheduleNextFetch(this.config.retryDelay);
                },
				this.config.busCount
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
    },
});
