(function($){
	var _similarsNumber,
		_apiSpotifyUrl = "https://api.spotify.com/v1/";
	
	var init=function(similarsNumber, soundParameter, proxyParameter, spinnerCode, dataType) {
		_similarsNumber = similarsNumber;
		previewSevenDigital.init(soundParameter, proxyParameter, spinnerCode);
	}
	
	var getApiName=function() {
		return "spotify";
	}
	
	/**
	 * Fonction permettant de r�cup�rer l'identifiant unique d'un artiste
	 */
	var getArtistId = function(artist) {
		return artist.id;
	}
	
	var getCorrection=function(name, callbackOnGetArtistCorrection) {
		var searchData = {q:name, type:"artist", limit:1};
		$.ajax({
			type: "GET",
			url: _apiSpotifyUrl + "search",
			data: searchData,
		  	crossDomain: true,
		  	dataType: "json",
			success: function(data) {
					_onGetArtistSearch(data, callbackOnGetArtistCorrection);
				},
			error: function(xhr, ajaxOptions, thrownError) {
					var code = ajaxError(xhr, ajaxOptions, thrownError, searchData);
					if(code === 0 || code === 404 || code === 503) {
						callbackOnGetArtistCorrection({error:code});
					}
				}
			});
	}
	
	var _onGetArtistSearch=function(data, callbackOnGetArtistCorrection) {
		if(data.hasOwnProperty("artists")) {
			if(data.artists.items.length > 0) {
				var artist = data.artists.items[0];
				callbackOnGetArtistCorrection(artist);
				return;
			}
		}
		callbackOnGetArtistCorrection(null);
	}
	
	var getSimilars=function(artist, callbackOnGetSimilarArtists) {
		var url = _apiSpotifyUrl + "artists/" + artist.id + "/related-artists";
		$.ajax({
			type:"GET",
			url:url,
			crossDomain:true,
			dataType:"json",
			success:function(data) {
					_onGetSimilarArtists(data, callbackOnGetSimilarArtists);
				},
			error:function(xhr, ajaxOptions, thrownError) {
					if(code === 0 || code === 404 || code === 503) {
						callbackOnGetSimilarArtists({error:code});
					}
				}	
		});
	}
	
	var _onGetSimilarArtists=function(data, callbackOnGetSimilarArtists) {
		if(data.hasOwnProperty("artists")) {
			if(data.artists.length > 0) {
				callbackOnGetSimilarArtists(data.artists);
				return;
			}
		}
		callbackOnGetSimilarArtists(null);
	}
	
	var getInfos=function(artist, callbackOnGetInfo) {
		var url = _apiSpotifyUrl + "artists/" + artist.id;
		$.ajax({
			type:"GET",
			url:url,
			crossDomain:true,
			dataType:"json",
			success:function(data) {
					_onGetInfos(data, callbackOnGetInfo);
				},
			error:function(xhr, ajaxOptions, thrownError) {
					if(code === 0 || code === 404 || code === 503) {
						callbackOnGetInfo({error:code});
					}
				}	
		});
	}
	
	var _onGetInfos=function(data, callbackOnGetInfo) {
		  if(data.hasOwnProperty("name")) {
			  var artist = data;
			  var infos = {name:artist.name,
					  		url:artist.external_urls.spotify,
					  		bio:"",
					  		tags:"",
					  		image:""};
			  for(var n in artist.images) {
				  var image = artist.images[n];
				  if(image.height < 300) {
					  infos.image = image.url;
					  break;
				  }
			  }
			  for(var n in artist.genres) {
				  infos.tags += artist.genres[n] + " ";
			  }
			  callbackOnGetInfo(infos);
			  return;
		  }
		  callbackOnGetInfo(null);
	}
	
  // API de la couche d'abstraction � l'API de similarit�
  apiSpotify = (typeof(apiSpotify)!=='undefined') ? apiSpotify : {};
  $.extend(apiSpotify, {
    init:init,
    getApiName:getApiName,
    getArtistId:getArtistId,
    getCorrection:getCorrection,
    getSimilars:getSimilars,
    getInfos:getInfos
  });
  
})(this.jQuery)