/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
package ws;

import java.io.IOException;
import java.io.StringReader;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.inject.Inject;
import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import javax.json.JsonNumber;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.JsonReader;
import javax.json.JsonString;
import javax.json.JsonValue;
import javax.json.spi.JsonProvider;
import javax.websocket.CloseReason;
import javax.websocket.CloseReason.CloseCodes;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import ws.model.Board;
import ws.model.Game;
import ws.model.Game.Status;
import ws.model.Player;
import ws.model.Sprite;

@ServerEndpoint("/ws")
public class MPWebSocket {

	private enum Request {
		ping('p'),
		setPlayerName('n'),
		setPlayerColor('c'),
		setGameName('g'),
		listPlayers('l'),
		listGames('L'),
		registerGame('r'),
		deregisterGame('d'),
		initBoard('i'),
		answerRequest('a'),
		enterGame('e'),
		updateState('u'),
		updateSprite('s'),
		spriteIds('I'),
		decLife('f'),
		putBomb('b'),
		updateBoard('U'),
		sendText('t'),
		leaveGame('v');

		private static Map<Character, Request> map;

		private Request(char key) {
			getMap().put(key, this);
		}

		private static Map<Character, Request> getMap() {
			if (map == null)
				map = new HashMap<>();
			return map;
		}

		private static Request byKey(char key) {
			return map.get(key);
		}
	}

	private enum Response {
		playerList('p'),
		gameList('g'),
		playerName('n'),
		playerColor('c'),
		newName('N'),
		requestEnter('r'),
		waitToAccept('w'),
		accepted('a'),
		refused('R'),
		startGame('s'),
		newPlayer('P'),
		state('u'),
		sprite('S'),
		spriteIds('I'),
		life('l'),
		bomb('b'),
		chat('t'),
		leftGame('v'),
		rebuildSection('e'),
		playerDisconnected('d');

		private String fKey;

		private Response(char key) {
			fKey = Character.toString(key);
		}
	}

	private static final Logger LOG = Logger.getLogger(MPWebSocket.class.getName());

	private static final JsonProvider JSON = JsonProvider.provider();

	private static String[] NAMES;

	@Inject
	private MPGameServer fServer;

	private int fZoom;

	public MPWebSocket() {
		String string = Substitution.INSTANCE.getEntry("filter.zoom").split("=")[1];
		fZoom = Integer.parseInt(string);
	}

	@OnOpen
	public void open(Session session) {
		Sprite player = fServer.addPlayer(session);
		List<String> values = session.getRequestParameterMap().get("n");
		String name = values.size() > 0 ? values.get(0) : null;
		values = session.getRequestParameterMap().get("c");
		Integer color = values.size() > 0 ? Integer.valueOf(values.get(0)) : null;
		if (LOG.isLoggable(Level.FINE))
			LOG.fine("opened session for name=" + name + ", color=" + color + " assigned id: " + player.getId() +
					", current sessions " + fServer.getNumberOfPlayers() + ", current games " + fServer.getNumberOfGames());
		doSetPlayerName(session, name, color);
	}

	@OnClose
	public void close(Session session, CloseReason reason) {
		Sprite player = fServer.removePlayer(session);
		if (player != null) {
			if (LOG.isLoggable(Level.FINE))
				LOG.fine("removed session: " + player + ", " + fServer.getNumberOfPlayers() + " players left");
		}
		for (Game game : fServer.getGames()) {
			if (game.removeParticipant(session)) {
				fServer.removeEmptyGame(game);
				if (player != null) {
					JsonObjectBuilder builder = createResponse(Response.leftGame).add("i", player.getId());
					sendToSessions(game.getParticipants(), builder.build().toString(), session);
				}
			}
		}
		if (reason.getCloseCode() != CloseCodes.UNEXPECTED_CONDITION) {
			JsonObjectBuilder builder = createResponse(Response.playerDisconnected);
			if (player != null)
				builder.add("i", player.getId());
			sendToOpenSessions(builder.build().toString(), session);
		}
	}

