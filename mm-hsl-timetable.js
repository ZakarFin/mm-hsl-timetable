/* global Module */

/* MagicMirror²
 * Module: mm-hsl-timetable
 *
 * Add this to config.js:

	{
		module: "mm-hsl-timetable",
		position: "top_right",
		header: "Bussiaikataulu",
		config: {
			stops: [1130113],
			busCount: 5
		}
	}

 *
 * By Sami Mäkinen http://github.com/zakarfin
 * MIT Licensed.
 */

Module.register("mm-hsl-timetable",{

	// Default module config.
	defaults: {
		stops: [1130113],
		busCount: 5,

		initialLoadDelay: 0, // 0 seconds delay
		updateInterval: 50 * 1000, // every 50 seconds
		//updateInterval: 2 * 1000, // every 2 seconds
		retryDelay: 2500,

		apiURL: "https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql",

		timetableClass: "timetable"
	},
	timeTable: {},

	notificationReceived: function (notification, payload, sender) {
		if (notification === "DOM_OBJECTS_CREATED") {
			this.sendSocketNotification("CONFIG", this.config);
		}
	},
	socketNotificationReceived: function (notification, payload) {
		if (notification === "TIMETABLE") {
			// payload.stop name/id
			// payload.busses array
			this.timeTable[payload.stop] = payload;
			this.loaded = true;
			this.updateDom();
		}
	},
	getStops() {
		return Object.keys(this.timeTable) || [];
	},
	getTimeTable(stop) {
		// stop might be object with id and name
		var id = stop.id || stop;
		if (typeof id !== "number" && typeof id !== "string") {
			return null;
		}
		var details = this.timeTable[id];
		if (!details) {
			return null;
		}
		/* details.busses is an array of:
		{ line: '224',
		info: '',
		time: '12:51',
		until: 'in 13 hours',
		ts: 1554371460000 },
		*/
		details.busses = details.busses.slice(0, this.config.busCount);
		return details;
	},

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);
		// Set locale.
		//moment.locale(config.language);
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		if (!this.config.stops.length) {
			wrapper.innerHTML = "Please setup the stops in the config for module: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var large = document.createElement("div");
		large.className = "light small " + this.config.timetableClass;
		var htmlElements = this.getStops().map((stop) => {
			var timetable = this.getTimeTable(stop);
			return this.getTable(timetable);
		});
		large.innerHTML = htmlElements.join("");
		wrapper.appendChild(large);

		return wrapper;
	},
	getTable: function (data) {
		if (!data) {
			return "<span>Couldn't get schedule</span>";
		}
		// tr class="normal"
		var table = "<table><tr><th colspan=2>" + data.name + "</th></tr>";
		var rows = data.busses.map(item => {
			return "<tr><td>" + item.line +
				"</td><td>" + item.until +
				" (" + item.time + ")" +
				"</td></tr>";
		});

		return table + rows.join("") + "</table>";
	}
});
