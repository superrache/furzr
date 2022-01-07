package com.rache.isoartistictree.dao;

import java.util.List;

import javax.jdo.PersistenceManager;
import javax.jdo.Query;

import org.apache.commons.lang.RandomStringUtils;

import com.rache.isoartistictree.core.DAOBase;
import com.rache.isoartistictree.jdo.CrazySnake;

public class CrazySnakeDAO extends DAOBase {

	public CrazySnakeDAO(PersistenceManager pm) {
		super(pm);
	}
	
	public void save(CrazySnake cs) {		
		try {
			pm.makePersistent(cs);
		} finally {
			
		}
	}
	
	public String generateNewCSID() {
		// génération d'un nouveau CSID avec contrôle d'unicité
		String newCSID = "";
		do {
			newCSID = RandomStringUtils.randomAlphanumeric(8);
		} while(getByCSID(newCSID) != null);
		return newCSID;
	}
	
	@SuppressWarnings("unchecked")
	public CrazySnake getByCSID(String csid) {
		Query query = pm.newQuery("select from " + CrazySnake.class.getName() + " where csid == csidParam parameters String csidParam");
		List<CrazySnake> crazySnakes = (List<CrazySnake>)query.execute(csid);
		if(crazySnakes.size() > 0) {
			return crazySnakes.get(0);
		} else {
			return null;
		}
	}
	
	@SuppressWarnings("unchecked")
	public List<CrazySnake> getPopularCSList(int maxNumber) {
		Query query = pm.newQuery("select from " + CrazySnake.class.getName() 
				+ " where length >= 5 order by length desc, rate desc, date desc");
		List<CrazySnake> crazySnakes = (List<CrazySnake>)query.execute();
		
		if(crazySnakes.size() > maxNumber) {
			return crazySnakes.subList(0, maxNumber - 1);
		} else {
			return crazySnakes;
		}
	}

}
