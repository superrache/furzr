package com.rache.isoartistictree.servlet;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.ProtocolException;
import java.net.URL;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Calendar;
import java.util.TimeZone;
import java.util.logging.Logger;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class AMGProxyServlet extends HttpServlet {
	
	private static final long serialVersionUID = 9191267171304863730L;
	
	private String apiKey = "cavfhagkvhmzkbtkuc36trzm";
	private String apiSharedSecret = "8MDVf2aRwu";
	
	private static final Logger log = Logger.getLogger(AMGProxyServlet.class.getName());
	
	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
	
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("utf-8");
		
		String dataType = req.getParameter("datatype");
		String method = req.getParameter("method");
		String name = req.getParameter("name");
		String id = req.getParameter("id");
		String number = req.getParameter("number");
		String localisation = req.getParameter("local");
		
		name = formatParameter(name);
		id = formatParameter(id);

		try {
			String surl = "http://api.rovicorp.com/";
			String commonParameters = "?apikey=" + apiKey + "&sig=" + getSig() + "&format=json&";
			commonParameters += getLocalisationParameters(localisation);
			if(method.equals("getcorrection")) {
				if(dataType.startsWith("amgmovie")) {
					surl += "data/v1.1/movie/info" + commonParameters + "movie=" + name + "&imagecount=0";
				} else {
					surl += "data/v1.1/name/info" + commonParameters + "name=" + name + "&imagecount=0";
				}
			} else if(method.equals("getsimilars")) {
				if(dataType.startsWith("amgsimilars")) {
					surl += "data/v1.1/name/similars" + commonParameters + "nameid=" + id + "&count=" + number;
				} else if(dataType.startsWith("amginfluencers")) {
					surl += "data/v1.1/name/influencers" + commonParameters + "nameid=" + id + "&count=" + number;
				} else if(dataType.startsWith("amgfollowers")) {
					surl += "data/v1.1/name/followers" + commonParameters + "nameid=" + id + "&count=" + number;
				} else if(dataType.startsWith("amgmovie")) {
					surl += "data/v1.1/movie/related" + commonParameters + "movieid=" + id + "&count=" + number;
				}
			} else if(method.equals("getinfos")) {
				if(dataType.startsWith("amgmovie")) {
					surl += "data/v1.1/movie/info" + commonParameters + "movieid=" + id + "&imagecount=1&include=images,synopsis";
				} else {
					surl += "data/v1.1/name/info" + commonParameters + "nameid=" + id + "&imagecount=1&include=images";
				}
			}

			URL url = new URL(surl);
			HttpURLConnection connection = (HttpURLConnection)url.openConnection();
			connection.setDoInput(true);
			connection.setDoOutput(true);
			connection.setRequestMethod("GET");
			connection.setReadTimeout(10000);
			connection.setConnectTimeout(15000);
			connection.connect();
			int code = connection.getResponseCode();
			
			switch(code) {
				case 200:
				case 201:
				case 304:
					resp.getWriter().println(getResponse(connection));
					break;
				default:
					String response = getResponse(connection);
					if(response.startsWith("{\"status\":\"error\",\"code\":404")) {
						resp.getWriter().println(response);						
					} else  {
						resp.getWriter().println("{\"error\":\"http error " + code + "\"}");
					}
			}
			
		} catch(MalformedURLException e) {
			resp.getWriter().println("{\"error\":\"" + e.getMessage() + "\"}");
			log.severe(e.getMessage());
		} catch(ProtocolException e) {
			resp.getWriter().println("{\"error\":\"" + e.getMessage() + "\"}");
			log.severe(e.getMessage());
		} catch(IOException e) {
			resp.getWriter().println("{\"error\":\"" + e.getMessage() + "\"}");
			log.severe(e.getMessage());
		} catch(NullPointerException e) {
			resp.getWriter().println("{\"error\":\"" + e.getMessage() + "\"}");
			log.severe(e.getMessage());
		} catch(Exception e) {
			resp.getWriter().println("{\"error\":\"" + e.getMessage() + "\"}");
			log.severe(e.getMessage());
		}
	}
	
	private String getSig() throws NoSuchAlgorithmException {
		Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
		long ts = cal.getTime().getTime() / 1000;
		String c = apiKey + apiSharedSecret + ts;
		byte[] b = c.getBytes();
		byte[] hash = MessageDigest.getInstance("MD5").digest(b);

		StringBuilder hashString = new StringBuilder();
		for (int i = 0; i < hash.length; i++)
		{
		        String hex = Integer.toHexString(hash[i]);
		        if (hex.length() == 1)
		        {
		                hashString.append('0');
		                hashString.append(hex.charAt(hex.length() - 1));
		        }
		        else
		                hashString.append(hex.substring(hex.length() - 2));
		}
		return hashString.toString();
	}
	
	private String getResponse(HttpURLConnection connection) throws IOException {
		BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream()));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            sb.append(line+"\n");
        }
        br.close();
		return sb.toString();
	}
	
	private String formatParameter(String param) {
		if(param != null) {
			return param.replaceAll("\\s", "+");
		} else {
			return null;
		}
	}
	
	private String getLocalisationParameters(String localisation) {
		return "country=" + localisation.substring(3,5) + "&language=" + localisation.substring(0,2) + "&";
	}
}
