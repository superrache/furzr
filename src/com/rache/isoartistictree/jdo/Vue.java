package com.rache.isoartistictree.jdo;

import java.util.Date;

import javax.jdo.annotations.IdGeneratorStrategy;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

import com.google.appengine.api.datastore.Key;

@PersistenceCapable
public class Vue {

    @PrimaryKey
    @Persistent(valueStrategy = IdGeneratorStrategy.IDENTITY)
    private Key key;

    @Persistent
    private String adresseIp;
    
    @Persistent
    private Date date;
    
    @Persistent
    private String browserInfos;
	
    @Persistent
    private String language;
	
    @Persistent
    private String charset;
    
    @Persistent
    private String urlParameters;
    
    public Vue() {
    	this.adresseIp = "";
    	this.date = new Date();
    	this.browserInfos = "";
    	this.language = "";
    	this.charset = "";
    	this.urlParameters = "";
    }

	public Key getKey() {
		return key;
	}

	public void setKey(Key key) {
		this.key = key;
	}

	public String getAdresseIp() {
		return adresseIp;
	}

	public void setAdresseIp(String adresseIp) {
		this.adresseIp = adresseIp;
	}

	public Date getDate() {
		return date;
	}

	public void setDate(Date date) {
		this.date = date;
	}

	public String getBrowserInfos() {
		return browserInfos;
	}

	public void setBrowserInfos(String browserInfos) {
		this.browserInfos = browserInfos;
	}

	public String getLanguage() {
		return language;
	}

	public void setLanguage(String language) {
		this.language = language;
	}

	public String getCharset() {
		return charset;
	}

	public void setCharset(String charset) {
		this.charset = charset;
	}

	public String getUrlParameters() {
		return urlParameters;
	}

	public void setUrlParameters(String urlParameters) {
		this.urlParameters = urlParameters;
	}
}
