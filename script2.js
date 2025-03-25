console.log("She ain't dead yet!");

const map = L.map('map').setView([44.4093, -79.6932], 12);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
}).addTo(map);

let developmentSitesLayer = L.layerGroup().addTo(map);
let busStopsLayer = L.layerGroup().addTo(map);
let busRoutesLayer = L.layerGroup().addTo(map);

fetch('data1.csv')
    .then(response => response.text())
    .then(csvData => {
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',');
        const dataArray = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const dataObject = {};

            for (let j = 0; j < headers.length; j++) {
                const header = headers[j].trim();
                const value = values[j] ? values[j].trim().replace(/['"]+/g, '') : '';

                if (header === 'latitude' || header === 'longitude' || header === 'units' || header === 'commercial_sf') {
                    const num = Number(value);
                    dataObject[header] = isNaN(num) ? value : num;
                } else {
                    dataObject[header] = value;
                }
            }
            dataArray.push(dataObject);
        }

        dataArray.forEach(item => {
            console.log("Current Item:", item);

            const lat = Number(item.latitude);
            const lng = Number(item.longitude);
            const stage = item.stage;

            if (isNaN(lat) || isNaN(lng)) {
                console.error("Invalid latitude or longitude:", item);
                return;
            }

            const address = item.Address;
            const units = item.units;
            const commercialSf = item.commercial_sf;
            const notes = item.notes;
            const link = item.weblink;

            let popupContent = `
                <strong>${address}</strong><br>
                Units: ${units}<br>
                Commercial SF: ${commercialSf}<br>
                Notes: ${notes}
            `;

            if (link) {
                popupContent += `<br><a href="${link}" target="_blank">Learn More</a>`;
            }

            let marker = L.circleMarker([lat, lng], {
                color: getMarkerColor(stage),
                radius: 7
            }).bindPopup(popupContent);

            marker.addTo(developmentSitesLayer);
        });

        var legend = L.control({ position: 'bottomright' });

        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'info legend');
            var legendBox = L.DomUtil.create('div', 'legend-box', div);

            var stages = [
                "Pre-Application",
                "Proposed - Pending Application",
                "Proposed - Under Review",
                "Conditionally Approved",
                "Fully Approved"
            ];
            var colors = ["blue", "red", "orange", "#FFD700", "green"];

            for (var i = 0; i < stages.length; i++) {
                legendBox.innerHTML +=
                    '<i style="background:' + colors[i] + '"></i> ' +
                    '<span style="color:' + colors[i] + ';">' + stages[i] + '</span><br>';
            }

            legendBox.style.backgroundColor = 'white';
            legendBox.style.padding = '10px';
            legendBox.style.border = '1px solid #ccc';
            legendBox.style.borderRadius = '5px';

            return div;
        };

        legend.addTo(map);

        function getMarkerColor(stage) {
            switch (stage) {
                case "Pre-Application":
                    return "blue";
                case "Proposed - Pending Application":
                    return "red";
                case "Proposed - Under Review":
                    return "orange";
                case "Conditionally Approved":
                    return "#FFD700";
                case "Fully Approved":
                    return "green";
                default:
                    return "gray";
            }
        }

        // Layer Control
        let baseMaps = {};
        let overlayMaps = {
            "Bus Routes": busRoutesLayer,
            "Bus Stops": busStopsLayer
        };

        L.control.layers(baseMaps, overlayMaps).addTo(map);

    })
    .catch(error => console.error('Error fetching CSV:', error));

fetch('bus+routes.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                color: 'blue',
                weight: 3,
                opacity: 0.7
            }
        }).addTo(busRoutesLayer);
    })
    .catch(error => console.error('Error fetching bus routes:', error));

fetch('stops.txt')
    .then(response => response.text())
    .then(data => {
        const lines = data.split('\n');
        const header = lines[0].split(',');
        const latIndex = header.indexOf('stop_lat');
        const lonIndex = header.indexOf('stop_lon');

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (latIndex !== -1 && lonIndex !== -1 && values[latIndex] && values[lonIndex]) {
                try {
                    let marker = L.marker([parseFloat(values[latIndex]), parseFloat(values[lonIndex])], {
                        icon: L.icon({
                            iconUrl: 'icons8-bus-stop-30.png',
                            iconSize: [12, 12]
                        })
                    });
                    marker.addTo(busStopsLayer);
                } catch (error) {
                    console.error("Error creating marker:", error, values);
                }
            }
        }
        calculateDistances(developmentSitesLayer, busStopsLayer);
    })
    .catch(error => console.error('Error fetching bus stops:', error));

function calculateDistances(developmentSitesLayer, busStopsLayer) {
    let siteDistances = [];

    developmentSitesLayer.eachLayer(site => {
        let siteLatLng = site.getLatLng();
        let shortestDistance = Infinity;

        busStopsLayer.eachLayer(stop => {
            let stopLatLng = stop.getLatLng();
            let distance = siteLatLng.distanceTo(stopLatLng);

            if (distance < shortestDistance) {
                shortestDistance = distance;
            }
        });

        siteDistances.push({
            site: site,
            distance: shortestDistance
        });
    });

    siteDistances.forEach(item => {
        item.site.bindPopup(item.site.getPopup().getContent() + "<br>Distance to closest bus stop: " + item.distance.toFixed(2) + " Meters");
    });
}

function resizeMap() {
    map.invalidateSize();
}

resizeMap();
window.addEventListener('resize', resizeMap);