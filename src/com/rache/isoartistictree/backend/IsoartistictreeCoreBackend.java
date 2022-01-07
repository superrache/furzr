package com.rache.isoartistictree.backend;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Logger;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.appengine.api.LifecycleManager;
import com.google.appengine.api.LifecycleManager.ShutdownHook;
import com.google.appengine.api.ThreadManager;
import com.google.appengine.api.backends.BackendService;
import com.google.appengine.api.backends.BackendServiceFactory;
import com.rache.isoartistictree.core.BlobLogger;

@SuppressWarnings("deprecation")
public class IsoartistictreeCoreBackend extends HttpServlet {
	
	private static final long serialVersionUID = -5486098195244209866L;
	
	private static final Logger logger = Logger.getLogger(IsoartistictreeCoreBackend.class.getName());
	
	private static final long BACKEND_FREQUENCY = 24*3600*1000;
	
	private String backendInfos = "";
	
	final AtomicLong counter = new AtomicLong();
	
	private static Thread thread;
	
	private static ClassLoader cl;

	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		BackendService backendsApi = BackendServiceFactory.getBackendService();

		String currentBackendName = backendsApi.getCurrentBackend();
		int currentInstance = backendsApi.getCurrentInstance();
		backendInfos = currentBackendName + "-" + currentInstance;
		
		BlobLogger log;
		String url = "";

		log = new BlobLogger(logger, backendInfos);
		log.info("starting ...");
		
		ShutdownHook shutdownHook = new ShutdownHook() {
			@Override
			public void shutdown() {
				thread.interrupt();
				LifecycleManager.getInstance().interruptAllRequests();
			}
		};
		LifecycleManager.getInstance().setShutdownHook(shutdownHook);

		cl = getClass().getClassLoader();
		thread = ThreadManager.createBackgroundThread(getBackgroundThread());
		thread.start();
		
		if(thread.isAlive()) {
			log.info("core thread is running");
		}
		
		url = log.finish();
		
		String endWord = "Backend launched. More logs in blob file : " + url;
		logger.warning(endWord);
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("iso-8859-1");
		resp.getWriter().println(endWord);
	}
	
	private Runnable getBackgroundThread() {
		return new Runnable() {
			public void run() {
				thread.setContextClassLoader(cl);
				
				//SyncArtistsCloudBackendJob syncArtistsCloudBackendJob = new SyncArtistsCloudBackendJob(logger, backendInfos);
				//syncArtistsCloudBackendJob.initialiseJob();
						
				try {
					while (true) {
						counter.incrementAndGet();
					    Thread.sleep(IsoartistictreeCoreBackend.BACKEND_FREQUENCY);
					    //syncArtistsCloudBackendJob.updateJob();
					}
				} catch (InterruptedException ex) {
					ex.printStackTrace();
				} finally {
					//syncArtistsCloudBackendJob.terminateJob();
				}
			}
		};
	}

}

	