console.log("So far, so good");

const map = L.map('map').setView([44.4093, -79.6932], 12);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
}).addTo(map);

fetch('test_data.csv')
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

                if (header === 'latitude' || header === 'longitude' || header === 'units') {
                    const num = Number(value);
                    dataObject[header] = isNaN(num) ? value : num;
                } else {
                    dataObject[header] = value;
                }
            }
            dataArray.push(dataObject);
        }

        console.log(dataArray);

        dataArray.forEach(item => {
            const lat = item.latitude;
            const lng = item.longitude;
            const address = item.Address;
            const units = item.units;

            if (lat && lng) {
                L.marker([lat, lng]).addTo(map)
                    .bindPopup(`<strong>${address}</strong><br>Units: ${units}`);
            } else {
                console.error("Invalid latitude or longitude:", item);
            }
        });

    })
    .catch(error => console.error('Error fetching CSV:', error));

function resizeMap() {
    map.invalidateSize();
}

resizeMap();
window.addEventListener('resize', resizeMap);