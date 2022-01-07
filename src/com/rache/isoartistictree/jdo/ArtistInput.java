package com.rache.isoartistictree.jdo;

import java.util.Date;

import javax.jdo.annotations.IdGeneratorStrategy;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

import com.google.appengine.api.datastore.Key;
import com.rache.isoartistictree.utils.StringUtils;

@PersistenceCapable
public class ArtistInput {

    @PrimaryKey
    @Persistent(valueStrategy = IdGeneratorStrategy.IDENTITY)
    private Key key;

    @Persistent
    private String artistInput;

    @Persistent
    private Date date;
    
    public ArtistInput() {
    	artistInput = "";
    	date = new Date();
    }

	public Key getKey() {
		return key;
	}

	public void setKey(Key key) {
		this.key = key;
	}

	public String getArtistInput() {
		return artistInput;
	}

	public void setArtistInput(String artistInput) {
		this.artistInput = StringUtils.concat500(artistInput);
	}

	public Date getDate() {
		return date;
	}

	public void setDate(Date date) {
		this.date = date;
	}
    
    
}
