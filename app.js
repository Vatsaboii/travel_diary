let viewer;
let selectedLocation;
const savedPins = [];

document.getElementById("sidebar-toggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("active");
});
function initCesium() {
  Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxOTM5N2UwOC0yY2YzLTRjZGEtODQ0My1mNWIzMDI3YWEyMzQiLCJpZCI6MjczMjI0LCJpYXQiOjE3Mzg2NDg4NjB9.3aFhiGIskNBZVn7uA5mn1xKC452CRqm4DJjQZrxVK-k";

  viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: Cesium.createWorldTerrain(),
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    scene3DOnly: false,
  });

  viewer.scene.globe.enableLighting = true;
  viewer.imageryLayers.addImageryProvider(
    new Cesium.IonImageryProvider({ assetId: 2 })
  );
  viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
    const cartesian = viewer.camera.pickEllipsoid(
      movement.position,
      viewer.scene.globe.ellipsoid
    );

    if (cartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);

      selectedLocation = { lat, lon };
      updateLocationInfo(lat, lon);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

async function updateLocationInfo(lat, lon) {
  const coordinatesDiv = document.getElementById("coordinates");
  const locationInfoDiv = document.getElementById("location-info");
  const weatherInfoDiv = document.getElementById("weather-info");
  const wikiInfoDiv = document.getElementById("wiki-info");

  coordinatesDiv.innerHTML = `
        <div class="info-section">
            <h3>Coordinates</h3>
            <p>Latitude: ${lat.toFixed(4)}°</p>
            <p>Longitude: ${lon.toFixed(4)}°</p>
        </div>
    `;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const data = await response.json();

    locationInfoDiv.innerHTML = `
            <div class="info-section">
                <h3>Location Details</h3>
                <p>${data.display_name}</p>
                ${
                  data.address
                    ? `
                    <p>Country: ${data.address.country || "N/A"}</p>
                    <p>Region: ${
                      data.address.state || data.address.region || "N/A"
                    }</p>
                    <p>City: ${
                      data.address.city ||
                      data.address.town ||
                      data.address.village ||
                      "N/A"
                    }</p>
                `
                    : ""
                }
            </div>
        `;
  } catch (error) {
    locationInfoDiv.innerHTML = "<p>Error loading location data</p>";
  }
  try {
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=31bfcd0711e0faf4d93a1941c568a514&units=metric`
    );
    const weatherData = await weatherResponse.json();

    weatherInfoDiv.innerHTML = `
            <div class="info-section">
                <h3>Current Weather</h3>
                <p>Temperature: ${weatherData.main.temp}°C</p>
                <p>Conditions: ${weatherData.weather[0].description}</p>
                <p>Humidity: ${weatherData.main.humidity}%</p>
                <p>Wind Speed: ${weatherData.wind.speed} m/s</p>
            </div>
        `;
  } catch (error) {
    weatherInfoDiv.innerHTML = "<p>Error loading weather data</p>";
  }
  try {
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=${lat}|${lon}&format=json&origin=*`
    );
    const wikiData = await wikiResponse.json();

    if (wikiData.query.geosearch.length > 0) {
      const articles = wikiData.query.geosearch.slice(0, 3);
      wikiInfoDiv.innerHTML = `
                <div class="info-section">
                    <h3>Nearby Places</h3>
                    <ul>
                        ${articles
                          .map(
                            (article) => `
                            <li><a href="https://en.wikipedia.org/?curid=${article.pageid}" target="_blank">
                                ${article.title}
                            </a></li>
                        `
                          )
                          .join("")}
                    </ul>
                </div>
            `;
    } else {
      wikiInfoDiv.innerHTML = "<p>No Wikipedia articles found nearby</p>";
    }
  } catch (error) {
    wikiInfoDiv.innerHTML = "<p>Error loading Wikipedia data</p>";
  }
}

function addPin(lat, lon, name) {
  const pin = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    billboard: {
      image:
        "https://upload.wikimedia.org/wikipedia/commons/8/88/Map_marker.svg",
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      scale: 0.5,
    },
    label: {
      text: name,
      font: "14px sans-serif",
      pixelOffset: new Cesium.Cartesian2(0, -35),
    },
  });

  savedPins.push({
    lat: lat,
    lon: lon,
    name: name,
    entity: pin,
  });

  updatePinsList();
}

function updatePinsList() {
  const pinsList = document.getElementById("pins-list");
  pinsList.innerHTML = savedPins
    .map(
      (pin, index) => `
                <div class="pin-item">
                    <span>${pin.name}</span>
                    <div>
                        <button onclick="flyToLocation(${pin.lat}, ${pin.lon})">View</button>
                        <button onclick="deletePin(${index})" style="background: rgba(239, 68, 68, 0.8); margin-left: 5px;">
                            Delete
                        </button>
                    </div>
                </div>
            `
    )
    .join("");
}

function deletePin(index) {
  if (confirm("Are you sure you want to delete this location?")) {
    viewer.entities.remove(savedPins[index].entity);
    savedPins.splice(index, 1);
    updatePinsList();
  }
}

function flyToLocation(lat, lon) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 50000.0),
    orientation: {
      heading: 0.0,
      pitch: -Cesium.Math.PI_OVER_TWO,
      roll: 0.0,
    },
  });
}
window.onload = function () {
  initCesium();
  document.getElementById("add-pin").addEventListener("click", () => {
    if (selectedLocation) {
      const name = prompt("Enter a name for this location:");
      if (name) {
        addPin(selectedLocation.lat, selectedLocation.lon, name);
      }
    } else {
      alert("Please select a location on the globe first");
    }
  });
};
