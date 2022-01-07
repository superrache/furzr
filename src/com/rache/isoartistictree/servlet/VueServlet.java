package com.rache.isoartistictree.servlet;

import java.io.IOException;

import javax.jdo.PersistenceManager;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.rache.isoartistictree.core.PMF;
import com.rache.isoartistictree.jdo.Vue;


public class VueServlet extends HttpServlet {

	private static final long serialVersionUID = -2301850725035136060L;
	
	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
	
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("utf-8");
		
		PersistenceManager pm = PMF.get().getPersistenceManager();
		
		String adresseIp = req.getRemoteAddr();
		String browserInfos = req.getHeader("User-Agent");
		String language = req.getHeader("Accept-Language");
		String charset = req.getHeader("Accept-Charset");
		String urlParameters = req.getParameter("urlParameters");
		
		Vue vue = new Vue();
		vue.setAdresseIp(adresseIp);
		vue.setBrowserInfos(browserInfos);
		vue.setCharset(charset);
		vue.setLanguage(language);
		vue.setUrlParameters(urlParameters);
		
		pm.makePersistent(vue);
		pm.close();
	}
}
