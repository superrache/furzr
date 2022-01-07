(function($){
	var _similarsNumber;
	
	var init=function(similarsNumber, soundParameter, proxyParameter, spinnerCode, dataType) {
		_similarsNumber = similarsNumber;
		// initialiser le module Preview correspondant s'il y en a un
	}
	
	var getApiName=function() {
		return "newapi";
	}
	
	/**
	 * Fonction permettant de récupérer l'identifiant unique d'un artiste
	 */
	var getArtistId = function(artist) {

	}
	
	var getCorrection=function(name, callbackOnGetArtistCorrection) {

	}
	
	var getSimilars=function(artist, callbackOnGetSimilarArtists) {
		
	}
	
	var getInfos=function(artist, callbackOnGetInfo) {
		
	}
	
  // API de la couche d'abstraction à l'API de similarité
  apiNouvelle = (typeof(apiNouvelle)!=='undefined') ? apiNouvelle : {};
  $.extend(apiNouvelle, {
    init:init,
    getApiName:getApiName,
    getArtistId:getArtistId,
    getCorrection:getCorrection,
    getSimilars:getSimilars,
    getInfos:getInfos
  });
  
})(this.jQuery)