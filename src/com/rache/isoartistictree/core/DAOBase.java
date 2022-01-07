package com.rache.isoartistictree.core;

import javax.jdo.PersistenceManager;

public class DAOBase {
	
	protected PersistenceManager pm;
	
	public DAOBase(PersistenceManager pm) {
		this.pm = pm;
	}
}
