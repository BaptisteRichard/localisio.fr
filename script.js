
const OVERPASS_API = 'https://z.overpass-api.de/api/interpreter?data=[out:json];'
const SEARCH_DIST_KM = 0.25
const NUMBER_OF_COMPUTED_PATH = 5


const BICYCLE_PARKING_ICON = L.icon({
	iconUrl: '240px-Parking-bicycle-16.svg.png',
	iconSize: [32, 32], // size of the icon
});

const POLYLINE_OPTIONS = {
	color: 'red',
	weight: 4,
	opacity: 0.7
};


const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

//default coordinates : fixed to somewhere in Grenoble
var lat_default = 45.1877535;
var lon_default = 5.7237598;
//default app version : 0 if app is not used
var appVersion = 0; 

//If we have some coordinates in localstorage , use them instead
if(localStorage.getItem('lat') != null){
  lat_default=localStorage.getItem('lat');
}
if(localStorage.getItem('lon') != null){
  lon_default=localStorage.getItem('lon');
}

//If some soordinates were passed in URL, use them instead of anything else
if(urlParams.has('lat')){
  lat_default=urlParams.get('lat');
}
if(urlParams.has('lon')){
  lon_default=urlParams.get('lon');
}
if(urlParams.has('app')){
  appVersion=urlParams.get('lon');
}



var lat_from = 0;
var lon_from = 0;
var map = null;
var valid_button = null;
var markerlist = []
var center_marker = null

var stage=0; // 0 : loading page / 1: target selected / 2 : position selected -- map drawn 

var target='node[%22amenity%22=%22bicycle_parking%22]';
var iconURL='images/bicyleparking.svg';

/**
 * @description
 *   Lance la demande de localisation pour la session en cours
 *   Lancée automatiquement avec le onload du body
 * @author Pierre Adam
 */
function initialize() {
	document.getElementById('map').innerHTML = ""

//	let menu_id = document.getElementById("selectTarget");
//	menu_id.style.display = "flex";

	if (navigator.geolocation) {
		const location_timeout = setTimeout("geolocFail()", 5000);
		const geoOptions = {
			enableHighAccuracy: false,
			maximumAge: 10000,
			timeout: 5000
		};

		navigator.geolocation.getCurrentPosition(position => {
			clearTimeout(location_timeout);
			lat_from = position.coords.latitude;
			lon_from = position.coords.longitude;
			showMap([lat_from, lon_from]);
		}, function (error) {
			clearTimeout(location_timeout);
			geolocFail(2);
		}, geoOptions);
	} else {
		// Fallback for no geolocation
		geolocFail(1);
	}
}


/**
 * @description
 *   Nettoie la carte en supprimant tous les layers sauf les tiles
 *   vide le "cache" de marker
 * @author Pierre Adam
 */
function clear_all_map() {
	map.eachLayer(layer => {
		if (!(layer.hasOwnProperty("_url"))) {
			map.removeLayer(layer);
		}
	});
	valid_button.button.style.display = "none"
//	map.setView([lat_from, lon_from], 17);
	map.setZoom(17);
	markerlist = []
}

function goBack(){
  if(stage == 0 ) { return; }
  hide_show('menu') ;
  clear_all_map();
  if(stage == 1){ hide_show('selectTarget') ; }
  stage --;
}

function setTarget(i,t){
  target=t;
  iconURL=i;
  hide_show('selectTarget');
  hide_show('menu');
  stage=1;
}

/**
 * @param {array} currentPos position actuelle du telephone
 * @description
 *   Affiche la carte, crée et ajoute le bouton "retour" et crééele bouton "validation"
 * @author Pierre Adam
 */
function showMap(currentPos) {
	map = L.map('map').setView(currentPos, 17);
	L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
		// Il est toujours bien de laisser le lien vers la source des données
		attribution: 'données © <a href="//osm.org/copyright">OpenStreetMap</a>/ODbL - rendu <a href="//openstreetmap.fr">OSM France</a> - icons <a href="/credits.html">credits</a>',
		minZoom: 1,
		maxZoom: 20
	}).addTo(map);

	if(appVersion > 0){ //app should not display back button here as it's embedded in title
		L.easyButton('<img class="back_button" src="images/back.svg" >', (btn, map) => {
			goBack();
		}).addTo(map)
	}

	valid_button = L.easyButton('<img class="valid_button" src="images/check.svg" >', (btn, map) => {
		const position = [map.getCenter().lat, map.getCenter().lng]
		showPathToNearestTarget(position, 'walking')
		map.removeLayer(center_marker)
		btn.button.style.display = "none"
	}).addTo(map)
	valid_button.button.style.display = "none"

}

/**
 * @description
 *   Affiche un message d'erreur signifiant que le GPS n'est pas activé.
 * @author Pierre Adam
 */
function geolocFail(code=3) {

	lat_from = lat_default;
	lon_from = lon_default ;
	showMap([lat_from, lon_from]);

	warn = document.getElementById("noGPS");
        warn.style.display="block";
        setTimeout(function(){ 
          warn.classList.add('is-active');
        },1500);


	document.getElementById("here").style.display = "none";
}

