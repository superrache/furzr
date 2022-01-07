package com.rache.isoartistictree.utils;

public class StringUtils {

	public static String concat500(String str) {
		if(str != null && str.length() > 500) {
			return str.substring(0, 499);
		} else {
			return str;
		}
	}
}
