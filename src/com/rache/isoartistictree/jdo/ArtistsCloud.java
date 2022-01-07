package com.rache.isoartistictree.jdo;

import java.util.Date;

import javax.jdo.annotations.IdGeneratorStrategy;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.Text;

@PersistenceCapable
public class ArtistsCloud {
	
    @PrimaryKey
    @Persistent(valueStrategy = IdGeneratorStrategy.IDENTITY)
    private Key key;
    
	private Text cloudJson;
	
	private Date date;
	
	public ArtistsCloud() {
		this.cloudJson = new Text("");
		this.date = new Date();
	}

	public Key getKey() {
		return key;
	}

	public void setKey(Key key) {
		this.key = key;
	}

	public String getCloudJson() {
		return cloudJson.getValue();
	}

	public void setCloudJson(String cloudJson) {
		this.cloudJson = new Text(cloudJson);
	}

	public Date getDate() {
		return date;
	}

	public void setDate(Date date) {
		this.date = date;
	}
}
