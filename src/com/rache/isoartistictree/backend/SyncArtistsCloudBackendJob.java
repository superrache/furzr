package com.rache.isoartistictree.backend;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.ProtocolException;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.logging.Logger;

import javax.jdo.PersistenceManager;
import javax.jdo.Query;

import com.rache.isoartistictree.core.BlobLogger;
import com.rache.isoartistictree.core.IBackendJob;
import com.rache.isoartistictree.core.PMF;
import com.rache.isoartistictree.jdo.ArtistInput;
import com.rache.isoartistictree.jdo.ArtistsCloud;

public class SyncArtistsCloudBackendJob implements IBackendJob {
	
	private static String NAME_PATTERN = "{\"name\":\"";
	
	private Map<String, String> correctionsMap;
	
	private BlobLogger log;
	
	private Logger logger;
	
	private String backendInfos = "";
	
	public SyncArtistsCloudBackendJob(Logger logger, String backendInfos) {
		this.logger = logger;
		this.backendInfos = backendInfos;
	}

	@Override
	public void initialiseJob() {
		log = new BlobLogger(logger, backendInfos + "-SyncArtistsCloud-init"); 
		log.info("initialisation");
		
		List<ArtistInput> artistInputs = getArtistInputList();
		log.info(artistInputs.size() + " artistes entrés");
		
		correctionsMap = new HashMap<String, String>();
		updateCorrectionsMap(artistInputs);
		
		Map<String, Integer> artistWeightsMap = getArtistWeights(artistInputs);
		
		generateAndSaveArtistCloudJSON(artistWeightsMap);
		
		log.finish();
	}

	@Override
	public void updateJob() {
		log = new BlobLogger(logger, backendInfos + "-SyncArtistsCloud-update"); 
		log.info("update");
		
		List<ArtistInput> artistInputs = getArtistInputList();
		log.info(artistInputs.size() + " artistes entrés");
		
		updateCorrectionsMap(artistInputs);
		
		Map<String, Integer> artistWeightsMap = getArtistWeights(artistInputs);
		
		generateAndSaveArtistCloudJSON(artistWeightsMap);
		
		log.finish();
	}

	@Override
	public void terminateJob() {

	}
	
	/**
	 * Fonction permettant de récupérer en base tous les éléments de la table ArtistInput
	 * @return la liste des ArtistInput
	 */
	private List<ArtistInput> getArtistInputList() {
		PersistenceManager pm = PMF.get().getPersistenceManager();
		
		Query query = pm.newQuery("select from " + ArtistInput.class.getName());
		
		@SuppressWarnings("unchecked")
		List<ArtistInput> artistInputs = (List<ArtistInput>)query.execute();
		pm.close();
		
		return artistInputs;
	}
	
	/**
	 * Méthode permettant de mettre à jour les corrections des noms d'artistes dans la Map globale correctionsMap
	 * @param artistInputs La liste des ArtistInput à synchroniser
	 */
	private void updateCorrectionsMap(List<ArtistInput> artistInputs) {
		String name;
		String correctedArtistName;
		int corriges = 0, unknown = 0;
		
		// corrections des noms
		for(ArtistInput ai : artistInputs) {
			name = ai.getArtistInput();
			
			if(!correctionsMap.containsKey(name)) {
				correctedArtistName = getArtistNameCorrection(name);
				corriges++;
				if(correctedArtistName != "") {
					correctionsMap.put(name, correctedArtistName);
				} else {
					unknown++;
				}
			}
		}
		log.info("correction de " + corriges + " noms, dont " + unknown + " non trouvés.");
	}
	