	// ein Zugeständnis an Tomcat, der das mit den Open-Session nicht hinbekommt :-(
	private void sendToOpenSessions(String message, Session ignoreSession) {
		sendToSessions(fServer.getSessions(), message, ignoreSession);
	}

	@OnError
	public void error(Session session, Throwable error) {
		Throwable cause = getDeepestCause(error);
//		if (!"Connection reset".equals(cause.getMessage()))
			LOG.log(Level.SEVERE, "onError", error);
		// no reason to send anything if there is a problem at socket level
		if (!(cause instanceof SocketException)) {
			sendToSession(session, JSON.createObjectBuilder().add("error", error.getMessage() != null ? error.getMessage() : "Internal error"));
		}
	}

	private Throwable getDeepestCause(Throwable e) {
		return e.getCause() != null && e.getCause() != e ? getDeepestCause(e.getCause()) : e;
	}

	@OnMessage
	public void handleMessage(Session session, String message) {
		if (LOG.isLoggable(Level.FINE)) {
			if (!message.startsWith("{\"c\":\"u") && !message.startsWith("{\"c\":\"s")) {
				Sprite player = fServer.getPlayer(session);
				LOG.fine("received from " + player + ": " + message);
			}
		}
		
		try (JsonReader reader = Json.createReader(new StringReader(message))) {
			JsonObject request = reader.readObject();
			switch (Request.byKey(request.getString("c").charAt(0))) {
			case ping:
				break;
			case setPlayerName:
				setPlayerName(session, request);
				break;
			case setPlayerColor:
				setPlayerColor(session, request);
				break;
			case setGameName:
				setGameName(session, request);
				break;
			case listPlayers:
				listPlayers(session, request);
				break;
			case listGames:
				listGames(session, request);
				break;
			case registerGame:
				registerGame(session, request);
				break;
			case deregisterGame:
				deregisterGame(session, request);
				break;
			case initBoard:
				initBoard(session, request);
				break;
			case answerRequest:
				answerRequest(session, request);
				break;
			case enterGame:
				enterGame(session, request);
				break;
			case updateState:
				updateState(session, request);
				break;
			case updateSprite:
				updateSprite(session, request);
				break;
			case spriteIds:
				spriteIds(session, request);
				break;
			case decLife:
				decLife(session, request);
				break;
			case putBomb:
				putBomb(session, request);
				break;
			case updateBoard:
				updateBoard(session, request);
				break;
			case sendText:
				sendText(session, request);
				break;
			case leaveGame:
				leaveGame(session, request);
				break;
			}
		} catch (Exception e) {
			LOG.log(Level.SEVERE, "message: " + message + " from: " + fServer.getPlayer(session), e);
		}
	}

	private void setPlayerName(Session session, JsonObject request) {
		String name = request.getString("name", "");
		JsonNumber color = request.getJsonNumber("color");
		doSetPlayerName(session, name, color != null ? color.intValue() : null);
	}

	private void doSetPlayerName(Session session, String name, Integer color) {
		if (name == null || name.length() == 0) {
			Set<Integer> usedIndizes = new HashSet<>();
			name = getRandomPlayerName(usedIndizes);
			// send back the changed name
			sendToSession(session, createResponse(Response.newName).add("n", name));
		}
		Player player = fServer.getPlayer(session);
		if (player != null && name != null && !name.equals(player.getName())) {
 			player.setName(name);
 			if (color != null)
 				player.setColor(color.intValue());
			// inform other sessions
			// with this indirection it is easier to exclude current player from its own list 
			sendToOpenSessions(createResponse(Response.playerName).build().toString(), session);
		}
	}

	private void setPlayerColor(Session session, JsonObject request) {
		JsonNumber color = request.getJsonNumber("color");
		Player player = fServer.getPlayer(session);
		if (player != null && color != null && color.intValue() != player.getColor()) {
			player.setColor(color.intValue());
			// inform other sessions
			sendToOpenSessions(createResponse(Response.playerColor).
					add("i", player.getId()).add("c", color).build().toString(), session);
		}
	}

	private void setGameName(Session session, JsonObject request) {
		String name = request.getString("name", "");
		Game game = fServer.findGameForSession(session, null);
		if (game != null) {
			game.setName(name);
			sendToOpenSessions(createGameListMsg().build().toString(), null);
		}
	}

