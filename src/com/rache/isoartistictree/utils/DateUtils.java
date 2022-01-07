package com.rache.isoartistictree.utils;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;

public class DateUtils {
	
	public static String timeZoneID = "Europe/Paris";

	public static String formatHeureDate(Date date) {
		return formatDateWithPattern(date, "HH:mm:ss dd/MM/yyyy");
	}

	public static String formatDate(Date date) {
		return formatDateWithPattern(date, "dd/MM/yyyy");
	}

	public static String formatHeureDateJoined(Date date) {
		return formatDateWithPattern(date, "ddMMyyyy-HHmmss");
	}
	
	public static String formatHeure(Date date) {
		return formatDateWithPattern(date, "HH:mm:ss");
	}
	
	public static String formatDateWithPattern(Date date, String pattern) {
		SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
		TimeZone timeZone = TimeZone.getTimeZone(timeZoneID);
		dateFormat.setTimeZone(timeZone);
		return dateFormat.format(date);
	}
	
	public static String formatHeure(int seconds) {
		int hours = seconds / 3600;
		int rest = seconds - hours * 3600;
		int minutes = rest / 60;
		int secondes = rest - minutes * 60;
		return String.valueOf(hours) + " heures " + String.valueOf(minutes) + " minutes et " + String.valueOf(secondes) + " secondes";
	}

}
