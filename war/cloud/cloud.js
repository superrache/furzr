var fill;

$(document).ready(function() {
	jQuery.support.cors = true;
	
	$.ajax({
		type: "GET",
		data: {time: new Date().getTime()},
		url: "http://isoartistictree.appspot.com/getartistscloud",
		success:onGetArtistsCloud,
		crossDomain: true,
	  	dataType: "jsonp"
		});
 });

var onGetArtistsCloud = function(resp) {
	var data = JSON.parse(resp);
	
	if(data.hasOwnProperty("artistsCloud")) {
		var artistsCloud = data.artistsCloud;
		var htmlize = "";
		
		var max = artistsCloud.POIDS_MAX;
		
		for(var name in artistsCloud) {
			if(name != "POIDS_MAX") {
				var poids = Math.round(artistsCloud[name] * 10 / max) + 0.5;
				htmlize += "<span style=\"font-size:" + poids + "em\">" + name + " </span>";
			}
		}
		
		$("#div_cloud").html(htmlize);

		
	}
}


