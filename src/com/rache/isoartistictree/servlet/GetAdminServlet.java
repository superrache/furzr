package com.rache.isoartistictree.servlet;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.ProtocolException;
import java.net.URL;
import java.util.List;

import javax.jdo.PersistenceManager;
import javax.jdo.Query;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.rache.isoartistictree.core.PMF;
import com.rache.isoartistictree.jdo.ArtistInput;
import com.rache.isoartistictree.jdo.Contact;
import com.rache.isoartistictree.jdo.ErrorReporting;
import com.rache.isoartistictree.jdo.Vue;
import com.rache.isoartistictree.utils.DateUtils;

public class GetAdminServlet extends HttpServlet {

	private static final long serialVersionUID = -6989111537600318797L;

	protected PersistenceManager pm;
	String adresseIP = "";
	
	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
	
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		adresseIP = req.getRemoteAddr();
		String noDB = req.getParameter("nodb");
		String vueMaxParam = req.getParameter("vue");
		String artistMaxParam = req.getParameter("artist");
		String contactMaxParam = req.getParameter("contact");
		String errorMaxParam = req.getParameter("error");
		
		int vueMax = 20;
		int artistMax = 20;
		int contactMax = 10;
		int errorMax = 10;
		
		if(vueMaxParam != null) {
			vueMax = Integer.parseInt(vueMaxParam);
		}
		if(artistMaxParam != null) {
			artistMax = Integer.parseInt(artistMaxParam);
		}
		if(contactMaxParam != null) {
			contactMax = Integer.parseInt(contactMaxParam);
		}
		if(errorMaxParam != null) {
			errorMax = Integer.parseInt(errorMaxParam);
		}
		
		String html = "<!DOCTYPE html PUBLIC \"-//IETF//DTD HTML 2.0//EN\"><html><head>";
		html += "<link rel=\"stylesheet\" type=\"text/css\" href=\"http://isoartistictree.appspot.com/admin/admin.css\"/>";
		html += "<link rel=\"stylesheet\" type=\"text/css\" href=\"http://localhost:8888/admin/admin.css\"/>";
		html += "<title>furzr administration</title></head><body><h1>furzr administration page</h1>";
		html += "Timezone used: " + DateUtils.timeZoneID + "<br/>";
		
		html += displaySevenDigitalApiState();

		if(noDB == null || !noDB.equals("1")) {
			pm = PMF.get().getPersistenceManager();
			
			html += displayVueInfos(vueMax);
			
			html += displayArtistInfos(artistMax);
			
			html += displayContactInfos(contactMax);
			
			html += displayErrorInfos(errorMax);
			
			pm.close();
		}
		
