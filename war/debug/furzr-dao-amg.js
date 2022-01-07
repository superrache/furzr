(function($){
	var _similarsNumber,
		_dataType,
		_localisation;
	
	var init=function(similarsNumber, soundParameter, proxyParameter, spinnerCode, dataType) {
		_similarsNumber = similarsNumber;
		_dataType = dataType;
		// initialiser le module Preview correspondant s'il y en a un
		_localisation = "en-US";
	}
	
	var getApiName=function() {
		return _dataType;
	}
	
	/**
	 * Fonction permettant de r�cup�rer l'identifiant unique d'un artiste
	 */
	var getArtistId = function(artist) {
		return artist.id;
	}
	
	var _getAmgApiSig=function() {
		var curdate = new Date();
	    var gmtstring = curdate.toGMTString();
	    var utc = Date.parse(gmtstring) / 1000;
	    return $.MD5(_amgApiKey + _amgApiSharedSecret + utc);
	}
	
	var getCorrection=function(name, callbackOnGetArtistCorrection) {
		var dataSearch = {method:"getcorrection",
						name:name,
						datatype:_dataType,
						local:_localisation};
		$.ajax({
			type: "GET",
			url: "amgproxy",
			data: dataSearch,
		  	crossDomain: true,
		  	dataType: "json",
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
		if(data.hasOwnProperty("code")) {
			if(data.code === 200) {
				if(data.hasOwnProperty("name")) {
					var artist = {id:data.name.ids.nameId,
								name:data.name.name};
					callbackOnGetArtistCorrection(artist);
					return;
				} else if(data.hasOwnProperty("movie")) {
					var movie = {id:data.movie.ids.movieId,
								name:data.movie.title};
					callbackOnGetArtistCorrection(movie);
				}
			} else {
				callbackOnGetArtistCorrection(null);
				return;
			}
		} else if(data.hasOwnProperty("error")) {
			callbackOnGetArtistCorrection(data);
			return;
		} else {
			callbackOnGetArtistCorrection(null);	
		}
	}
	
	var getSimilars=function(artist, callbackOnGetSimilarArtists) {
		var dataSimilars = {method:"getsimilars",
						id:artist.id,
						number:_similarsNumber,
						datatype:_dataType,
						local:_localisation};
		$.ajax({
			type: "GET",
			url: "amgproxy",
			data: dataSimilars,
		  	crossDomain: true,
		  	dataType: "json",
			success: function(data) {
					_onGetSimilarArtists(data, callbackOnGetSimilarArtists);
				},
			error: function(xhr, ajaxOptions, thrownError) {
					var code = ajaxError(xhr, ajaxOptions, thrownError, dataSimilars);
					if(code === 0 || code === 404 || code === 503) {
						callbackOnGetSimilarArtists({error:code});
					}
				}
			});
	}
	
	var _onGetSimilarArtists=function(data, callbackOnGetSimilarArtists) {
		if(data.hasOwnProperty("code")) {
			if(data.code === 200) {
				if(data.hasOwnProperty("similars")) {
					if(data.similars.length > 0) {
						callbackOnGetSimilarArtists(data.similars);
						return;
					}
				} else if(data.hasOwnProperty("followers")) {
					if(data.followers.length > 0) {
						callbackOnGetSimilarArtists(data.followers);
						return;
					}
				} else if(data.hasOwnProperty("influencers")) {
					if(data.influencers.length > 0) {
						callbackOnGetSimilarArtists(data.influencers);
						return;
					}
				} else if(data.hasOwnProperty("related")) {
					if(data.related.hasOwnProperty("isRelatedTo") && _dataType.indexOf("related") != -1) {
						var movies = [];
						for(var n in data.related.isRelatedTo) {
							if(n > _similarsNumber) {
								break;
							}
							movies[n] = {id:data.related.isRelatedTo[n].ids.movieId,
										name:data.related.isRelatedTo[n].title};
						}
						callbackOnGetSimilarArtists(movies);
						return;
					} else if(data.related.hasOwnProperty("similarTo") && _dataType.indexOf("similars") != -1) {
						var movies = [];
						for(var n in data.related.similarTo) {
							if(n > _similarsNumber) {
								break;
							}
							movies[n] = {id:data.related.similarTo[n].ids.movieId,
										name:data.related.similarTo[n].title};
						}
						callbackOnGetSimilarArtists(movies);
						return;
					}
				}
			} else {
				callbackOnGetSimilarArtists(null);
				return;
			}
		}
		 else if(data.hasOwnProperty("error")) {
			callbackOnGetSimilarArtists(data);
			return;
		}
		callbackOnGetSimilarArtists(null);
	}
	
	var getInfos=function(artist, callbackOnGetInfo) {
		var dataSearch = {method:"getinfos",
				id:artist.id,
				datatype:_dataType,
				local:_localisation};
		$.ajax({
			type: "GET",
			url: "amgproxy",
			data: dataSearch,
		  	crossDomain: true,
		  	dataType: "json",
			success: function(data) {
					_onGetInfos(data, callbackOnGetInfo);
				},
			error: function(xhr, ajaxOptions, thrownError) {
					var code = ajaxError(xhr, ajaxOptions, thrownError, dataSearch);
					if(code === 0 || code === 404 || code === 503) {
						callbackOnGetInfo({error:code});
					}
				}
			});
	}
	
	var _onGetInfos=function(data, callbackOnGetInfo) {
		if(data.hasOwnProperty("code")) {
			if(data.code === 200) {
				if(data.hasOwnProperty("name")) {
					var nameURLEncoded = replaceAll(data.name.name, " ", "+");
					var infos = {name:data.name.name,
								bio:_formatBio(data.name.headlineBio),
								tags:"",
								image:"",
								url:"http://www.lastfm.com/music/" + nameURLEncoded};
					for(var n in data.name.musicGenres) {
						infos.tags += data.name.musicGenres[n].name + " ";
					}
					if(data.name.images != null && data.name.images.length > 0) {
						infos.image = data.name.images[0].url;
					}
					callbackOnGetInfo(infos);
					return;
				} else if(data.hasOwnProperty("movie")) {
					var nameURLEncoded = replaceAll(data.movie.title, " ", "+");
					var infos = {name:data.movie.title,
								bio:_formatBio(data.movie.synopsis.text),
								tags:"",
								image:"",
								url:"http://www.youtube.com/results?search_query=" + nameURLEncoded + "+teaser"};
					for(var n in data.movie.genres) {
						infos.tags += data.movie.genres[n].name + " ";
					}
					if(data.movie.images != null && data.movie.images.length > 0) {
						infos.image = data.movie.images[0].url;
					}
					callbackOnGetInfo(infos);
					return;
				}
			} else {
				callbackOnGetInfo(null);
				return;
			}
		} else if(data.hasOwnProperty("error")) {
			callbackOnGetInfo(data);
			return;
		} else {
			callbackOnGetInfo(null);	
		}
	}
	
	var _formatBio=function(bio) {
		var i=0;
		while(i < bio.length) {
			if(bio.charAt(i) === '[') {
				var j=bio.substring(i).indexOf("]");
				var toDelete = bio.substring(i, i+j+1);
				bio = bio.replace(toDelete, "");
			}
			i++;
		}
		return bio;
	}
	
  // API de la couche d'abstraction � l'API de similarit�
  apiAmg = (typeof(apiAmgSimilar)!=='undefined') ? apiAmg : {};
  $.extend(apiAmg, {
    init:init,
    getApiName:getApiName,
    getArtistId:getArtistId,
    getCorrection:getCorrection,
    getSimilars:getSimilars,
    getInfos:getInfos
  });
  
})(this.jQuery)