	private void listPlayers(Session session, JsonObject request) {
		JsonArrayBuilder arrayBuilder = JSON.createArrayBuilder();
		Sprite currentPlayer = fServer.getPlayer(session);
		for (Player player : fServer.getPlayers()) {
			if (player != currentPlayer) {
				JsonObjectBuilder builder = JSON.createObjectBuilder();
				builder.add("i", player.getId());
				builder.add("n", player.getName());
				builder.add("c", player.getColor());
				arrayBuilder.add(builder);
			}
		}
		sendToSession(session, createResponse(Response.playerList).add("list", arrayBuilder));
	}

	private void listGames(Session session, JsonObject request) {
		sendToSession(session, createGameListMsg());
	}

	private JsonObjectBuilder createGameListMsg() {
		JsonArrayBuilder arrayBuilder = JSON.createArrayBuilder();
		for (Game game : fServer.getGames()) {
			JsonObjectBuilder builder = JSON.createObjectBuilder();
			builder.add("i", game.getId());
			builder.add("n", game.getName());
			builder.add("p", game.getParticpantNumber());
			arrayBuilder.add(builder);
		}
		return createResponse(Response.gameList).add("list", arrayBuilder);
	}

	private void registerGame(Session session, JsonObject request) {
		Status status = Status.valueOf(request.getString("status"));
		JsonObject boardObject = request.getJsonObject("board");
		Board board = boardObject != null ? new Board(boardObject) : new Board();
		Game game = fServer.addGame(request.getString("name"), session, status, board);
		// this player is the first participant
		game.addParticipant(session);
		if (LOG.isLoggable(Level.FINE))
			LOG.fine("registered game: " + game.getName());

		// if the requester has any other open requests, cancel them
		Game oldGame = fServer.findGameForSession(session, game);
		if (oldGame != null) {
			fServer.removeGame(oldGame);
			if (LOG.isLoggable(Level.FINE))
				LOG.fine("ended game request: " + oldGame.getName());
		}

		// update the game lists
		sendToOpenSessions(createGameListMsg().build().toString(), null);
	}

	private void deregisterGame(Session session, JsonObject request) {
		Game game = leaveGame(session, request);
		if (game != null) {
			fServer.removeGame(game);
		}
	}

	private void initBoard(Session session, JsonObject request) {
		Game game = fServer.findGameForSession(session, null);
		if (game != null) {
			game.getBoard().updateFromJson(request.getJsonObject("board"));
		}
	}

	private void answerRequest(Session session, JsonObject request) {
		String content = request.getString("d");
		Sprite answerPlayer = fServer.getPlayer(session);
		final Game game = fServer.findGameForSession(session, null);
		if (game != null) {
			boolean accepted = "accept".equals(content);
			// this is the player who started the request, he gets the answer message
			Session requestor = fServer.findSessionByPlayerId(request.getInt("i"));

			sendToSession(requestor, createResponse(accepted ? Response.accepted : Response.refused).
					add("i", answerPlayer.getId()));

			if (accepted)
				doEnterGame(game, requestor);
		}
	}

	private void sendStartGame(Game game, Session targetSession, JsonObject position) {
		final JsonArrayBuilder opponentsArray = JSON.createArrayBuilder();
		final Sprite targetPlayer = fServer.getPlayer(targetSession);

		for (Session session : game.getParticipants()) {
			if (!session.isOpen()) {
				game.removeParticipant(session);
				continue;
			}
			Player p = fServer.getPlayer(session);
			if (p != targetPlayer) {
				JsonObjectBuilder builder = JSON.createObjectBuilder();
				builder.add("i", p.getId());
				builder.add("p", JSON.createObjectBuilder().add("x", p.getX()).add("y", p.getY()));
				builder.add("c", p.getColor());
				builder.add("l", p.getLives());
				opponentsArray.add(builder);
			}
		}

		JsonObjectBuilder message = createResponse(Response.startGame);
		message.add("opponents", opponentsArray);
		if (position != null)
			message.add("position", position);
		message.add("board", game.getBoard().toJson());

		sendToSession(targetSession, message);
	}