		html += "</body></html>";
		resp.setContentType("text/html");
		resp.setCharacterEncoding("utf-8");
		resp.getWriter().append(html);
	}
	
	@SuppressWarnings("unchecked")
	private String displayVueInfos(int max) {
		Query query = pm.newQuery("select from " + Vue.class.getName() + " order by date desc");
		query.setRange(0, max);
		
		List<Vue> vues = (List<Vue>)query.execute();
		
		String vueInfos = "<h2>" + max + " dernières connexions</h2><table><tr><th>Date</th><th>IP</th><th>URL Parameters</th><th>Languages</th><th>Charset</th><th>Browser</th></tr>";
		
		for(Vue vue : vues) {
			vueInfos += "<tr" + (adresseIP.equals(vue.getAdresseIp()) ? " class=\"tr_me\"" : "") + "><td>" + DateUtils.formatHeureDate(vue.getDate()) + "</td><td>" + vue.getAdresseIp() + "</td><td>" + vue.getUrlParameters() + "</td><td>" + vue.getLanguage() + "</td><td>" + vue.getCharset() + "</td><td>" + vue.getBrowserInfos() + "</td></tr>";
		}

		vueInfos += "</table>";
		return vueInfos + "<br/>";
	}
	
	@SuppressWarnings("unchecked")
	private String displayArtistInfos(int max) {
		Query query = pm.newQuery("select from " + ArtistInput.class.getName() + " order by date desc");
		query.setRange(0, max);
		
		List<ArtistInput> artistInputs = (List<ArtistInput>)query.execute();
		
		String artistInfos = "<h2>" + max + " derniers artistes recherchés</h2><table><tr><th>Date</th><th>Recherche</th></tr>";
		
		for(ArtistInput artistInput : artistInputs) {
			artistInfos += "<tr><td>" + DateUtils.formatHeureDate(artistInput.getDate()) + "</td><td>" + artistInput.getArtistInput() + "</td></tr>";
		}
		
		artistInfos += "</table>";
		return artistInfos + "<br/>";
	}
	
	@SuppressWarnings("unchecked")
	private String displayContactInfos(int max) {
		Query query = pm.newQuery("select from " + Contact.class.getName() + " order by date desc");
		query.setRange(0, max);
		
		List<Contact> contacts = (List<Contact>)query.execute("error_reporting");
		
		String contactInfos = "<h2>" + max + " derniers messages</h2><table><tr><th>Date</th><th>Email</th><th>Message</th><th>User infos</th></tr>";
		
		for(Contact contact : contacts) {
			if(!contact.getEmail().equals("error_reporting")) {
				contactInfos += "<tr><td>" + DateUtils.formatHeureDate(contact.getDate()) + "</td><td>" + contact.getEmail() + "</td><td>" + contact.getMessage() + "</td><td>" + contact.getBrowserInfos() + "</td></tr>";
			}
		}

		contactInfos += "</table>";
		return contactInfos + "<br/>";
	}
	
	@SuppressWarnings("unchecked")
	private String displayErrorInfos(int max) {
		Query query = pm.newQuery("select from " + ErrorReporting.class.getName() + " order by date desc");
		query.setRange(0, max);
		
		List<ErrorReporting> errors = (List<ErrorReporting>)query.execute();
		
		String errorInfos = "<h2>" + max + " dernières erreurs</h2><table><tr><th>Date</th><th>Error infos</th><th>User infos</th></tr>";
		
		for(ErrorReporting error : errors) {
			errorInfos += "<tr><td>" + DateUtils.formatHeureDate(error.getDate()) + "</td><td>" + error.getMessage() + "</td><td>" + error.getBrowserInfos() + "</td></tr>";
		}

		errorInfos += "</table>";
		return errorInfos + "<br/>";
	}
	
	private String displaySevenDigitalApiState() {
		String apiState = "<h2>7Digital Api</h2>";
		String apiStatus = "";
		String apiLimit = "";
		String apiCurrent = "";
		String apiReset = "";
		
		try {
			URL url = new URL("http://api.7digital.com/1.2/artist/search?q=lady+gaga&oauth_consumer_key=7d2kx6pbdwyv&pagesize=1");
			HttpURLConnection connection = (HttpURLConnection)url.openConnection();
			connection.setDoInput(true);
			connection.setDoOutput(true);
			connection.setRequestMethod("GET");
			connection.setUseCaches(false);
			connection.setReadTimeout(10000);
			connection.setConnectTimeout(15000);
			
			connection.connect();
			
			apiStatus = String.valueOf(connection.getResponseCode());
			
			String rateLimit = connection.getHeaderField("X-RateLimit-Limit");
			if(rateLimit != null) {
				apiLimit = rateLimit;
			}
			
			String rateCurrent = connection.getHeaderField("X-RateLimit-Current");
			if(rateCurrent != null) {
				apiCurrent = rateCurrent;
			}
			
			String rateReset = connection.getHeaderField("X-RateLimit-Reset");
			if(rateReset != null) {
				int resetSeconds = Integer.parseInt(rateReset);
				apiReset = resetSeconds + " secondes, soit " + DateUtils.formatHeure(resetSeconds);
			}
			
		} catch(MalformedURLException e) {
			apiState = e.toString();
		} catch(ProtocolException e) {
			apiState = e.toString();
		} catch(IOException e) {
			apiState = e.toString();
		} catch(NullPointerException e) {
			apiState = e.toString();
		}
		
		apiState += "State: " + apiStatus + "<br/>";
		apiState += "Limit: " + apiLimit + "<br/>";
		apiState += "Current: " + apiCurrent + "<br/>";
		apiState += "Reset: " + apiReset + "<br/>";
		return apiState + "<br/>";
	}
}
