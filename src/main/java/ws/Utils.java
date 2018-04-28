/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
package ws;

import java.io.IOException;
import java.net.URL;
import java.text.MessageFormat;
import java.util.Enumeration;
import java.util.Properties;
import java.util.jar.Manifest;

public class Utils {

	public static String getVersion() {
		Manifest manifest = null;
		try {
			manifest = getManifest("Implementation-Vendor", "Uwe Voigt");
		} catch (Exception e) {
		}
		if (manifest == null)
			return null;
		String version = manifest.getMainAttributes().getValue("Implementation-Version");
		String timestamp = manifest.getMainAttributes().getValue("Build-Timestamp");
		return MessageFormat.format("Version: {0} Built: {1}", version, timestamp);
	}

	private static Manifest getManifest(String name, String value) throws IOException {
		Manifest manifest = lookupManifest(Utils.class.getClassLoader().getResources("META-INF/MANIFEST.MF"), name, value); //$NON-NLS-1$
		if (manifest != null)
			return manifest;
		manifest = lookupManifest(Thread.currentThread().getContextClassLoader().getResources("META-INF/MANIFEST.MF"), name, value); //$NON-NLS-1$
		if (manifest != null)
			return manifest;
		return lookupManifest(ClassLoader.getSystemResources("META-INF/MANIFEST.MF"), name, value); //$NON-NLS-1$
	}

	private static Manifest lookupManifest(Enumeration<URL> en, String attributeName, String value) throws IOException {
		while (en.hasMoreElements()) {
			Manifest manifest = new Manifest(en.nextElement().openStream());
			String attributeValue = manifest.getMainAttributes().getValue(attributeName);
			if (value.equals(attributeValue))
				return manifest;
		}
		return null;
	}

	public static Properties readProperties(String resource) {
		Properties properties = new Properties();
		try {
			properties.load(Utils.class.getResourceAsStream(resource));
		} catch (IOException e) {
		}
		return properties;
	}

	private Utils() {
	}
}