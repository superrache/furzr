package com.rache.isoartistictree.servlet;

import java.io.IOException;

import javax.jdo.PersistenceManager;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.rache.isoartistictree.core.PMF;
import com.rache.isoartistictree.dao.CrazySnakeDAO;
import com.rache.isoartistictree.jdo.CrazySnake;

public class GetCrazySnakeServlet extends HttpServlet {

	private static final long serialVersionUID = 2041645313542579712L;

	protected PersistenceManager pm;

	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
		
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("UTF-8");
		
		String csid = req.getParameter("csid");
		
		pm = PMF.get().getPersistenceManager();
		
		CrazySnake crazySnake = new CrazySnake();
		CrazySnakeDAO crazySnakeDao = new CrazySnakeDAO(pm);
		
		crazySnake = crazySnakeDao.getByCSID(csid);
		pm.close();
		
		if(crazySnake != null) {
			String respJSON = "{\"csid\":\""+ csid
					+ "\",\"name\":\"" + crazySnake.getNom() 
					+ "\",\"nickname\":\"" + crazySnake.getPseudo() 
					+ "\",\"artistA\":\"" + crazySnake.getArtistA() 
					+ "\",\"artistB\":\"" + crazySnake.getArtistB() 
					+ "\",\"crazySnake\":" + crazySnake.getCrazySnakeJSON() + "}";
			resp.getWriter().println(respJSON);
		} else {
			resp.getWriter().println("{\"error\":\"csid " + csid + " not found\"}");
		}
	}

}