	/**
	 * Fonction permettant de corriger via Last.fm un nom d'artiste
	 * @param input Le nom d'artiste tapé à la rache
	 * @return Le nom d'artiste corrigé
	 */
	private String getArtistNameCorrection(String input) {
		if(input != null && !input.equals("")) {
			try {
				URL url = new URL("http://ws.audioscrobbler.com/2.0/?method=artist.search&artist=" + URLEncoder.encode(input, "UTF-8") + "&limit=1&page=1&api_key=a5ca8d5706cd79676a9b3e5748ba0848&format=json");
				HttpURLConnection connection = (HttpURLConnection)url.openConnection();
				connection.setDoInput(true);
				connection.setDoOutput(true);
				connection.setRequestMethod("GET");
				connection.setReadTimeout(10000);
				connection.setConnectTimeout(15000);
	
				log.info("sending " + url.toString());
				connection.connect();
				
				BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream())); // bloque et attend la réponse
				StringBuilder sb = new StringBuilder();
				String line = "";
				String json = "";
				
				while ((line = br.readLine()) != null)
		        {
		              sb.append(line);
		        }
				json = sb.toString();
				
				String tmp1[] = json.split("artistmatches");
				if(tmp1.length == 2) {
					int debut = tmp1[1].indexOf(SyncArtistsCloudBackendJob.NAME_PATTERN); // on cherche la première occurrence de ça (c'est le début du nom d'artiste
					if(debut > 0) {
						String tmp2 = tmp1[1].substring(debut + SyncArtistsCloudBackendJob.NAME_PATTERN.length());
						int fin = tmp2.indexOf('\"'); // fin du nom à la première apostrophe de tmp2
						if(fin > 0) {
							String artistName = tmp2.substring(0, fin);
							log.info(input + " > " + artistName);
							return artistName;
						}
					}
				}
			} catch(MalformedURLException e) {
				log.warning(e.toString());
			} catch(ProtocolException e) {
				log.warning(e.toString());
			} catch(IOException e) {
				log.warning(e.toString());
			} catch(NullPointerException e) {
				log.warning(e.toString());
			}
		}
		log.info((input != null ? input : "") + " > RIEN DU TOUT");
		return "";
	}
	
	/**
	 * Fonction permettant de récupérer les poids des artistes
	 * @param artistInputs La liste des ArtistInput
	 * @return Map associant nom d'artiste corrigé et nombre d'occurrences
	 */
	private Map<String, Integer> getArtistWeights(List<ArtistInput> artistInputs) {
		log.info("calcul des poids des artistes");
		
		Map<String, Integer> artistWeightsMap = new HashMap<String, Integer>();
		
		int poids;
		String name, correctedArtistName;
		// association des poids aux noms corrigés
		for(ArtistInput ai : artistInputs) {
			name = ai.getArtistInput();
			
			if(correctionsMap.containsKey(name)) {
				correctedArtistName = correctionsMap.get(name);
				if(artistWeightsMap.containsKey(correctedArtistName)) {
					poids = artistWeightsMap.get(correctedArtistName);
					artistWeightsMap.put(correctedArtistName, poids + 1);
				} else {
					artistWeightsMap.put(correctedArtistName, 1);
				}
			}
		}
		
		log.info("nombre d'artistes distincts: " + artistWeightsMap.size()); 
		
		return artistWeightsMap;
	}
	
	/**
	 * Méthode permettant de générer le JSON et de l'enregistrer en base
	 * @param artistWeightsMap La map du poids des artistes
	 */
	private void generateAndSaveArtistCloudJSON(Map<String, Integer> artistWeightsMap) {
		log.info("enregistrement du JSON");
		
		String json = "{\"artistsCloud\":{";
		int max = 0, poids = 0;
		String name, nameMax = "";
		
		for(Entry<String, Integer> entry : artistWeightsMap.entrySet()) {
		    name = entry.getKey();
		    poids = (int)entry.getValue();
		    if(poids > max) {
		    	max = poids;
		    	nameMax = name;
		    }
		    
		    json += "\"" + name + "\":" + poids + ",";
		}
		
		json += "\"POIDS_MAX\":" + max + "}}";
		
		log.info("poids max: " + max + " (" + nameMax + ")");
		
		PersistenceManager pm = PMF.get().getPersistenceManager();
		Query query = pm.newQuery("select from " + ArtistsCloud.class.getName());
		@SuppressWarnings("unchecked")
		List<ArtistsCloud> liste = (List<ArtistsCloud>)query.execute();
		
		ArtistsCloud artistsCloud;
		if(liste.size() > 0) {
			artistsCloud = liste.get(0);
			artistsCloud.setDate(new Date());
		} else {
			artistsCloud = new ArtistsCloud();
		}
		artistsCloud.setCloudJson(json);
		pm.makePersistent(artistsCloud);
		pm.close();
		log.info("JSON enregistré en base");
	}
}