	private void enterGame(Session session, JsonObject request) {
		int gameId = request.getInt("game");
		Game game = fServer.getGame(gameId);
		if (game != null) {
			switch (game.getStatus()) {
			default:
				break;
			case open:
				doEnterGame(game, session);
				break;
			case allowRequest:
				sendToSession(game.getInitiator(), createResponse(Response.requestEnter).add("i", fServer.getPlayer(session).getId()));
				sendToSession(session, createResponse(Response.waitToAccept).add("i", fServer.getPlayer(game.getInitiator()).getId()));
				break;
			}
		}
	}

	private void doEnterGame(Game game, Session newParticipant) {
		Player player = fServer.getPlayer(newParticipant);
		player.setLives(3);
		game.addParticipant(newParticipant);
		JsonObject position = getRandomPlayerPosition(game);
		// respond to new participant
		sendStartGame(game, newParticipant, position);
		// inform others, maybe the host of the game
		JsonObjectBuilder message = createResponse(Response.newPlayer);
		message.add("i", player.getId());
		message.add("c", player.getColor());
		message.add("p", position);
		message.add("l", player.getLives());
		// inform other participants
		sendToSessions(game.getParticipants(), message.build().toString(), newParticipant);
		// update the game lists
		sendToOpenSessions(createGameListMsg().build().toString(), null);
	}

	private JsonObject getRandomPlayerPosition(Game game) {
		Board board = game.getBoard();
		int boardWidth = board.getWidth();
		int boardHeight = board.getHeight();
		int canvasWidth = 19; // Höhe und Breite eines Boards, das genau in den Canvas passt
		int canvasHeight = 19;
		int px = (int) (Math.random() * Math.min(canvasWidth, boardWidth));
		int py = (int) (Math.random() * Math.min(canvasHeight, boardHeight));
		int pos = py * boardWidth + px;
		if (board.isEmpty(pos) && (board.isEmpty(pos - 1) || board.isEmpty(pos + 1)
				|| board.isEmpty(pos - boardWidth) || board.isEmpty(pos + boardWidth))) {
			final int x = (pos % boardWidth) * 16 * fZoom - 1 * fZoom;
			final int y = (pos / boardWidth * 16 * fZoom) - 3 * fZoom;
			final boolean[] alreadyOccuppied = { false };
			for (Session session : game.getParticipants()) {
				Sprite player = fServer.getPlayer(session);
				if (player != null && player.getX() == x && player.getY() == y)
					alreadyOccuppied[0] = true;
			}
			if (!alreadyOccuppied[0])
				return JSON.createObjectBuilder().add("x", x).add("y", y).build();
		}
		return getRandomPlayerPosition(game);
	}

	private void updateState(Session session, JsonObject request) {
		Game game = fServer.findGameForSession(session, null);
		if (game != null) {
			Sprite player = fServer.getPlayer(session);
			JsonNumber numberX = request.getJsonNumber("x");
			JsonNumber numberY = request.getJsonNumber("y");
			player.setX(numberX.intValue());
			player.setY(numberY.intValue());
			sendStateInformation(session, game, player, request.getString("d"));
		}
	}

	private void sendStateInformation(Session session, Game game, Sprite player, String direction) {
		JsonObjectBuilder response = createResponse(Response.state);
		response.add("i", player.getId());
		response.add("x", player.getX());
		response.add("y", player.getY());
		if (direction != null)
			response.add("d", direction);
		sendToSessions(game.getParticipants(), response.build().toString(), session);
	}

	private void updateSprite(Session session, JsonObject request) {
		// wahrscheinlich keine Notwendigkeit, die Position zu speichern
		// diese Funktion sollte immer nur vom Game-Host gesendet werden
		Game game = fServer.findGameForSession(session, null);
		if (game != null) {
			Session[] participants = game.getParticipants();
			if (participants.length > 1) {
				JsonObjectBuilder response = createResponse(Response.sprite);
				response.add("x", request.getInt("x"));
				response.add("y", request.getInt("y"));
				response.add("d", request.getString("d"));
				response.add("s", request.getInt("s")); // sprite-ID
				sendToSessions(game.getParticipants(), response.build().toString(), session);
			}
		}
	}

