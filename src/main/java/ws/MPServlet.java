/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
package ws;

import java.io.IOException;
import java.io.PrintWriter;
import java.net.URI;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Calendar;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObjectBuilder;
import javax.json.JsonValue;
import javax.json.spi.JsonProvider;
import javax.naming.InitialContext;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;

/**
 * Highscore for Blast!
 */
@WebServlet("/mp")
public class MPServlet extends HttpServlet {

	private enum Command {
		listHighscore,
		saveHighscore,
	}
	
	private static final long serialVersionUID = 1L;

	private static final Logger LOG = Logger.getLogger(MPServlet.class.getName());

	private static final int MAX_NAME_LENGTH = 20;

	private static final int MAX_HIGHSCORE_LINES = 9;

	private static final int LAST_PERIOD = 10;

	private static final String X_PID = "X-Pid";

	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		try {
			Map<String, String> params = prepareParameters(request);
			Command command;
			try {
				command = Command.valueOf(params.remove("c"));
			} catch (Exception e) {
				// ignore that
				return;
			}
			JsonValue result = handleCommand(request, response, command, params);
			response.setCharacterEncoding("UTF8");
			response.setContentType("application/json");
			PrintWriter out = response.getWriter();
			out.print(result.toString());
			out.close();
		} catch (Exception e) {
			throw new ServletException(e);
		}
	}

	private Map<String, String> prepareParameters(HttpServletRequest request) {
		Map<String, String> map = new HashMap<String, String>();
		for (Enumeration<String> en = request.getParameterNames(); en.hasMoreElements();) {
			String name = en.nextElement();
			map.put(name, request.getParameter(name));
		}
		return map;
	}

	private JsonValue handleCommand(HttpServletRequest request, HttpServletResponse response, Command command,
			Map<String, String> param) throws Exception {
		switch (command) {
		default:
			throw new IllegalArgumentException("Unhandled command");
		case listHighscore:
			return listHighscore(request, response, param.get("a") != null ? null : LAST_PERIOD, request.getHeader(X_PID) != null);
		case saveHighscore:
			return saveHighscore(request, response, safeString(param.get("n")), safeInt(param.get("s")), safeInt(param.get("l")));
		}
	}

	private JsonArray listHighscore(HttpServletRequest request, HttpServletResponse response, Integer lastNDays, boolean addToken) throws Exception {
		Connection connection = getConnection(request);
		try {
			if (addToken) {
				String token = createToken(request, 0);
				if (LOG.isLoggable(Level.FINER))
					LOG.finer("created token " + token);
				response.setHeader(X_PID, token);
			}
			return doListHighscore(connection, null, lastNDays);
		} finally {
			connection.close();
		}
	}

	private JsonArray doListHighscore(Connection connection, Long hightlightId, Integer lastNDays) throws SQLException {
		JsonArrayBuilder result = JsonProvider.provider().createArrayBuilder();
		for (Object[] row : getHighscore(connection, MAX_HIGHSCORE_LINES, lastNDays)) {
			JsonObjectBuilder entry = JsonProvider.provider().createObjectBuilder();
			entry.add("n", (String) row[1]);
			entry.add("s", (int) row[2]);
			if (hightlightId != null && hightlightId.equals(row[0]))
				entry.add("x", Boolean.TRUE);
			result.add(entry);
		}
		return result.build();
	}

	/**
	 * [0]=id(Long), [1]=name(String), [2]=score(Integer)
	 */
	private List<Object[]> getHighscore(Connection connection, int maxLines, Integer lastNDays) throws SQLException {
		StringBuilder sql = new StringBuilder(110);
		sql.append("select id,name,score from highscore");
		if (lastNDays != null)
			sql.append(" where datediff(?,coalesce(updated,created)) < ?");
		sql.append(" order by score desc");
		PreparedStatement statement = connection.prepareStatement(sql.toString());
		if (lastNDays != null) {
			statement.setDate(1, new Date(System.currentTimeMillis()));
			statement.setInt(2, lastNDays);
		}
		ResultSet rs = statement.executeQuery();
		List<Object[]> result = new ArrayList<>(maxLines != -1 ? maxLines : 16);
		for (int i = 0; (maxLines == -1 || i < maxLines) && rs.next(); i++) {
			result.add(new Object[] {
				rs.getLong(1), rs.getString(2), rs.getInt(3)
			});
		}
		rs.close();
		statement.close();
		return result;
	}

	private JsonArray saveHighscore(HttpServletRequest request, HttpServletResponse response, String name, int score, int level)
			throws Exception {
		Connection connection = getConnection(request);

		String truncatedName = name.substring(0, Math.min(name.length(), MAX_NAME_LENGTH));
		String identifier = getRemoteAddress(request);
		if (LOG.isLoggable(Level.FINE))
			LOG.fine("save highscore for '" + truncatedName + "' [" + identifier + "], score: " + score + ", level: " + level);

		try {
			if (isValidRequest(request)) {
				return doSaveHighscore(connection, truncatedName, identifier, score, level);
			} else {
				return doListHighscore(connection, null, LAST_PERIOD);
			}
		} finally {
			connection.close();
		}
	}

	private String createToken(HttpServletRequest request, int secondOffset) throws ServletException {
		String address = getRemoteAddress(request);
		Calendar calendar = Calendar.getInstance();
		calendar.set(Calendar.SECOND, calendar.get(Calendar.SECOND) + secondOffset);
		calendar.set(Calendar.MILLISECOND, 0);
		long time = calendar.getTimeInMillis();
		try {
			byte[] digest = MessageDigest.getInstance("SHA").digest((address + Long.toString(time)).getBytes());
			return Base64.getEncoder().encodeToString(digest);
		} catch (NoSuchAlgorithmException e) {
			throw new ServletException(e);
		}
	}

	private boolean isValidRequest(HttpServletRequest request) throws Exception {
		String referer = request.getHeader("Referer");
		String host = request.getHeader("Host");
		if (referer == null || host == null)
			return false;
		URI refererUri = URI.create(referer);
		URI hostUri = URI.create("http://" + host);
		if (!refererUri.getHost().equals(hostUri.getHost()))
			return false;

		String token = request.getHeader(X_PID);
		if (token == null)
			return false;
		// check valid tokens from the last 4 seconds
		for (int i = 0; i < 4; i++) {
			String validToken = createToken(request, -i);
			if (token.equals(validToken))
				return true;
		}
		if (LOG.isLoggable(Level.FINE))
			LOG.fine("token " + token + " is rejected as invalid");
		return false;
	}

	/**
	 * @see #getHighscore(Connection, int, Integer)
	 */
	private Object[] findMaxScoreForName(Connection connection, String name, int maxLines, Integer lastNDays) throws SQLException {
		for (Object[] row : getHighscore(connection, maxLines, lastNDays)) {
			if (name.equalsIgnoreCase((String) row[1]))
				return row;
		}
		return null;
	}

	private JsonArray doSaveHighscore(Connection connection, String truncatedName, String identifier, int score, int level)
			throws SQLException {

		Object[] existingEntry = findMaxScoreForName(connection, truncatedName, -1, LAST_PERIOD);
		if (existingEntry != null) {
			int maxScore = (int) existingEntry[2];
			if (score <= maxScore) {
				// extra case, no entry
				if (LOG.isLoggable(Level.FINE))
					LOG.fine("no update because existing score for '" + truncatedName + "' is " + score + " <= " + maxScore);
				return JsonProvider.provider().createArrayBuilder().add("No").build();
			}
			String updateSql = "update highscore set score=?, level=?, updated=?, session=? where id=?";
			PreparedStatement stmt = connection.prepareStatement(updateSql);
			stmt.setInt(1, score);
			stmt.setInt(2, level);
			stmt.setTimestamp(3, new Timestamp(System.currentTimeMillis()));
			stmt.setString(4, identifier);
			stmt.setLong(5, (long) existingEntry[0]);
			stmt.executeUpdate();
			stmt.close();
			if (LOG.isLoggable(Level.FINE))
				LOG.fine("updated");
		} else {
			String insertSql = Substitution.INSTANCE.getEntry("insert");
			PreparedStatement stmt = connection.prepareStatement(insertSql);
			stmt.setString(1, truncatedName);
			stmt.setInt(2, score);
			stmt.setInt(3, level);
			stmt.setTimestamp(4, new Timestamp(System.currentTimeMillis()));
			stmt.setString(5, identifier);
			stmt.executeUpdate();
			stmt.close();
			if (LOG.isLoggable(Level.FINE))
				LOG.fine("inserted");
			existingEntry = findMaxScoreForName(connection, truncatedName, -1, LAST_PERIOD);
		}
		return doListHighscore(connection, existingEntry != null ? (Long) existingEntry[0] : null, LAST_PERIOD);
	}


	private Connection getConnection(HttpServletRequest request) throws ServletException {
		try {
			InitialContext ctx = new InitialContext();
	        DataSource dataSource = (DataSource) ctx.lookup("java:comp/env/jdbc/DefaultDB");
	        ctx.close();
	        Connection connection = dataSource.getConnection();
	        checkTableExists(connection);
			return connection;
		} catch (Exception e) {
			throw new ServletException(e);
		}
	}

	private void checkTableExists(Connection connection) throws SQLException {
		try {
			connection.createStatement().executeQuery("select count(*) from highscore");
		} catch (SQLException e) {
			for (int i = 1; i < 10; i++) {
				String ddl = Substitution.INSTANCE.getEntry("ddl." + i);
				if (ddl == null)
					break;
				connection.createStatement().executeUpdate(ddl);
			}
		}
	}

	private String safeString(String string) {
		return string != null ? string : "";
	}

	private int safeInt(String string) {
		try {
			return Integer.valueOf(string);
		} catch (Exception e) {
			return 0;
		}
	}

	private String getRemoteAddress(HttpServletRequest request) {
		String host = request.getHeader("x-forwarded-for");
		if (host != null && host.length() > 0)
			host = host.split(",")[0];
		if (host == null || host.length() == 0)
			host = request.getRemoteAddr();
		return host;
	}
}
