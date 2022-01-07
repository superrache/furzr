/**
 * Fonction d'erreur Ajax
 */
function ajaxError(xhr, ajaxOptions, thrownError, data) {
	if(xhr.status != 401) {
		$.ajax({
			type: "GET",
			data: {time: new Date().getTime(),
					email: "error_reporting", 
					message: xhr.status + " " + xhr.statusText + " " + thrownError + " " + JSON.stringify(data) + " " + xhr.responseText},
			url: "contact"
			});
	}
	return xhr.status;
}

/**
 * Fonction permettant de remplacer toutes les occurrences d'une chaine par une autre
 */
function replaceAll(txt, replace, with_this) {
	  return txt.replace(new RegExp(replace, 'g'),with_this);
}

/**
 * Fonction permettant de r�cup�rer la valeur d'un param�tre de l'URL
 * renvoie la chaine "null" si le param�tre est absent
 */
function getURLParameter(name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
}


/**
 * M�thode cross-browser pour mettre le focus sur un �l�ment input
 * @param expression jquery pour acc�der � l'�l�ment
 */
function setFocusOn(input) {
	// on met le focus sur l'input sauf si c'est safari (� v�rifier de temps en temps si le focus fait toujours disparaitre le placeholder sur safari)
	  var is_safari = (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') === -1);
	  if(!is_safari) {
		  $(input).focus();
	  }
 }