	private void spriteIds(Session session, JsonObject request) {
		Game game = fServer.findGameForSession(session, null);
		if (game != null) {
			JsonValue sprites = request.get("s");
			int playerId = request.getInt("p");
			Session otherPlayer = fServer.findSessionByPlayerId(playerId);
			sendToSession(otherPlayer, createResponse(Response.spriteIds).add("s", sprites));
		}
	}

	private void decLife(Session session, JsonObject request) {
		Player player = fServer.getPlayer(session);
		player.setLives(player.getLives() - 1);
//		Game game = fServer.findGameForSession(session, false, null);
//		if (game != null) {
//			JsonObjectBuilder builder = createResponse(Response.life).
//					add("i", player.getId()).add("l", player.getLives());
//			sendToSessions(game.getParticipants(), builder.build().toString(), session);
//		}
	}

	private void putBomb(Session session, JsonObject request) {
		Game game = fServer.findGameForSession(session, null);
		if (game != null) {
			Sprite player = fServer.getPlayer(session);
			JsonObjectBuilder builder = createResponse(Response.bomb).add("i", player.getId());
			JsonNumber bomb = request.getJsonNumber("b");
			// send the position of the bomb just added
			builder.add("b", bomb);
			builder.add("s", request.getJsonNumber("s"));
			sendToSessions(game.getParticipants(), builder.build().toString(), session);
		}
	}

	private void updateBoard(Session session, JsonObject request) {
		Game game = fServer.findGameForSession(session, null);
		if (game != null) {
			JsonNumber pos = request.getJsonNumber("p");
			JsonString val = request.getJsonString("v");
			// send the board item at the position with the value
			String stringVal = val.getString();
			if (stringVal.length() != 1)
				return;

			char c = stringVal.charAt(0);
			game.updateBoard(pos.intValue(), (byte) c);
			if (LOG.isLoggable(Level.FINE))
				LOG.fine("set board[" + pos + "] = " + c);
			if (game.isAutoRebuildEmptySections()) {
				if (System.currentTimeMillis() > game.getNextAutoRebuildCheck()) {
					if (rebuildEmptySections(game))
						game.setNextAutoRebuildCheck(System.currentTimeMillis() + 15000);
				}
			}

			int x = request.getInt("x", -1);
			int y = request.getInt("y", -1);
			if (x != -1 && y != -1) {
				// wenn ein Item eingesammelt wurde, sollte die aktuelle Position dieses Spielers
				// sicherheitshalber an die anderen gesandt werden, damit das Item dort nicht ggf. liegenbleibt.
				// da die serverseitige Position nicht 100% synchron ist, wird sie hier mit übertragen
				Sprite player = fServer.getPlayer(session);
				player.setX(x);
				player.setY(y);
				sendStateInformation(session, game, player, null);
			}
		}
	}

	private boolean rebuildEmptySections(Game game) {
		// wähle eine zufällige section
		int x = (int) (Math.random() * (game.getBoard().getWidth() - 5));
		int y = (int) (Math.random() * (game.getBoard().getHeight() - 5));
		int width = Math.min(19, game.getBoard().getWidth() - x);
		int height = Math.min(19, game.getBoard().getHeight() - y);
		int square = width * height;
		int blockCount = game.getBoard().getBlockCount(x, y, width, height);
		if (blockCount > 0 && square / blockCount < 10) {
			if (LOG.isLoggable(Level.FINE))
				LOG.fine("no rebuild of section [" + x + ", " + y + ", " + width + ", " + height + "] because it already has enough blocks");
			return false;
		}

		Session[] participants = game.getParticipants();
		int[] relativePlayerPositions = new int[participants.length * 2];
		for (int i = 0, index = 0; i < participants.length; i++) {
			Player player = fServer.getPlayer(participants[i]);
			int px = player.getX() / 16 / fZoom + 1;
			int py = player.getY() / 16 / fZoom + 1;
			relativePlayerPositions[index++] = px;
			relativePlayerPositions[index++] = py;
		}
		JsonArray items = game.getBoard().rebuild(x, y, width, height, relativePlayerPositions).build();
		if (LOG.isLoggable(Level.FINE))
			LOG.fine("rebuild section [" + x + ", " + y + ", " + width + ", " + height + "] in game: " + game.getName() + ", created " + items.size() + " items");
		JsonObjectBuilder response = createResponse(Response.rebuildSection);
		response.add("i", items);
		sendToSessions(game.getParticipants(), response.build().toString(), null);
		return true;
	}

