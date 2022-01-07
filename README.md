**furzr** is an old project (2013) which was used some deprecated technologies:
* Server and hosting: Google App Engine (Java servlets)
* Client side: jQuery, arbor.js, d3.js
* Data: last.fm API, Rovi API and 7digital API

# furzr documentation #

## URL usage ##

### URL format: ###

http://furzr.net/?[<parameter>=<value>[&<parameter>=<value> ...]]

Parameters list:

 * **artist** Specify an artist name as a starting tree. Default is an empty tree.

 * **similar_number** Specify the number of similar artists of each tree growth. Default is 8.

 * **mode** Specify the starting mode. Allowed values are "htd" for the _huge tree of death_ mode and "cs" for the _crazy snake_ mode. Default is the _huge tree of death_ mode.

 * **csid** Specify a crazy snake identifier. The specified crazy snake is loaded as a starting tree and the _crazy snake_ mode is set. The two ends of the snake are expanded.

 * **sound** Specify if sound is on when starting the application. Possible values are "on" or "off". Default is "on".

 * **api** Specify the backend API to use for similarity data. Default is _lastfm_. Possible values are :

  * *lastfm* Last.fm with 7digital audio preview. 

  * *amgsimilars* Rovi music, similar artists.

  * *amginfluencers* Rovi music, influencer artists.

  * *amgfollowers* Rovi music, follower artists.

  * *amgmoviesimilars* Rovi movie, similar movies.

  * *amgmovierelated* Rovi movie, related movies.

Internal parameters list:

 * **proxy** Use the proxy to get previews URLs with 7digital. Default uses the proxy only when there is a cross-domain issue. Value to use it: "always". Last.fm calls never use proxy. Rovi Cloud Services calls always use proxy.


If the parameter _csid_ is specified, parameters _artist_ and _mode_ are ignored.

