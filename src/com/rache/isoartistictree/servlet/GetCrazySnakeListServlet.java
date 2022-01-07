package com.rache.isoartistictree.servlet;

import java.io.IOException;
import java.util.List;

import javax.jdo.PersistenceManager;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.rache.isoartistictree.core.PMF;
import com.rache.isoartistictree.dao.CrazySnakeDAO;
import com.rache.isoartistictree.jdo.CrazySnake;

public class GetCrazySnakeListServlet extends HttpServlet {

	private static final long serialVersionUID = 9196050765921455484L;

	protected PersistenceManager pm;

	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
		
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("utf-8");
		
		int max = Integer.parseInt(req.getParameter("max"));
		
		pm = PMF.get().getPersistenceManager();
		
		CrazySnakeDAO crazySnakeDao = new CrazySnakeDAO(pm);
		
		List<CrazySnake> crazySnakes = crazySnakeDao.getPopularCSList(max);

		pm.close();
		
		String respJSON = "{\"crazySnakeList\":[";
		boolean first = true;
		
		for(CrazySnake crazySnake : crazySnakes) {
			if(!first) {
				respJSON += ",";
			}
			first = false;
			respJSON += "{\"csid\":\"" + crazySnake.getCsid()
						+ "\",\"name\":\"" + crazySnake.getNom() 
						+ "\",\"nickname\":\"" + crazySnake.getPseudo() 
						+ "\",\"artistA\":\"" + crazySnake.getArtistA() 
						+ "\",\"artistB\":\"" + crazySnake.getArtistB() 
						+ "\"}";
		}
		
		respJSON += "]}";
		resp.getWriter().println(respJSON);
	}
}