	private void sendText(Session session, JsonObject request) {
		Sprite player = fServer.getPlayer(session);

		String text = request.getString("text");
		JsonArray recipients = request.getJsonArray("recipients");
		JsonObjectBuilder msg = JSON.createObjectBuilder();
		List<Session> sessions = new ArrayList<>(recipients.size());

		if (text == null || text.length() == 0 || recipients.isEmpty()) {
			msg.add("System", "Select the player(s) you want to chat with in the list of players.");
			sessions.add(session);
		} else {
			for (JsonValue recipient : recipients) {
				Session targetSession = fServer.findSessionByPlayerId(((JsonNumber) recipient).intValue());
				if (targetSession != null)
					sessions.add(targetSession);
			}
			msg.add(Integer.toString(player.getId()), text);
		}
		JsonObjectBuilder builder = createResponse(Response.chat).add("msg", msg);
		sendToSessions(sessions, builder.build().toString(), null);
	}

	private Game leaveGame(Session session, JsonObject request) {
		Game game = fServer.findGameForSession(session, null);
		if (game != null) {
			Sprite player = fServer.getPlayer(session);
			JsonObjectBuilder builder = createResponse(Response.leftGame).add("i", player.getId());
			sendToSessions(game.getParticipants(), builder.build().toString(), session);
			game.removeParticipant(session);
			fServer.removeEmptyGame(game);

			// update the game lists
			sendToOpenSessions(createGameListMsg().build().toString(), null);
		}
		return game;
	}

	private void sendToSessions(Iterable<Session> sessions, String message, Session ignoreSession) {
		for (Session session : sessions) {
			if (ignoreSession == null || !ignoreSession.equals(session))
				sendToSession(session, message);
		}
	}

	private void sendToSessions(Session[] sessions, String message, Session ignoreSession) {
		for (Session session : sessions) {
			if (ignoreSession == null || !ignoreSession.equals(session))
				sendToSession(session, message);
		}
	}

	private void sendToSession(Session session, JsonObjectBuilder builder) {
		sendToSession(session, builder.build().toString());
	}

	private void sendToSession(Session session, String message) {
		try {
			synchronized (session) {
				if (session.isOpen()) {
					if (LOG.isLoggable(Level.FINE)) {
						Player player = fServer.getPlayer(session);
						if (player != null && !message.contains("\"u\"") && !message.contains("\"S\"")) {
							LOG.fine("send to session " + player.getName() + ": " + message);
						}
					}
					session.getBasicRemote().sendText(message);
				}
			}
		} catch (IOException e) {
			LOG.log(Level.SEVERE, "Cannot send to session", e);
			close(session, new CloseReason(CloseCodes.GOING_AWAY, ""));
		}
	}

	private JsonObjectBuilder createResponse(Response response) {
		return JSON.createObjectBuilder().add("r", response.fKey);
	}

	private String getRandomPlayerName(Set<Integer> usedIndizes) {
		if (NAMES == null) {
			Properties properties = Utils.readProperties("/names.properties");
			NAMES = properties.keySet().toArray(new String[properties.size()]);
		}
		while (true) {
			int index = (int) (Math.random() * NAMES.length);
			if (usedIndizes.contains(index)) {
				if (usedIndizes.size() < NAMES.length) {
					continue;
				} else {
					return NAMES[(int) (Math.random() * NAMES.length)] + (int) (Math.random() * 100);
				}
			} else {
				usedIndizes.add(index);
				return NAMES[index];
			}
		}
	}
}
