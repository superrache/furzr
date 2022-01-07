package com.rache.isoartistictree.servlet;

import java.io.IOException;

import javax.jdo.PersistenceManager;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.rache.isoartistictree.core.PMF;
import com.rache.isoartistictree.jdo.ArtistInput;

public class ArtistInputServlet extends HttpServlet {

	private static final long serialVersionUID = 9149454753141400710L;

	protected PersistenceManager pm;

	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
		
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("utf-8");
		
		String artistinput = req.getParameter("artistinput");
		
		pm = PMF.get().getPersistenceManager();
		
		ArtistInput artistInput = new ArtistInput();
		artistInput.setArtistInput(artistinput);
		
		pm.makePersistent(artistInput);
		pm.close();
		
		resp.getWriter().println("ok");	
	}
}
