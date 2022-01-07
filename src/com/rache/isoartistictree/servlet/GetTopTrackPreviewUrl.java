package com.rache.isoartistictree.servlet;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.ProtocolException;
import java.net.URL;
import java.net.URLEncoder;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

public class GetTopTrackPreviewUrl extends HttpServlet {

	private static final long serialVersionUID = -8159841934993453843L;

	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
	
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("utf-8");
		
		String q = req.getParameter("q");
		
		try {
			URL url = new URL("http://api.7digital.com/1.2/track/search?q=" + URLEncoder.encode(q,"utf-8") + "&oauth_consumer_key=7d2kx6pbdwyv&pagesize=1");
			HttpURLConnection connection = (HttpURLConnection)url.openConnection();
			connection.setDoInput(true);
			connection.setDoOutput(true);
			connection.setRequestMethod("GET");
			connection.setReadTimeout(10000);
			connection.setConnectTimeout(15000);
			connection.connect();
			
			Document doc = parseXML(connection.getInputStream());
			NodeList tracks = doc.getElementsByTagName("track");
			Node trackNode = tracks.item(0);
			Element trackElement = (Element)trackNode;
			String trackId = trackElement.getAttribute("id");
			
			NodeList trackNodes = trackNode.getChildNodes();
			String artistName = "",
					trackInfosUrl = "",
					trackTitle = "",
					albumTitle = "";
			for(int i = 0; i < trackNodes.getLength(); i++) {
				Node node = trackNodes.item(i);
				if("artist".equals(node.getNodeName())) {
					artistName = node.getFirstChild().getTextContent();
				} else if("release".equals(node.getNodeName())) {
					albumTitle = node.getFirstChild().getTextContent();
				} else if("url".equals(node.getNodeName())) {
					trackInfosUrl = node.getTextContent();
				} else if("title".equals(node.getNodeName())) {
					trackTitle = node.getTextContent();
				}
			}
			
			url = new URL("http://api.7digital.com/1.2/track/preview?trackid=" + trackId + "&oauth_consumer_key=7d2kx6pbdwyv&redirect=false");
			connection = (HttpURLConnection)url.openConnection();
			connection.setDoInput(true);
			connection.setDoOutput(true);
			connection.setRequestMethod("GET");
			connection.setReadTimeout(10000);
			connection.setConnectTimeout(15000);
			connection.connect();
			
			doc = parseXML(connection.getInputStream());
			NodeList urlNode = doc.getElementsByTagName("url");
			String previewUrl = urlNode.item(0).getTextContent();
			
			String respJSON = "{\"url\":\"" + previewUrl +
							"\",\"artistName\":\"" + artistName +
							"\",\"trackUrl\":\"" + trackInfosUrl +
							"\",\"trackTitle\":\"" + trackTitle +
							"\",\"albumTitle\":\"" + albumTitle +
							"\"}";
			resp.getWriter().println(respJSON);
			
		} catch(MalformedURLException e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		} catch(ProtocolException e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		} catch(IOException e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		} catch(NullPointerException e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		} catch(Exception e) {
			resp.getWriter().println("{\"error\":\"0\"}");
		}
	}
	
	private Document parseXML(InputStream stream) throws Exception
    {
        DocumentBuilderFactory objDocumentBuilderFactory = null;
        DocumentBuilder objDocumentBuilder = null;
        Document doc = null;
        try
        {
            objDocumentBuilderFactory = DocumentBuilderFactory.newInstance();
            objDocumentBuilder = objDocumentBuilderFactory.newDocumentBuilder();

            doc = objDocumentBuilder.parse(stream);
        }
        catch(Exception ex)
        {
            throw ex;
        }       

        return doc;
    }
}