/**
 * @description
 *   Affiche / cache les boutton du menu
 * @author Pierre Adam
 */
function hide_show(id) {
	//document.getElementById('map').innerHTML = ""
	let menu_id = document.getElementById(id);
	if (menu_id.style.display != "none") {
		menu_id.style.display = "none";
	} else {
		menu_id.style.display = "flex";
	}
}


/**
 * @description
 *   Ouvre la carte pour la selection du point de destination et lance le calcul
 *   de la position actuelle vers la destination demandee
 * @author Pierre Adam
 */
async function target_near_pos() {
	hide_show('menu')
	stage =2 ; 
	center_marker = L.marker(map.getCenter()).addTo(map);
	const currentPos = [lat_from, lon_from]

	map.on('drag', function (e) {
		center_marker.setLatLng(map.getCenter());
	});
	map.on('zoom', function (e) {
		center_marker.setLatLng(map.getCenter());
	});
	valid_button.button.style.display = ""
}

/**
 * @description
 *   Lance le calcul pour la recherche d'arceaux autour de soi
 * @author Pierre Adam
 */
async function target_near_me() {
	hide_show('menu')
	stage =2 ; 
	const currentPos = [lat_from, lon_from]
	await showPathToNearestTarget(currentPos, 'walking')
}


function createButton(label, container) {
}


/**
 * @param {Array} currentPos position actuelle
 * @param {Array} destinationPos position de la destination
 * @param {boolean} isWalking use openRouteService with walk options or not (bike)
 * @description
 *   Calcule le trajet depuis la position courante vers la destination.
 *   Trace au max 5 routes pour y aller.
 * @author Pierre Adam
 */
async function showPathToNearestTarget(position, vehicle, searchDist=SEARCH_DIST_KM) {
	localStorage.setItem('lon',position[1]);
	localStorage.setItem('lat',position[0]);

	boundingBox = getBoundingBox(position, searchDist); // 200m autour de la destination

	const overpassUrl = OVERPASS_API + target + '(' + boundingBox[1] + ',' + boundingBox[0] + ',' + boundingBox[3] + ',' + boundingBox[2] + ');out;';
	const response = await fetch(overpassUrl);
	const osmDataAsJson = await response.json(); // read response body and parse as JSON

	// pas de parking à vélo à 200m à la ronde, ben tant pis !
	if (osmDataAsJson.elements.length == 0) {
		if(searchDist <= SEARCH_DIST_KM*8){
			var container = L.DomUtil.create('div'); 
			L.DomUtil.create('p', '', container).innerHTML= 'No such thing under ' + 1000 * searchDist + 'm, try searching up to  '+2000 * searchDist+'m ? ';

			cancel_button = L.DomUtil.create('img', '', container);
			cancel_button.setAttribute('src', 'images/back.svg');
			cancel_button.setAttribute('width', '20');
			cancel_button.addEventListener('click', () => { clear_all_map(); });
			container.appendChild(cancel_button);

			retry_button = L.DomUtil.create('img', '', container);
			retry_button.setAttribute('src', 'images/check.svg');
			retry_button.setAttribute('width', '20');
			retry_button.style.float = 'right';
			retry_button.addEventListener('click', () => { showPathToNearestTarget(position, vehicle, searchDist*2) });
			container.appendChild(retry_button);


			var popup = L.popup().setContent(container);

			let marker = L.marker(position).addTo(map).bindPopup(popup).openPopup();
			map.setView(position, 17);
			return;
		}else{
			const popupTitle = 'No such thing<br>under ' + 1000 * searchDist + 'm ';
			let marker = L.marker(position).addTo(map).bindPopup(popup).openPopup();
			map.setView(position, 17);
	  		return;
		}


	}

	// on ne garde que les NUMBER_OF_COMPUTED_PATH parkings vélo les plus proches (vol d'oiseau), histoire de ne pas calculer X fois des chemins le plus court.
	shortestParkingNodeDict = {};
	osmDataAsJson.elements.forEach((parkingNode, i) => {
		shortestParkingNodeDict[haversineInMeters(position[0], position[1], parkingNode.lat, parkingNode.lon)] = parkingNode;
	});

	let items = Object.keys(shortestParkingNodeDict).map(key => [key, shortestParkingNodeDict[key]]);

	// Sort the array based on the first element
	items.sort((first, second) => second[0] - first[0]);

	// Create a new array with only the NUMBER_OF_COMPUTED_PATH last items
	listOfShortestParkNode = [];
	const maxNbOfPark = Math.min(NUMBER_OF_COMPUTED_PATH, items.length);

	// add marker on current position
	let marker = L.marker(position).addTo(map);

	// get the last maxNbOfPark element
	for (parkingNode of items.slice(-maxNbOfPark)) {
		const mapboxUrl = 'mapbox.php?vehicle='+vehicle+'&position=' + position[1] + ',' + position[0] + ';' + parkingNode[1].lon + ',' + parkingNode[1].lat;
		const response = await fetch(mapboxUrl);
		const osmDataAsJson = await response.json(); // read response body and parse as JSON
		const dist = parseInt(osmDataAsJson.routes[0].distance,10);
		const nearestPath = osmDataAsJson.routes[0].geometry.coordinates.map(elem => [elem[1], elem[0]])
		const cycleParkPos = nearestPath[nearestPath.length - 1] // get the cycle park position (at the end of the path)
		const polyline = new L.Polyline(nearestPath, POLYLINE_OPTIONS);
		const markerCyclePark = L.marker(cycleParkPos, {
			icon: L.icon({
        				iconUrl: iconURL,
        				iconSize: [32, 32], // size of the icon
					}),
			polyline: polyline,
			distance: parkingNode[0]
		}).addTo(map);
		const CycleParkTitle = 'Distance : ' + dist + 'm';
		const offsetPopup = L.point(0, -10);
		markerCyclePark.bindPopup(CycleParkTitle, {
			'offset': offsetPopup
		});

		markerCyclePark.on("click", e => {
			// on commence par virer tous les polylines
			markerlist.forEach(item => {
				if (map.hasLayer(item.options.polyline)) {
					map.removeLayer(item.options.polyline)
				}
			});
			// on ajoute ensuite le layer et on tente de le centrer
			map.addLayer(e.target.options.polyline)
			map.flyToBounds(e.target.options.polyline.getBounds(), {
				padding: [100, 100]
			});
			e.target.openPopup()

		});
		markerlist.push(markerCyclePark)
	}
	// sort marker list
	markerlist.sort((a, b) => a.options.distance - b.options.distance)
	// show shortest path
	map.addLayer(markerlist[0].options.polyline)
	map.flyToBounds(markerlist[0].options.polyline.getBounds(), {
		padding: [100, 100]
	});
	markerlist[0].openPopup()
}

