function loadCommuneContainer()
{	
	let communeContainer = document.getElementById('communesDiv');
	let communes_dict = {"Bresson" : 38057, "Brié-et-Angonnes" : 38058, "Champ-sur-Drac" : 38059, "Champagnier" : 38068, "Claix" : 38111,"Corenc" : 38126, "Domène" : 38150, "Échirolles" : 38151, "Eybens" : 38158, "Fontaine" : 38169, "Le Fontanil-Cornillon" : 38170, "Gières" : 38179, "Grenoble" : 38185, "Le Gua" : 38187, "Herbeys" : 38188, "Jarrie" : 38200, "Meylan" : 38229, "Miribel-Lanchâtre" : 38235, "Mont-Saint-Martin" : 38258, "Montchaboud" : 38252, "Murianette" : 38271, "Notre-Dame-de-Commiers" : 38277, "Notre-Dame-de-Mésage" : 38279, "Noyarey" : 38281, "Poisat" : 38309, "Le Pont-de-Claix" : 38317, "Proveysieux" : 38325, "Quaix-en-Chartreuse" : 38328, "Saint-Barthélémy-de-Séchilienne" : 38364, "Saint-Égrève" : 38382, "Saint-Georges-de-Commiers" : 38388, "Saint-Martin-d'Hères" : 38421, "Saint-Martin-le-Vinoux" : 38423, "Saint-Paul-de-Varces" : 38436, "Saint-Pierre-de-Mésage" : 38445, "Le Sappey-en-Chartreuse" : 38471, "Sarcenas" : 38472, "Sassenage" : 38474, "Séchilienne" : 38478, "Seyssinet-Pariset" : 38485, "Seyssins" : 38486, "La Tronche" : 38516, "Varces-Allières-et-Risset" : 38524, "Vaulnaveys-le-Bas" : 38528, "Vaulnaveys-le-Haut" : 38529, "Venon" : 38533, "Veurey-Voroize" : 38540, "Vif" : 38545, "Vizille" : 38562 };
	let content = '<strong style="font-size: large;">Communes</strong></br><br>';
	content += '<select name="commune" id="communeId" style="margin-left:5%; margin-right:5%; min-width:90%">';
	for(var key in communes_dict) {
		content += '<option value="' + communes_dict[key] +'">' + key + '</option>';
	}
	content += '</select><br><br>';
	communeContainer.innerHTML = content;		
		
	// set up containers for the map  + panel
	let suggestionsContainer = document.getElementById('panel');

	let content_search = '<strong style="font-size: large;">' + 'Adressse' + '</strong></br>';
	content_search += '<br/><input list="adresses" type="text" id="auto-complete" style="margin-left:5%; margin-right:5%; min-width:90%"  onkeyup="return autoCompleteListener(this, event);">';
	content_search += '<datalist id="adresses"></datalist><br/>'
	suggestionsContainer.innerHTML = content_search;		
}




var AUTOCOMPLETION_URL = 'https://api-adresse.data.gouv.fr/search/',
	ajaxRequest = new XMLHttpRequest(),
	query = '';


/**
 * If the text in the text box  has changed, and is not empty,
 * send a geocoding auto-completion request to the server.
 *
 * @param {Object} textBox the textBox DOM object linked to this event
 * @param {Object} event the DOM event which fired this listener
 */
function autoCompleteListener(textBox, event) {

	if (query != textBox.value) {
		if (textBox.value.length >= 3) {

			/**
			 * A full list of available request parameters can be found in the Geocoder Autocompletion
			 * API documentation.
			 *
			 */
			let communesContainer = document.getElementById('communeId');
			let index = communesContainer.selectedIndex;
			let citycode = communesContainer.options[index].value;
			var city_code_param = "&citycode=" + citycode; 

			let params = '?' +
				'q=' + encodeURIComponent(textBox.value) + city_code_param;
			ajaxRequest.open('GET', AUTOCOMPLETION_URL + params);
			ajaxRequest.send();
		}
	}
	query = textBox.value;
}


/**
 *  This is the event listener which processes the XMLHttpRequest response returned from the server.
 */
function onAutoCompleteSuccess() {
	/*
	 * The styling of the suggestions response on the map is entirely under the developer's control.
	 * A representitive styling can be found the full JS + HTML code of this example
	 * in the functions below:
	 */
	addResponseToDataList(this.response); // In this context, 'this' means the XMLHttpRequest itself.
}


/**
 * This function will be called if a communication error occurs during the XMLHttpRequest
 */
function onAutoCompleteFailed() {
	alert('Ooops!');
}

// Attach the event listeners to the XMLHttpRequest object
ajaxRequest.addEventListener("load", onAutoCompleteSuccess);
ajaxRequest.addEventListener("error", onAutoCompleteFailed);
ajaxRequest.responseType = "json";



/**
 * Format the geocoding autocompletion response object's data for display
 *
 * @param {Object} response
 */
function addResponseToDataList(response) {
	let options = '';
	for (let i = 0; i < response.features.length; i++)
		options += '<option value="' + response.features[i].properties.label + '" />';

	document.getElementById('adresses').innerHTML = options;

}




