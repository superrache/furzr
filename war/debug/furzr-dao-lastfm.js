(function($){
	var _similarsNumber,
		_apiLastFmUrl = "http://ws.audioscrobbler.com/2.0/",
		_apiLastFmKey = "a5ca8d5706cd79676a9b3e5748ba0848";
		
	
	var init=function(similarsNumber, soundParameter, proxyParameter, spinnerCode, dataType) {
		_similarsNumber = similarsNumber;
		previewSevenDigital.init(soundParameter, proxyParameter, spinnerCode);
	}
	
	var getApiName=function() {
		return "lastfm";
	}
	
	/**
	 * Fonction permettant de r�cup�rer l'identifiant unique d'un artist Last.fm
	 */
	var getArtistId = function(artist) {
		if(artist.mbid !== "") {
			return artist.mbid;
		} else {
			return artist.name;
		}
	}

	/**
	 * Fonction permettant d'ajouter l'identifiant unique (mbid ou name) Last.fm d'un artiste � un objet de param�tre de requ�te pour Last.fm
	 */
	var _getMbidForApiLastFm = function(data, artist) {
		  if(artist.mbid !== "") {
			  data.mbid = artist.mbid;
		  } else {
			  data.artist = artist.name;
		  }
		  return data;
	}	
	
	var getCorrection=function(name, callbackOnGetArtistCorrection) {
		var dataSearch = {method: "artist.search",
		  		artist: name,
		  		limit: 10, // Can requiert au moins 9
		  		page: 1,
		  		api_key: _apiLastFmKey,
		  		format: "json"};
	  
	  $.ajax({
			type: "GET",
			url: _apiLastFmUrl,
			data: dataSearch,
		  	crossDomain: true,
		  	dataType: "jsonp",
			success: function(data) {
					_onGetArtistSearch(data, callbackOnGetArtistCorrection);
				},
			error: function(xhr, ajaxOptions, thrownError) {
					var code = ajaxError(xhr, ajaxOptions, thrownError, dataSearch);
					if(code === 0 || code === 404 || code === 503) {
						callbackOnGetArtistCorrection({error:code});
					}
				}
			});
	}
	
	var _onGetArtistSearch=function(data, callbackOnGetArtistCorrection) {
	  if(data.hasOwnProperty("results")) {
		  if(data.results.hasOwnProperty("artistmatches")) {
			  if(data.results.artistmatches.hasOwnProperty("artist")) {
				  var artist = null;
				  if(data.results.artistmatches.artist.length > 0) { // artist est un tableau
					  // parcours des r�sultats pour trouver celui qui matche
					  var resultsAttr = data.results["@attr"];
					  for(var i in data.results.artistmatches.artist) {
						  if(data.results.artistmatches.artist[i].name.toLowerCase() === resultsAttr["for"].toLowerCase()) {
							  artist = data.results.artistmatches.artist[i];
							  break;
						  }
					  }
					  if(artist === null) { // aucun ne matche donc on prend le premier
						  artist = data.results.artistmatches.artist[0];
					  }
				  } else { // un objet
					  artist = data.results.artistmatches.artist;
				  }
				  callbackOnGetArtistCorrection(artist);
				  return;
			  }
		  }
	  }
	  callbackOnGetArtistCorrection(null);
	}
	
	var getSimilars=function(artist, callbackOnGetSimilarArtists) {
		dataGetSimilar = {method: "artist.getsimilar",
				  		//limit: _similarsNumber, issue #94
				  		api_key: _apiLastFmKey,
				  		format: "json"};
		dataGetSimilar = _getMbidForApiLastFm(dataGetSimilar, artist);
		$.ajax({
			type: "GET",
			url: _apiLastFmUrl,
			data: dataGetSimilar,
			crossDomain: true,
			dataType: "jsonp",
			success: function(data) {
					_onGetSimilarArtists(data, callbackOnGetSimilarArtists);
				},
			error: function(xhr, ajaxOptions, thrownError) {
				var code = ajaxError(xhr, ajaxOptions, thrownError, dataSearch);
				if(code === 0 || code === 404 || code === 503) {
					callbackOnGetSimilarArtists({error:code});
				}
			}
		});
	}
	
	var _onGetSimilarArtists=function(data, callbackOnGetSimilarArtists) {
		if(data.hasOwnProperty("similarartists")) {
			if(data.similarartists.artist[0].hasOwnProperty("name")) {
				callbackOnGetSimilarArtists(data.similarartists.artist);
				return;
			}
		}
		callbackOnGetSimilarArtists(null);
	}
	
	var getInfos=function(artist, callbackOnGetInfo) {
	  var dataInfo = {method: "artist.getinfo",
		  		api_key: _apiLastFmKey,
		  		format: "json"},
		  dataTopTrack = {method:"artist.gettoptracks",
			  			limit:"5",
			  			api_key:_apiLastFmKey,
			  			format:"json"}
	  dataInfo = _getMbidForApiLastFm(dataInfo, artist);
	  dataTopTrack = _getMbidForApiLastFm(dataTopTrack, artist);
	  $.ajax({
			type: "GET",
			url: _apiLastFmUrl,
			data: dataInfo,
		  	crossDomain: true,
		  	dataType: "jsonp",
			success: function(data) {
					_onGetInfos(data, callbackOnGetInfo);
				},
			error: function(xhr, ajaxOptions, thrownError) {
					ajaxError(xhr, ajaxOptions, thrownError, dataInfo);
				}
			});
	  previewSevenDigital.loadPreview({
			type: "GET",
			url: _apiLastFmUrl,
			data: dataTopTrack,
		  	crossDomain: true,
		  	dataType: "jsonp",
		  	error: function(xhr, ajaxOptions, thrownError) {
		  			ajaxError(xhr, ajaxOptions, thrownError, dataTopTrack);
		  		}
			});
	}
	
	var _onGetInfos=function(data, callbackOnGetInfo) {
	  if(data.hasOwnProperty("artist")) {
		  var artist = data.artist;
		  var infos = {name:artist.name,
				  		url:artist.url,
				  		bio:artist.bio.summary,
				  		tags:"",
				  		image:""};
		  for(var n in artist.image) {
			  var image = artist.image[n];
			  if(image.size === "large") {
				  infos.image = image["#text"];
				  break;
			  }
		  }
		  for(var n in artist.tags.tag) {
			  infos.tags += artist.tags.tag[n].name + " ";
		  }
		  callbackOnGetInfo(infos);
		  return;
	  }
	  callbackOnGetInfo(null);
	}
	
  // API de la couche d'abstraction � l'API de similarit�
  apiLastFM = (typeof(apiLastFM)!=='undefined') ? apiLastFM : {};
  $.extend(apiLastFM, {
    init:init,
    getApiName:getApiName,
    getArtistId:getArtistId,
    getCorrection:getCorrection,
    getSimilars:getSimilars,
    getInfos:getInfos
  });
  
})(this.jQuery)