// ------------------------------------------
//  HELPER FUNCTIONS
// ------------------------------------------

/**
 * @param {array} centerPoint - two-dimensional array containing center coords [latitude, longitude]
 * @param {number} distance - distance (km) from the point represented by centerPoint
 * @description
 *   Computes the bounding coordinates of all points on the surface of a sphere
 *   that has a great circle distance to the point represented by the centerPoint
 *   argument that is less or equal to the distance argument.
 *   Technique from: Jan Matuschek <http://JanMatuschek.de/LatitudeLongitudeBoundingCoordinates>
 * @author Alex Salisbury
 */
function getBoundingBox(centerPoint, distance) {
	let minLat, maxLat, minLon, maxLon, deltaLon;
	if (distance < 0) {
		return 'Illegal arguments';
	}
	// helper functions (degrees<–>radians)
	Number.prototype.degToRad = function () {
		return this * (Math.PI / 180);
	};
	Number.prototype.radToDeg = function () {
		return (180 * this) / Math.PI;
	};
	// coordinate limits
	const MIN_LAT = (-90).degToRad();
	const MAX_LAT = (90).degToRad();
	const MIN_LON = (-180).degToRad();
	const MAX_LON = (180).degToRad();
	// Earth's radius (km)
	const R = 6378.1;
	// angular distance in radians on a great circle
	const radDist = distance / R;
	// center point coordinates (deg)
	const degLat = centerPoint[0];
	const degLon = centerPoint[1];
	// center point coordinates (rad)
	const radLat = degLat.degToRad();
	const radLon = degLon.degToRad();
	// minimum and maximum latitudes for given distance
	minLat = radLat - radDist;
	maxLat = radLat + radDist;
	// minimum and maximum longitudes for given distance
	minLon = void 0;
	maxLon = void 0;
	// define deltaLon to help determine min and max longitudes
	deltaLon = Math.asin(Math.sin(radDist) / Math.cos(radLat));
	if (minLat > MIN_LAT && maxLat < MAX_LAT) {
		minLon = radLon - deltaLon;
		maxLon = radLon + deltaLon;
		if (minLon < MIN_LON) {
			minLon = minLon + 2 * Math.PI;
		}
		if (maxLon > MAX_LON) {
			maxLon = maxLon - 2 * Math.PI;
		}
	}
	// a pole is within the given distance
	else {
		minLat = Math.max(minLat, MIN_LAT);
		maxLat = Math.min(maxLat, MAX_LAT);
		minLon = MIN_LON;
		maxLon = MAX_LON;
	}
	return [
    minLon.radToDeg(),
    minLat.radToDeg(),
    maxLon.radToDeg(),
    maxLat.radToDeg()
  ];
};

/**
 * @description
 *   Calcul la distance en metres entre deux positions gps
 * @author Pierre Adam
 */
function haversineInMeters() {
	const radians = Array.prototype.map.call(arguments, function (deg) {
		return deg / 180.0 * Math.PI;
	});
	const lat1 = radians[0],
		lon1 = radians[1],
		lat2 = radians[2],
		lon2 = radians[3];
	const R = 6372.8; // km
	const dLat = lat2 - lat1;
	const dLon = lon2 - lon1;
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
	const c = 2 * Math.asin(Math.sqrt(a));
	return 1000 * R * c;
}
