package com.rache.isoartistictree.servlet;

import java.io.IOException;
import java.util.Date;

import javax.jdo.PersistenceManager;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.rache.isoartistictree.core.PMF;
import com.rache.isoartistictree.jdo.Contact;
import com.rache.isoartistictree.jdo.ErrorReporting;
import com.rache.isoartistictree.utils.DateUtils;
import com.rache.isoartistictree.utils.SendMail;

public class ContactServlet extends HttpServlet {

	private static final long serialVersionUID = -2990417030012381383L;

	protected PersistenceManager pm;

	public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		doGet(req, resp);
	}
	
	public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		
		resp.setContentType("text/plain");
		resp.setCharacterEncoding("utf-8");
		
		String email = req.getParameter("email");
		String message = req.getParameter("message");
		String browserInfos = req.getRemoteAddr() + " " + req.getHeader("User-Agent") + ". Languages: " + req.getHeader("Accept-Language") + ". Charsets: " + req.getHeader("Accept-Charset");
		
		if(email.equals("error_reporting")) {
			pm = PMF.get().getPersistenceManager();
			
			ErrorReporting error = new ErrorReporting();
			
			error.setDate(new Date());
			error.setMessage(message);
			error.setBrowserInfos(browserInfos);
			
			pm.makePersistent(error);
			pm.close();
		} else {
			if(!email.equals("") || !message.equals("")) {
				pm = PMF.get().getPersistenceManager();
				
				Contact contact = new Contact();
				Date date = new Date();
				contact.setDate(date);
				contact.setEmail(email);
				contact.setMessage(message);
				contact.setBrowserInfos(browserInfos);
				
				pm.makePersistent(contact);
				pm.close();
				
				String msgBody = "Un utilisateur a laissé un message, " + DateUtils.formatHeureDate(date) + "\n\rSon adresse mail : " + email + "\n\rSon message : " + message;
				SendMail.sendMail("message contact", msgBody);
			}
		}
		
		resp.getWriter().println("ok");	
	}
}
