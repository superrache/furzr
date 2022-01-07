package com.rache.isoartistictree.utils;

import java.io.UnsupportedEncodingException;
import java.util.Properties;

import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.NoSuchProviderException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

public class SendMail {

	public static void sendMail(String subject, String msgBody) {
		try {
			Properties props = new Properties();
			Session session = Session.getDefaultInstance(props, null);

			Message msg = new MimeMessage(session);
			msg.setFrom(new InternetAddress("admin@isoartistictree.appspotmail.com", "isoartistictree contact"));
			msg.addRecipient(Message.RecipientType.TO,
							new InternetAddress("info@furzr.net", "Furzr administrator"));
			msg.setSubject(subject);
			msg.setContent(msgBody, "text/plain");
			
			Transport.send(msg);
			
		} catch (NoSuchProviderException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (MessagingException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (UnsupportedEncodingException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
}
