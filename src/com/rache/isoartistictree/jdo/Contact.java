package com.rache.isoartistictree.jdo;

import java.util.Date;

import javax.jdo.annotations.IdGeneratorStrategy;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.Text;

@PersistenceCapable
public class Contact {
    @PrimaryKey
    @Persistent(valueStrategy = IdGeneratorStrategy.IDENTITY)
    private Key key;

    @Persistent
    private String email;
    
    @Persistent
    private Text message;
    
    @Persistent
    private Date date;
    
    @Persistent
    private Text browserInfos;
    
    public Contact() {
    	email = "";
    	message = new Text("");
    	browserInfos = new Text("");
    	date = null;
    }

	public Key getKey() {
		return key;
	}

	public void setKey(Key key) {
		this.key = key;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getMessage() {
		return message.getValue();
	}

	public void setMessage(String message) {
		this.message = new Text(message);
	}

	public Date getDate() {
		return date;
	}

	public void setDate(Date date) {
		this.date = date;
	}

	public String getBrowserInfos() {
		if(browserInfos != null) {
			return browserInfos.getValue();
		} else {
			return "";
		}
	}

	public void setBrowserInfos(String browserInfos) {
		this.browserInfos = new Text(browserInfos);
	}
}

