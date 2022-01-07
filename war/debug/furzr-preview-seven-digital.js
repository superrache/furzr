(function($){
	
	var _apiSevenDigitalUrl="http://api.7digital.com/1.2/",
		_apiSevenDigitalKey="7d2kx6pbdwyv",
		_volume=false,
		_spinnerImgCode,
		_useProxy=false,
		_rechercheEnCours=false, // pour �viter de finir toutes les requetes quand le cliqueur est ouf (�conomise des requetes 7digital)
		_quotasExceeded=false,
		_playlist,
		_playlistCursor=0;
	
	var init=function(volumeParam, proxyParam, spinnerCode) {
		_setVolume(volumeParam);
		$("#button_sound_volume").click(_onVolumeClick);
		$("#audio_artist_overview_preview").bind("ended", _onEnded);
		_useProxy = proxyParam;
		_spinnerImgCode = spinnerCode;
		$("#canvas").click(onCanvasClick);
	}
	
	var onCanvasClick=function(e) {
		if(_volume) {
			$("#audio_artist_overview_preview").get(0).play();
		}
	}
	
	var _onVolumeClick=function(e) {
		_setVolume(!_volume);
	}
	
	var _setVolume=function(state) {
		_volume = state;
		if(state) {
			$("#audio_artist_overview_preview").get(0).play();
			$("#button_sound_volume").html("<img src=\"img/volume_on.png\">");
		} else {
			$("#audio_artist_overview_preview").get(0).pause();
			$("#button_sound_volume").html("<img src=\"img/volume_off.png\">");
			$("#div_sound_title").html("");
		}
	}
	
	var loadPreview=function(lastFmAjaxRequest) {
		if(_volume && !_rechercheEnCours && !_quotasExceeded) {
			_rechercheEnCours = true;
			$("#div_sound_title").html(_spinnerImgCode);
			
			// recherche du top track
			lastFmAjaxRequest.success = _onGetLastFmTopTrack;
			$.ajax(lastFmAjaxRequest);
		}
	}
	
	var _onGetLastFmTopTrack=function(data) {
		if(data.hasOwnProperty("toptracks")) {
			if(data.toptracks.hasOwnProperty("track")) {
				if(data.toptracks.track.length >= 1) {
					_playlist = new Array(data.toptracks.track.length);
					for(var i in data.toptracks.track) {
						_playlist[i] = data.toptracks.track[i].artist.name + " " + data.toptracks.track[i].name;
					}
					_trackSearch(0);
					return;
				}
			}
		}
		_noPreview();
	}
	
	var _onEnded=function(e) {
		if(_playlist.length > _playlistCursor + 1) {
			_trackSearch(_playlistCursor + 1);
		}
	}
	
	var _trackSearch=function(i) {
		_playlistCursor = i;
		if(_useProxy) {
			_trackSearchByProxy(_playlist[i]);
		} else {
			var dataTrackSearch = {
					q:_playlist[i],
					oauth_consumer_key:_apiSevenDigitalKey,
					pagesize:1 
				}; // ne pas mettre le streamable
			$.ajax({
				type: "GET",
				url: _apiSevenDigitalUrl + "track/search",
				data: dataTrackSearch,
			  	crossDomain: true,
			  	dataType: "xml",
				success: _onGetTopTrack,
				error: function(xhr, ajaxOptions, thrownError) {
						if(ajaxError(xhr, ajaxOptions, thrownError, dataTrackSearch) === 401) {
							_previewServiceUnavailable();
						}
						_useProxy = true; // a partir de maintenant, on utilise toujours le proxy
						_trackSearchByProxy(dataTrackSearch.q);
					}
				});
		}
	}
	
	var _onGetTopTrack=function(xml) {
		// r�cup�ration du trackid
		var trackid = "";
		var trackTitle = "";
		var artistName = "";
		var albumTitle = "";
		var trackUrl = "";
		$(xml).find('track').each(
			function() {
				trackid = $(this).attr('id');
				trackTitle = $(this).find('title').first().text();
				trackUrl = $(this).find('url').last().text();
				$(this).find('artist').each(
					function() {
						artistName = $(this).find('name').first().text();
				});
				$(this).find('release').each(
						function() {
							albumTitle = $(this).find('title').first().text();
				});
			}
		);
		// r�cup�ration de l'url du mp3 de preview
		if(trackid != "") {
			var dataTrackPreview = {
					trackid:trackid,
					oauth_consumer_key:_apiSevenDigitalKey,
					redirect:false
				};
			$.ajax({
				type: "GET",
				url: _apiSevenDigitalUrl + "track/preview",
				data: dataTrackPreview,
			  	crossDomain: true,
			  	dataType: "xml",
				success: function(xml) {
						_loadMP3($(xml).find('url').text());
					},
				error: function(xhr, ajaxOptions, thrownError) {
						if(ajaxError(xhr, ajaxOptions, thrownError, dataTrackSearch) === 401) {
							_previewServiceUnavailable();
						}
						_useProxy = true; // a partir de maintenant, on utilise toujours le proxy
					}
				});
		} else {
			_noPreview();
		}
		
		_displayTrackInfos(artistName, trackUrl, trackTitle, albumTitle);
	}
	
	var _displayTrackInfos = function(artistName, trackUrl, trackTitle, albumTitle) {
		if(trackUrl !== "") {
			$("#div_sound_title").html(artistName + " - <a href=\"" + trackUrl + "\" target=\"_blank\">" + trackTitle + "</a><br/><i>" + albumTitle + "</i>");
		}
	}
	
	var _trackSearchByProxy=function(q) {
		  $.ajax({
				type: "GET",
				data: {time: new Date().getTime(),
						q:q
						},
				url:"gettoptrackpreviewurl",
				success:_onGetTrackByProxy
				});
	}
	
	var _onGetTrackByProxy=function(data) {
		var resp = jQuery.parseJSON(data);
		if(resp.hasOwnProperty("url")) {
			_displayTrackInfos(resp.artistName, resp.trackUrl, resp.trackTitle, resp.albumTitle);
			_loadMP3(resp.url);
		}
	}
	
	var _loadMP3=function(url) {
		if(url != null || url != "") {
			$("#audio_artist_overview_preview").attr("src", url);
		} else {
			_noPreview();
		}
		_rechercheEnCours = false;
	}
	
	var _noPreview=function() {
		$("#div_sound_title").html("<i>No preview song available</i>");
		_rechercheEnCours = false;
	}
	
	var _previewServiceUnavailable=function() {
		$("#div_sound_title").html("<i>Preview service unavailable</i>");
		_rechercheEnCours = false;
		_quotasExceeded = true;
	}

  // API preview
  previewSevenDigital = (typeof(previewSevenDigital)!=='undefined') ? previewSevenDigital : {};
  $.extend(previewSevenDigital, {
    init:init,
    loadPreview:loadPreview
  });
  
})(this.jQuery)