(function($){

	var appTitle = "furzr",
		appUrl = "http://furzr.net",
		appDescription = "Furzr is a new way to explore the world of music, browsing relationships between artists or bands and listening samples. This app lets you expand your musical knowledge like the leaves of a tree and find out what you will be listening soon.",
		appCapture = appUrl + "/img/furzr-logo-256.png";
		
	var sys,
		apiSimilarityDAO,
		currentArtist,
		distanceMax = 0,
		mouseDistanceMax = 20,
		similarArtistsNumber = 16,
		inputIds = new Array(),
		explodedIds = new Array(),
		retardedInputArtistToAdd = null,
		help = 1,
		focusedNode = null,
		mobile = false,
		soundParameter=true,
		proxyParameter=false,
		hiddenAd=false;
	
	var theme = {colorCanvasBackground:"#FFFFFF",
			colorEdge:"rgba(0,0,0, 0.5)",
			colorCircle:"rgba(0,0,0, 0.1)",
			colorNodeInput:"#DE00FF",
			colorNodeExploded:"#2572B8",
			colorNodeSimilar:"#FF5500",
			spinnerImgCode:"<img src=\"theme/blue/spinner.gif\"/>",
			treeFont:"bold 8pt Tahoma"};
		
	var CSArtistA = "", 
		CSArtistB = "", 
		savedCSArtists = new Array(),
		csLength = 0,
		isShareShown = false,
		csDescription = "";
	
  var Renderer = function(canvas) {
    var canvas = $(canvas).get(0);
    var ctx = canvas.getContext("2d");
    var particleSystem;

    var that = {
      init:function(system) {
        particleSystem = system;
        particleSystem.screen({size:{width:$(window).width(), height:$(window).height()}, padding:80});
        $(window).resize(that.resize);
        that.resize();
        that.initMouseHandling();
      },
      
      resize:function() {
    	  canvas.width = $(window).width();
          canvas.height = $(window).height();
          particleSystem.screen({size:{width:$(window).width(), height:$(window).height()}, padding:80});
          that.redraw();
      },
      
      redraw:function(){
        ctx.fillStyle = theme.colorCanvasBackground;
        ctx.fillRect(0,0, canvas.width, canvas.height);
        
        particleSystem.eachEdge(function(edge, pt1, pt2){
          ctx.strokeStyle = theme.colorEdge;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        });

        particleSystem.eachNode(function(node, pt){
        	
        	ctx.beginPath();
        	ctx.arc(pt.x, pt.y, mouseDistanceMax, 0, 2 * Math.PI, false);
        	ctx.lineWidth = 1;
        	ctx.strokeStyle = theme.colorCircle;
            ctx.stroke();
            
            /*ctx.fillStyle = "#000000";
            ctx.fillRect(pt.x-2, pt.y-15, 80,55);*/
            
          if(node.data.isInput) {
        	  ctx.fillStyle = theme.colorNodeInput;
          } else if(node.data.isExploded) {
        	  ctx.fillStyle = theme.colorNodeExploded;
          } else {
              /*var rouge = Math.round(node.data.distance * 255 / distanceMax);
              var vert = Math.round((distanceMax - node.data.distance) * 255 / distanceMax);
              var couleur = "rgba(" + rouge + ", " + vert + ", 0, 1)";
              ctx.fillStyle = couleur;*/
        	  ctx.fillStyle = theme.colorNodeSimilar;
          }
          /*if(node === focusedNode) {
        	  //ctx.fillStyle = "#000000";
          }*/
          ctx.font = theme.treeFont;
          ctx.fillText(node.data.name, pt.x, pt.y);
          
        });
      },
      
      initMouseHandling:function() {
        var dragged = null,
        	justDropped = false,
        	xDragInit = 0,
        	yDragInit = 0,
        	xDrop = 0,
        	yDrop = 0,
        	clickDragDropDifference = mouseDistanceMax / 2;

        var handler = {
          clicked:function(e) {
        	  if(justDropped) {
        		  if(xDragInit != 0 && yDragInit != 0) {
        			  if(Math.abs(xDragInit - xDrop) > clickDragDropDifference) {
        				  if(Math.abs(yDragInit - yDrop) > clickDragDropDifference) {
        	        		  justDropped = false;
        	        		  return;
        				  }
        			  }
        		  }
        	  }
        	  var pos = $(canvas).offset();
              _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
              var particle = particleSystem.nearest(_mouseP);
              if(particle != null) {
            	  if(particle.node != null) {
            		  if(particle.distance < mouseDistanceMax) {
            			  showArtistOverview(particle.node.data);
            			  
        				  if($.inArray(particle.node.name, explodedIds) === -1) {
        					  explodedIds.push(particle.node.name);
        				  }
    					  CSArtistB = particle.node.data.name;
    					  updateCSTitre();
    					  updateCSShare("", "");
    					  $("#div_cs_saved").html();
    					  
    					  ouvreArbre(particle.node.data);
    					  
    					  if(help === 2) {
    						  $("#tooltip_mouseover").fadeOut("slow");
    						  help = 3;
    					  }
            		  }
            	  }
              }
          },
          
          mousedown:function(e) {
            var pos = $(canvas).offset();
            xDragInit = e.pageX-pos.left;
            yDragInit = e.pageY-pos.top;
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
            dragged = particleSystem.nearest(_mouseP);

            if (dragged && dragged.node !== null) {
              // while we're dragging, don't let physics move the node
              dragged.node.fixed = true;
            } else {
            	
            }

            $(canvas).bind('mousemove', handler.dragged);
            $(window).bind('mouseup', handler.dropped);

            return false;
          },
          dragged:function(e) {
        	justDropped = true;
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left,e.pageY-pos.top);
            if (dragged && dragged.node !== null) {
              var p = particleSystem.fromScreen(s);
              dragged.node.p = p;
            }

            return false;
          },

          dropped:function(e) {
            if (dragged === null || dragged.node === undefined) return;
            if (dragged.node !== null) dragged.node.fixed = false;            
            var pos = $(canvas).offset();
            xDrop = e.pageX-pos.left;
            yDrop = e.pageY-pos.top;
            dragged.node.tempMass = 1000;
            dragged = null;
            $(canvas).unbind('mousemove', handler.dragged);
            $(window).unbind('mouseup', handler.dropped);
            _mouseP = null;
            return false;
          },
          
          mousemoved:function(e) {
        	  if(dragged === null) {
            	  var pos = $(canvas).offset();
                  _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
                  var particle = particleSystem.nearest(_mouseP);
                  if(particle != null) {
                	  if(particle.node != null) {
                		  if(particle.distance < mouseDistanceMax) {
                			  focusedNode = particle.node;
                		  } else {
                			  focusedNode = null;
                		  }
                	  } else {
                		  focusedNode = null;
                	  }
                  } else {
                	  focusedNode = null;
                  }
        		  
        	  }
          }
        }
        
        $(canvas).mousedown(handler.mousedown);
        $(canvas).mousemove(handler.mousemoved);
        $(canvas).click(handler.clicked);

      },
      
    }
    return that;
  }
  
  var onInputArtistKeyPress = function(event) {
	  var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode === 13){
			onArtistInput();
		}
  }
  
  var onArtistInput = function() {
	  var artistInput = $("#input_artist").val();
	  createTree(artistInput);
	  
	  if(artistInput != "") {
		  $.ajax({
				type: "GET",
				url: "artistinput",
				data: {time: new Date().getTime(),
						artistinput: artistInput}
			});
	  }
  }
  
  var createTree = function(artistInput) {
	  
	  if(artistInput != null && artistInput != "") {
		  
		  $("#button_artist").html(theme.spinnerImgCode);

		  if(help === 1) {
			  $("#div_voile").fadeOut();
			  $(".state_header_normal").toggleClass("state_header_start", false);
			  $(".state_div_input_artist_normal").toggleClass("state_div_input_artist_start", false);
			  setTimeout(function() {
				showWindows();
	          }, 1020);
		  }
		  apiSimilarityDAO.getCorrection(artistInput, onGetArtistCorrection);
	  }
  }
    
  var onGetArtistCorrection = function(artist) {
	if(artist != null) {
	  if(artist.hasOwnProperty("name")) {
		  artist.distance = 0;
		  artist.isInput = true;
		  artist.isExploded = false;
		  retardedInputArtistToAdd = artist;
		  
		  inputIds.push(apiSimilarityDAO.getArtistId(artist));
		  ouvreArbre(artist);
		  showArtistOverview(artist);
		  return;
	  } else if(artist.hasOwnProperty("error")) {
			$("#tooltip_service_unavailable_error").fadeIn("fast");
			setTimeout(function() {
					$("#tooltip_service_unavailable_error").fadeOut("fast");
		        }, 3000);
	  }
	} else {
		$("#tooltip_input_artist_unknown").fadeIn("fast");
		setTimeout(function() {
				$("#tooltip_input_artist_unknown").fadeOut("fast");
	        }, 3000);
	}
	$("#button_artist").html("Add");
  }
  
  var ouvreArbre = function(artist) {
	  currentArtist = artist;
	  apiSimilarityDAO.getSimilars(artist, onGetSimilars);
  }
  
  var onGetSimilars = function(artists) {
	  if(artists != null) {
		  if(artists.length > 0) {
			// ajout (retard�) de l'artiste demand� par l'utilisateur (uniquement quand last.fm a r�pondu et s'il y a des similaires trouv�s)
			  if(retardedInputArtistToAdd != null) {
				  sys.addNode(apiSimilarityDAO.getArtistId(retardedInputArtistToAdd), retardedInputArtistToAdd);
				  if(inputIds.length === 1) { // si c'est le premier en input, on l'ajoute en CSArtistA
					  CSArtistA = retardedInputArtistToAdd.name;
					  CSArtistB = retardedInputArtistToAdd.name;
					  updateCSTitre();
				  }
				  if(help === 1) {
					  setTimeout(function() {
						  $("#tooltip_help_1").fadeIn("slow");
					    }, 2500);
					  help = 2;
				  }
				  $("#button_artist").html("Add");
				  retardedInputArtistToAdd = null;
			  }
			  epurateCSTree();// retrait des nodes qui ne sont pas input ou exploded
			  for(var n in artists) {
				  if(n < similarArtistsNumber) {
					  var similarArtist = artists[n];
					  similarArtist.distance = currentArtist.distance + 1;
					  if(similarArtist.distance > distanceMax) {
						  distanceMax = similarArtist.distance;
					  }
					  var similarId = apiSimilarityDAO.getArtistId(similarArtist),
			  			  currentArtistId = apiSimilarityDAO.getArtistId(currentArtist);
					  
					  similarArtist.isInput = ($.inArray(similarId, inputIds) >= 0);
					  similarArtist.isExploded = ($.inArray(similarId, explodedIds) >= 0);
					  currentArtist.isExploded = ($.inArray(currentArtistId, explodedIds) >= 0);
					  
					  sys.addNode(similarId, similarArtist);
					  if(sys.getEdges(similarId, currentArtistId).length === 0) {
						  sys.addEdge(currentArtistId, similarId);
					  }
				  }
			  }
			  if(help === 3) {
				  setTimeout(function() {
					  $("#tooltip_help_1").hide();
					  $("#tooltip_help_2").fadeIn("slow");
					  setTimeout(function() {
						  $("#tooltip_help_2").fadeOut("slow");
					    }, 7000);
				    }, 2000);
				  help = 4;
			  }
		  } else if(artists.hasOwnProperty("error")) {
			  $("#tooltip_service_unavailable_error").fadeIn("fast");
				setTimeout(function() {
						$("#tooltip_service_unavailable_error").fadeOut("fast");
			        }, 3000);
		  }
	  } else {
		  $("#tooltip_no_similars_error").fadeIn("fast");
			setTimeout(function() {
					$("#tooltip_no_similars_error").fadeOut("fast");
		        }, 3000);
	  }
  }
  
  var epurateCSTree = function() {
	  sys.eachNode(function(node, pt) {
			 if(($.inArray(node.name, inputIds) === -1) && ($.inArray(node.name, explodedIds) === -1)) {
				 sys.pruneNode(node);
			 }
		  });
  }
  
  var onClearTree = function() {
	  clearTree(false);
  }
  
  var clearTree = function(onlyTree) {
	  sys.eachNode(function(node, pt) {
		 sys.pruneNode(node); 
	  });
	  inputIds = new Array();
	  explodedIds = new Array();
	  currentArtist = null;
	  distanceMax = 0;
	  retardedInputArtistToAdd = null;
	  CSArtistA = "";
	  CSArtistB = "";
	  updateCSTitre();
	  if(!onlyTree) {
		  updateCSShare(null, null);  
	  }
	  $("#button_artist").html("Add");
  }
  
  var onContactSend = function() {
	  if(($("#input_contact_email").val() != "") || ($("#input_contact_message").val() != "")) {
		  $("#button_contact_send").hide();
		  
		  $.ajax({
				type: "GET",
				data: {time: new Date().getTime(),
						email: $("#input_contact_email").val(), 
						message: $("#input_contact_message").val()},
				url: "contact",
				success:onContactSent
				});
	  }
  }
  
  var onContactSent = function(data) {
	  $("#div_contact_message_sent").show();
	  $("#input_contact_email").val("");
	  $("#input_contact_message").val("");
	  
	  setTimeout(function() {
		  $("#div_contact_message_sent").fadeOut("fast");
		  setTimeout(function() {
			  $("#button_contact_send").show();
		    }, 500);
  	    }, 2000);
  }
  
  var updateCSTitre = function() {
	  if(CSArtistA != "" && CSArtistB != "") {
		  csDescription = "This map shows how to connect " + CSArtistA + " to " + CSArtistB;
		  $("#h_snake_description").html(csDescription);
		  if($("#div_cs_save_form").is(':hidden')) {
			  $("#button_cs_save").show();  
		  }
	  } else {
		  csDescription = "";
		  $("#h_snake_description").html("Expand your artist map");
		  $("#button_cs_save").hide();
	  }
  }
  
  var onCSSave = function(e) {
	  $("#button_cs_save").hide();
	  $("#div_cs_save_form").show();
	  setFocusOn("#input_cs_name");
  }
  
  var onCSSaveForm = function(e) {
	  if($("#input_cs_name").val() === "") {
		  $("#input_cs_name").css("border-color", "red");
	  } else {
		  $("#input_cs_name").css("border-color", "white");
		  $("#button_cs_save_form").hide();
		  $("#spinner_cs_save_form").show();
		  
		  var csJSON = getCrazySnakeJSON();
		  $.ajax({
				type: "POST",
				data: {time: new Date().getTime(),
						csName: $("#input_cs_name").val(), 
						csPseudo: $("#input_cs_pseudo").val(),
						csArtistA: CSArtistA,
						csArtistB: CSArtistB,
						csLength: csLength,
						csJSON: csJSON},
				url: "savecs",
				success:onCSSaved
				});
	  }
  }
  
  var getCrazySnakeJSON = function() {
	  var csData = {},
	  	  firstNode = sys.getNode(inputIds[0]);
	  savedCSArtists = new Array();
	  
	  csData.api = apiSimilarityDAO.getApiName();
	  csData.artistA = {};
	  csData.artistA.id = apiSimilarityDAO.getArtistId(firstNode.data);
	  csData.artistA.name = firstNode.data.name;
	  savedCSArtists.push(firstNode.data.name);
	  csData.artistA.isInput = true;
	  csData.artistA.isExploded = true;
	  csData.artistA.children = getCrazySnakeChildren(firstNode);
	  
	  // on enregistre aussi les infos complementaires de l'arbre
	  csData.inputIds = inputIds;
	  csData.explodedIds = explodedIds;
	  
	  csLength = getCSLength(csData.artistA, true);
	  
	  return JSON.stringify(csData);
  }
  
  var getCrazySnakeChildren = function(parentNode) {
	  var csChildren = new Array(),
	  	  childrenEdges = sys.getEdgesFrom(parentNode);
	  
	  if(childrenEdges.length <= 0) {
		  return null;
	  }
	  
	  for(var e in childrenEdges) {
		  var childNode = childrenEdges[e].target;
		  
		  var csChild = {};
		  csChild.id = apiSimilarityDAO.getArtistId(childNode.data);
		  csChild.name = childNode.data.name;
		  csChild.isInput = childNode.data.isInput;
		  csChild.isExploded = childNode.data.isExploded;
		  if(childNode.data.isExploded && ($.inArray(childNode.data.name, savedCSArtists) === -1)) {
			  savedCSArtists.push(childNode.data.name);
			  csChild.children = getCrazySnakeChildren(childNode);  
		  }
		  csChildren.push(csChild);
	  }
	  return csChildren;
  }
  
  var getCSLength = function(start, sumNeeded) {
	  var lengths = new Array();
	  if(start.children === null) {
		  return 0;
	  }
	  for(var n in start.children) {
		  if(start.children[n].hasOwnProperty("children")) {
			  lengths[n] = 1 + getCSLength(start.children[n], false);
		  } else {
			  lengths[n] = 1;
		  }
	  }
	  if(sumNeeded) {
		  // on fait la somme des deux plus grands
		  var grandA = Math.max.apply(null, lengths);
		  for(var n in lengths) { 
			  if(lengths[n] === grandA) {
				  lengths[n] = 0;
				  break;
			  }
		  }
		  var grandB = Math.max.apply(null, lengths);
		  return grandA + grandB;
	  } else {
		  return Math.max.apply(null, lengths);
	  }
  }
  
  var onCSSaved = function(data) {
	  $("#div_cs_save_form").hide();
	  $("#button_cs_save_form").show();
	  $("#spinner_cs_save_form").hide();
	  
	  var resp = jQuery.parseJSON(data);
	  if(resp.hasOwnProperty("csid")) {
		  $("#div_cs_saved").html("Your artist map has been successfully saved");
		  updateCSShare($("#input_cs_name").val(), resp.csid);
	  } else {
		  $("#div_cs_saved").html("An error occured... Retry more later please.");
	  }
	  $("#div_cs_saved").slideDown("fast");
	  updateCSPopularList();
  }
  
  var updateCSShare = function(title, csid) {
	  if(csid != null && title != null & csid != "" && title != "") {
		  $("#h_cs_share_title").html(title);
		  var csUrl = appUrl + "/?csid=" + csid;
		  window.history.pushState({csid: csid}, appTitle, "/?csid=" + csid);
		  $("#div_cs_url").val(csUrl);
		  if(!isShareShown) {
			  $("#div_cs_share").slideDown("fast");
			  isShareShown = true;
		  }
	  } else {
		  $("#div_cs_share").hide();
		  isShareShown = false;
	  }
  }
  
  var openTreeWithCSID = function(csid) {
	  clearTree(true);
	  
	  $.ajax({
			type: "GET",
			data: {time: new Date().getTime(),
					csid: csid},
			url: "getcs",
			success:onGetCrazySnake
			});
  }
  
  var onGetCrazySnake = function(data) {
	  var cs = jQuery.parseJSON(data);
	  if(cs.hasOwnProperty("crazySnake")) {
		  if(cs.crazySnake.hasOwnProperty("api") && apiSimilarityDAO.getApiName() != cs.crazySnake.api) {
			  initSimilarityAPI(cs.crazySnake.api);
		  } else {
			  if(apiSimilarityDAO.getApiName() != "lastfm") {
				  initSimilarityAPI("lastfm");  
			  }
		  }
		  CSArtistA = cs.artistA;
		  CSArtistB = cs.artistB;
		  inputIds = cs.crazySnake.hasOwnProperty("inputIds") ? cs.crazySnake.inputIds : cs.crazySnake.inputArtistsMbids;
		  explodedIds = cs.crazySnake.hasOwnProperty("explodedIds") ? cs.crazySnake.explodedIds : cs.crazySnake.explodedArtistsMbids;
		  
		  loadCSNode(cs.crazySnake.artistA, "");
		  
		  updateCSTitre();
		  updateCSShare(cs.name, cs.csid);
	  }
  }
  
  var loadCSNode = function(csNode, parentNodeName) {
	  var nodeData = {name: csNode.name,
			  	  	  id: csNode.hasOwnProperty("id") ? csNode.id : csNode.mbid,
			  	  	  mbid: csNode.hasOwnProperty("mbid") ? csNode.mbid : "",
			  	  	  isInput: csNode.isInput,
			  	  	  isExploded: csNode.isExploded};
	  
	  var nodeName = apiSimilarityDAO.getArtistId(nodeData);
	  
	  sys.addNode(nodeName, nodeData);

	  if(parentNodeName != "") {
		  sys.addEdge(parentNodeName, nodeName);
	  }
	  
	  if(csNode.hasOwnProperty("children") && csNode.children != null && csNode.children.length > 0) {
		  for(var n in csNode.children) {
			  loadCSNode(csNode.children[n], nodeName);
		  }
	  }
  }
  
  var updateCSPopularList = function() {
	  $("#div_cs_popular_list_scroll").html(theme.spinnerImgCode);
	  
	  $.ajax({
			type: "GET",
			data: {time: new Date().getTime(), max: 50},
			url: "getcslist",
			success:onGetCSPopularList
			});
  }
  
  var onGetCSPopularList = function(data) {
	  var csList = jQuery.parseJSON(data);
	  if(csList.hasOwnProperty("crazySnakeList")) {
		  var listHtml = "";
		  for(var n in csList.crazySnakeList) {
			  var cso = csList.crazySnakeList[n];
			  listHtml += "<div id=\"div_cs_popular_list_element_" + n + "\" class=\"cs_popular_list_element\">";
			  var nickname = (cso.nickname === "") ? "anonymous" : cso.nickname;
			  listHtml += "<span class=\"span_cs_popular_list_element_name\">" + cso.name + "</span> (by <span class=\"span_cs_popular_list_element_nickname\">" + nickname + "</span>)";
			  listHtml += "<span class=\"button_cs_popular_list_element_load\" data=\"" + cso.csid + "\">Load</span>";
			  listHtml += "<br/>";
			  listHtml += "from " + cso.artistA + " to " + cso.artistB;
			  listHtml += "</div>";
		  }
		  $("#div_cs_popular_list_scroll").html(listHtml);
		  $(".button_cs_popular_list_element_load").click(onCSLoad);
	  }
  }
  
  var onCSLoad = function(e) {
	  var csid = e.target.getAttribute("data", 1);
	  openTreeWithCSID(csid);
  }
  
  var onSocialShare = function(e) {
	  var socialNetwork = e.target.getAttribute("data", 1);
	  var thisurl = encodeURIComponent(window.location);
	  var pageDescription = "";
	  if(csDescription != "" && isShareShown) {
		  pageDescription = csDescription;
	  } else {
		  pageDescription = appDescription;
	  }
	  switch(socialNetwork) {
	  	case "facebook":
	  		window.open("https://www.facebook.com/sharer/sharer.php?u=" + thisurl, 'Share on Facebook', 'width=626,height=436');
	  		break;
	  	case "twitter":
	  		window.open("https://twitter.com/intent/tweet?text=" + ((csDescription != "") ? csDescription : "") + " " + thisurl,'','menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');
	  		break;
	  	case "plusone":
	  		window.open("https://plus.google.com/share?url=" + thisurl,'','menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');
	  		break;
	  	case "stumbleupon":
	  		window.open("http://www.stumbleupon.com/submit?url=" + thisurl,'','menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=820');
	  		break;
	  	case "reddit":
	  		window.open("http://reddit.com/submit?url=" + thisurl,'','menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
	  		break;
	  	case "delicious":
	  		window.open("http://delicious.com/save?v=5&provider=" + appTitle + "&noui&jump=close&url=" + thisurl + "&title=" + appTitle, "delicious","toolbar=no,width=550,height=550"); 
	  		break;
	  	case "pinterest":
	  		window.open("//pinterest.com/pin/create/button/?url=" + thisurl + "&media=" + encodeURIComponent(appCapture) + "&description=" + encodeURIComponent(pageDescription),'',"toolbar=no,width=550,height=550");
	  		break;
	  	case "tumblr":
		    window.open("http://www.tumblr.com/share/link?url=" + thisurl + "&name=" + encodeURIComponent(appTitle) + "&description=" + encodeURIComponent(pageDescription),'','menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
		    break;
	  	case "blogger":
	  		break;
	  	case "digg":
	  		window.open("http://digg.com/submit?phase=2&url=" + thisurl + "&title=" + appTitle + "&bodytext=" + encodeURIComponent(pageDescription) + "&topic=music",'','menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
	  		break;
	  	case "linkedin":
	  		window.open("http://www.linkedin.com/shareArticle?mini=true&url=" + thisurl + "&title=" + appTitle + "&source=" + appUrl,'',"toolbar=no,width=550,height=550");
	  		break;
	  	case "wordpress":
	  		break;
	  	default:
	  }
	  
  }
  
  var showArtistOverview = function(artist) {	  
	  $("#div_artist_overview").hide();
	  apiSimilarityDAO.getInfos(artist, onGetArtistInfo);
  }
  
  var onGetArtistInfo = function(data) {
	  if(data != null) {
		  $("#h3_artist_overview_name").html("About " + data.name);
		  $("#a_artist_overview_lien").attr("href", data.url);
		  var bio = replaceAll(data.bio, " href=", " target=\"_blank\" href=");
		  $("#span_artist_overview_description").html(bio);
		  $("#img_artist_overview_image").attr("src", data.image);
		  $("#span_artist_overview_tags").html(data.tags);
		  
		  // set div bottom depending of its height
		  /*var bottomValue = -$("#div_artist_overview").height() + 25;
		  $("#div_artist_overview").css("bottom", bottomValue + "px");*/

		  $("#div_artist_overview").fadeIn("fast");
	  }
  }
  
  var initSimilarityAPI=function(apiName) {
	  switch(apiName) {
	  	case "lastfm":
	  		apiSimilarityDAO = apiLastFM;
	  		break;
	  	case "spotify":
	  		apiSimilarityDAO = apiSpotify;
	  		break;
	  	case "amgsimilars":
	  	case "amginfluencers":
	  	case "amgfollowers":
	  	case "amgmoviesimilars":
	  	case "amgmovierelated":
	  		apiSimilarityDAO = apiAmg;
	  		break;
	  	default:
	  		apiSimilarityDAO = apiLastFM;
	  }
	  apiSimilarityDAO.init(similarArtistsNumber, soundParameter, proxyParameter, theme.spinnerImgCode, apiName);
  }
  
  var showWindows = function() {
	  if(!mobile) {
		  $("header").hide();
	  }
	  
	  $("#button_sound_volume").fadeIn("slow");
	  $("#div_more").show();
	  $("#div_bottom_left_tools").fadeIn("slow");
	  $("#div_crazy_snake").fadeIn("slow");
	  updateCSPopularList();
	  updateCSTitre();
	  
	  if(!mobile && !hiddenAd) {
		  $("#div_bottom_ad").show();
	  }
  }
  
  var onWindowResize=function(e) {
	  mobile = ($(window).width() < 640);
	  if(mobile) {
		  showWindows();
	  }
  }
  
  $(document).ready(function(){	  
	  jQuery.support.cors = true; // force cross-site scripting (as of jQuery 1.5)
	  onWindowResize(null);
	  
    $.ajax({
		type: "GET",
		url: "vue",
		data: {time: new Date().getTime(),
			   urlParameters: location.href}
	});
    
      $(window).resize(onWindowResize);
	  $("#button_artist").click(onArtistInput);
	  $("#input_artist").keypress(onInputArtistKeyPress);
	  $("#button_clear").click(onClearTree);
	  $("#button_contact_send").click(onContactSend);
	  $("#button_cs_save").click(onCSSave);
	  $("#button_cs_save_form").click(onCSSaveForm);
	  $(".span_social_share").click(onSocialShare);
	  $("#button_close_pub").click(function() {
		  $("#div_bottom_ad").hide();
		  hiddenAd = true;
	  });
	  
	  sys = arbor.ParticleSystem(1000, 100, 0.1) // create the system with sensible repulsion/stiffness/friction
	  sys.parameters({gravity:true}) // use center-gravity to make the graph settle nicely (ymmv)
	  sys.renderer = Renderer("#canvas") // our newly created renderer will have its .init() method called shortly by sys...
	
	  setFocusOn("#input_artist");
    
	var host = location.origin;
	if(host === "http://isoartistictree.appspot.com") {
		window.location.href = appUrl + location.search;
	}
    
    soundParameter = (getURLParameter("sound") === "off") ? false : true;
    proxyParameter = (getURLParameter("proxy") === "always") ? true : false;
    
    var similarArtistNumberParameter = getURLParameter("similar_number");
    if(similarArtistNumberParameter != "null") {
    	similarArtistsNumber = similarArtistNumberParameter;
    }
    
    var similarityAPIParameter = getURLParameter("api");
    if(similarityAPIParameter != "null") {
    	initSimilarityAPI(similarityAPIParameter);
    } else {
    	initSimilarityAPI("lastfm");
    }
    
    var csidParameter = getURLParameter("csid");
    if(csidParameter != "null") {
		showWindows();
    	openTreeWithCSID(csidParameter);
    } else {
        var artistParameter = getURLParameter("artist");
        if(artistParameter != "null") {
        	help = 4;
        	$("#input_artist").val(artistParameter);
    		showWindows();
        	createTree(artistParameter);
        } else {
        	$(".state_header_normal").toggleClass("state_header_start", true);
        	$(".state_div_input_artist_normal").toggleClass("state_div_input_artist_start", true);
        	
        	$("#div_voile").fadeIn();

            help = 1;
        }
    }
    
  })

})(this.jQuery);