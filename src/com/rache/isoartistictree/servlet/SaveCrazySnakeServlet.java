package com.rache.isoartistictree.servlet;

import java.io.IOException;

import javax.jdo.PersistenceManager;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.rache.isoartistictree.core.PMF;
import com.rache.isoartistictree.dao.CrazySnakeDAO;
import com.rache.isoartistictree.jdo.CrazySnake;

public class SaveCrazySnakeServlet extends HttpServlet {

	private static final long serialVersionUID = 8544230281130023850L;

	protected PersistenceManager pm;

	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
		
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("utf-8");
		
		String csName = req.getParameter("csName");
		String csPseudo = req.getParameter("csPseudo");
		String csArtistA = req.getParameter("csArtistA");
		String csArtistB = req.getParameter("csArtistB");
		String csJSON = req.getParameter("csJSON");
		int csLength = Integer.parseInt(req.getParameter("csLength"));
		
		pm = PMF.get().getPersistenceManager();
		
		CrazySnake crazySnake = new CrazySnake();
		CrazySnakeDAO crazySnakeDao = new CrazySnakeDAO(pm);
		
		crazySnake.setCsid(crazySnakeDao.generateNewCSID());
		crazySnake.setNom(csName);
		crazySnake.setPseudo(csPseudo);
		crazySnake.setArtistA(csArtistA);
		crazySnake.setArtistB(csArtistB);
		crazySnake.setCrazySnakeJSON(csJSON);
		crazySnake.setLength(csLength);
		crazySnake.setRate(5);
		
		crazySnakeDao.save(crazySnake);
		
		pm.close();
		
		resp.getWriter().println("{\"csid\":\"" + crazySnake.getCsid() + "\"}");
	}

}


