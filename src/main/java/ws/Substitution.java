/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
package ws;

import java.lang.reflect.Method;
import java.util.Properties;

import javax.servlet.ServletException;

public final class Substitution {

	public static class FilterDef {
		private String fToken;
		private String fReplacement;
		private Method fMethod;
		private FilterDef(String token, String replacement) {
			fToken = token;
			try {
				fMethod = Substitution.class.getMethod(replacement);
			} catch (NoSuchMethodException e) {
				fReplacement = replacement;
			}
		}
		public void filter(StringBuilder content) throws ServletException {
			for (int tokenIndex; (tokenIndex = content.indexOf(fToken)) != -1; ) {
				content.replace(tokenIndex, tokenIndex + fToken.length(), getReplacement());
			}
		}
		private String getReplacement() throws ServletException {
			try {
				return fMethod != null ? (String) fMethod.invoke(null) : fReplacement;
			} catch (Exception e) {
				throw new ServletException(e);
			}
		}
	}

	static Substitution INSTANCE = new Substitution();

	private final Properties fProperties;

	private Substitution() {
		fProperties = Utils.readProperties("/subst.properties");
	}

	public String getEntry(String key) {
		return fProperties.getProperty(key);
	}

	public FilterDef[] getFilters(String fileName) {
		FilterDef[] filterDefs = null;
		String filter = fProperties.getProperty(fileName + ".filter");
		if (filter == null) {
			int dotIndex = fileName.lastIndexOf(".");
			if (dotIndex != -1) {
				String suffix = fileName.substring(dotIndex + 1);
				filter = fProperties.getProperty(suffix + ".filter");
			}
		}
		if (filter != null) {
			String[] filters = filter.split(",");
			filterDefs = new FilterDef[filters.length];
			for (int i = 0; i < filters.length; i++) {
				String definition = fProperties.getProperty(filters[i].trim());
				String[] parts = definition.split("=");
				filterDefs[i] = new FilterDef(parts[0], parts.length > 1 ? parts[1] : "");
			}
		}
		return filterDefs;
	}
}
