package com.rache.isoartistictree.core;

import java.io.PrintWriter;
import java.nio.channels.Channels;
import java.util.Date;
import java.util.logging.Logger;

import com.google.appengine.api.files.AppEngineFile;
import com.google.appengine.api.files.FileService;
import com.google.appengine.api.files.FileServiceFactory;
import com.google.appengine.api.files.FileWriteChannel;
import com.rache.isoartistictree.utils.DateUtils;

@SuppressWarnings("deprecation")
public class BlobLogger {
	
	private FileService fileService;
	
	private AppEngineFile file;
	
	private FileWriteChannel writeChannel;
	
	private PrintWriter out;
	
	private Logger logger;
	
	public BlobLogger(Logger logger, String init) {
		this.logger = logger;
		
		String mimeType = "text/plain";
		String filename = init + "-" + DateUtils.formatHeureDateJoined(new Date()) + ".txt";
		
		try {
			fileService= FileServiceFactory.getFileService();
			file = fileService.createNewBlobFile(mimeType, filename);
			boolean lock = true;
			writeChannel = fileService.openWriteChannel(file, lock);
			out = new PrintWriter(Channels.newWriter(writeChannel, "iso-8859-1"));
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	public String finish() {
		String path = "";
		try {
			out.close();
			writeChannel.closeFinally();
			path = file.getFullPath();
		} catch(Exception e) {
			e.printStackTrace();
		}
		return path;
	}
	
	public void info(String s) {
		write("I", s);
	}
	
	public void warning(String s) {
		write("W", s);
		logger.warning(s);
	}
	
	public void error(String s) {
		write("E", s);
		logger.severe(s);
	}
	
	private void write(String level, String s) {
		Date now = new Date();
		String line = "[" + level + "] " + DateUtils.formatHeureDate(now) + " " + s;
		writeLine(line);
	}
	
	private void writeLine(String line) {
		try {
			out.println(line);
		} catch(Exception e) {
			e.printStackTrace();
		}
	}
	
}
