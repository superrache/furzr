package com.rache.isoartistictree.servlet;

import java.io.IOException;
import java.util.List;

import javax.jdo.PersistenceManager;
import javax.jdo.Query;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.rache.isoartistictree.core.PMF;
import com.rache.isoartistictree.jdo.ArtistsCloud;

public class GetArtistsCloudServlet extends HttpServlet {
	
	private static final long serialVersionUID = 5343505269859476969L;
	
	protected PersistenceManager pm;

	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
		
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("utf-8");
		
		pm = PMF.get().getPersistenceManager();
		
		Query query = pm.newQuery("select from " + ArtistsCloud.class.getName());
		@SuppressWarnings("unchecked")
		List<ArtistsCloud> liste = (List<ArtistsCloud>)query.execute();
		
		if(liste.size() > 0) {
			ArtistsCloud artistsCloud = liste.get(0);
			resp.getWriter().println(artistsCloud.getCloudJson());
		} else {
			resp.getWriter().println("error");
		}
	}
}
