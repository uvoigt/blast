/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
package ws;

import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.enterprise.context.ApplicationScoped;
import javax.websocket.Session;

import ws.model.Board;
import ws.model.Game;
import ws.model.Game.Status;
import ws.model.Player;
import ws.model.Sprite;

@ApplicationScoped
public class MPGameServer {

	private static final Logger LOG = Logger.getLogger(MPGameServer.class.getName());

	private final Map<Session, Player> fSessions = new ConcurrentHashMap<>();
	private final Map<Integer, Game> fGames = new ConcurrentHashMap<>();
	private final Map<Game, Object> fServerGames = new ConcurrentHashMap<>();
	private final Map<Integer, Object> fPlayerIds = new ConcurrentHashMap<>();

	public MPGameServer() {
		Game serverGame1 = createGame(1, "Roman arena", 81, 81);
		fServerGames.put(serverGame1, new Object());

		fGames.put(serverGame1.getId(), serverGame1);
	}

	private Game createGame(int id, String name, int width, int height) {
		return new Game(id, name, Status.open,
				new Board(null, width, height, (byte) '_', (byte) 'X', (byte) 'S'), true);
	}

	public int getNumberOfPlayers() {
		return fSessions.size();
	}

	public Sprite addPlayer(Session session) {
		Player player = new Player(createUniquePlayerId());
		fSessions.put(session, player);
		return player;
	}

	private int createUniquePlayerId() {
		synchronized (fPlayerIds) {
			for (int i = 1; ; i++) {
				if (!fPlayerIds.containsKey(i)) {
					fPlayerIds.put(i, new Object());
					return i;
				}
			}
		}
	}

	public Sprite removePlayer(Session session) {
		Sprite player = fSessions.remove(session);
		if (player != null)
			fPlayerIds.remove(player.getId());
		return player;
	}

	public Iterable<Player> getPlayers() {
		return fSessions.values();
	}

	public Player getPlayer(Session session) {
		return fSessions.get(session);
	}

	public Session findSessionByPlayerId(int id) {
		for (Entry<Session, Player> entry : fSessions.entrySet()) {
			if (id == entry.getValue().getId())
				return entry.getKey();
		}
		return null;
	}

	public Session[] getSessions() {
		return fSessions.keySet().toArray(new Session[fSessions.keySet().size()]);
	}

	public int getNumberOfGames() {
		return fGames.size();
	}

	public Game addGame(String name, Session initiator, Status status, Board board) {
		Game game;
		synchronized (fGames) {
			for (int i = 1; ; i++) {
				if (!fGames.containsKey(i)) {
					game = new  Game(i, name, initiator, status, board, false);
					fGames.put(i, game);
					break;
				}
			}
		}
		return game;
	}

	public void removeGame(Game game) {
		fGames.remove(game.getId());
	}

	public Iterable<Game> getGames() {
		return fGames.values();
	}

	public Game getGame(int id) {
		return fGames.get(id);
	}

	public Game findGameForSession(Session session, Game ignoreGame) {
		for (Game game : fGames.values()) {
			if (game == ignoreGame)
				continue;
			if (game.contains(session))
				return game;
		}
		return null;
	}

	public void removeEmptyGame(Game game) {
		if (game.getParticpantNumber() == 0) {
			if (fServerGames.containsKey(game)) {
				game.getBoard().rebuild();
				if (LOG.isLoggable(Level.FINE))
					LOG.fine("rebuild server game: " + game.getName());
			} else {
				removeGame(game);
				if (LOG.isLoggable(Level.FINE))
					LOG.fine("ended game: " + game.getName());
			}
		}
	}
}
