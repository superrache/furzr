package com.rache.isoartistictree.jdo;

import java.util.Date;

import javax.jdo.annotations.IdGeneratorStrategy;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.Text;
import com.rache.isoartistictree.utils.StringUtils;

@PersistenceCapable
public class CrazySnake {

    @PrimaryKey
    @Persistent(valueStrategy = IdGeneratorStrategy.IDENTITY)
    private Key key;

    @Persistent
    private String csid; // identifiant du crazy snake
    
    @Persistent
    private Date date;
    
    @Persistent
    private String nom;
    
    @Persistent
    private String artistA;
    
    @Persistent
    private String artistB;
    
    @Persistent
    private int length;
    
    @Persistent
    private int rate;
    
    @Persistent
    private Text crazySnakeJSON;
    
    @Persistent
    private String pseudo;
    
    public CrazySnake() {
    	csid = "";
    	date = new Date();
    	nom = "";
    	artistA = "";
    	artistB = "";
    	length = 0;
    	rate = 0;
    	crazySnakeJSON = new Text("");
    	pseudo = "";
    }

	public Key getKey() {
		return key;
	}

	public void setKey(Key key) {
		this.key = key;
	}

	public String getCsid() {
		return csid;
	}

	public void setCsid(String csid) {
		this.csid = StringUtils.concat500(csid);
	}

	public Date getDate() {
		return date;
	}

	public void setDate(Date date) {
		this.date = date;
	}

	public String getNom() {
		return nom;
	}

	public void setNom(String nom) {
		this.nom = StringUtils.concat500(nom);
	}

	public String getArtistA() {
		return artistA;
	}

	public void setArtistA(String artistA) {
		this.artistA = StringUtils.concat500(artistA);
	}

	public String getArtistB() {
		return artistB;
	}

	public void setArtistB(String artistB) {
		this.artistB = StringUtils.concat500(artistB);
	}
	
	public int getLength() {
		return length;
	}

	public void setLength(int length) {
		this.length = length;
	}

	public int getRate() {
		return rate;
	}

	public void setRate(int rate) {
		this.rate = rate;
	}

	public String getCrazySnakeJSON() {
		return crazySnakeJSON.getValue();
	}

	public void setCrazySnakeJSON(String strCrazySnakeJSON) {
		this.crazySnakeJSON = new Text(strCrazySnakeJSON);
	}

	public String getPseudo() {
		return pseudo;
	}

	public void setPseudo(String pseudo) {
		this.pseudo = StringUtils.concat500(pseudo);
	}
    
    
}
