/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
package ws.model;

import java.util.logging.Level;
import java.util.logging.Logger;

import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.spi.JsonProvider;

public class Board {
	private class Meta {
		private int fWidth;
		private int fHeight;
		private byte fEmpty;
		private byte fBorder;
		private byte fStone;

		private Integer fLevelIndex;

		private Meta(int width, int height, byte empty, byte border, byte stone) {
			fWidth = width;
			fHeight = height;
			fEmpty = empty;
			fBorder = border;
			fStone = stone;
		}
	}

	private static final Logger LOG = Logger.getLogger(Board.class.getName());

	private static final JsonProvider JSON = JsonProvider.provider();

	private byte[] fBoard;
	private final Meta fMeta;

	private static byte[] extractRoom(JsonArray array) {
		byte[] room = new byte[array.size()];
		for (int i = 0; i < room.length; i++) {
			String string = array.getString(i);
			if (string.length() > 0)
				room[i] = (byte) string.charAt(0);
		}
		return room;
	}

	public Board() {
		this(null, 0, 0, (byte) 0, (byte) 0, (byte) 0);
	}

	public Board(JsonObject board) {
		this(extractRoom(board.getJsonArray("b")), board.getInt("w"), board.getInt("h"),
				(byte) board.getString("e").charAt(0), (byte) board.getString("x").charAt(0), (byte) board.getString("s").charAt(0));
		fMeta.fLevelIndex = board.getInt("i");
	}

	public Board(byte[] board, int width, int height, byte empty, byte border, byte stone) {
		fMeta = new Meta(width, height, empty, border, stone);
		fBoard = board != null ? board : fill(new byte[width * height], width, height);
	}

	public void rebuild() {
		fill(fBoard, getWidth(), getHeight());
	}

	public JsonArrayBuilder rebuild(int startX, int startY, int width, int height, int[] playerPositions) {
		JsonArrayBuilder items = JSON.createArrayBuilder();
		for (int x = startX, n = startX + width; x < n; x++) {
			LevelLoop: for (int y = startY, m = startY + height; y < m; y++) {
				int pos = y * fMeta.fWidth + x;
				if (!isEmpty(pos))
					continue;
				byte newVal = getRandomBlockValue();
				if (newVal == fMeta.fEmpty)
					continue;
				for (int i = 0; i < playerPositions.length; i += 2) {
					int px = playerPositions[i];
					int py = playerPositions[i + 1];
					if (px == x && py == y) {
						if (LOG.isLoggable(Level.FINE))
							LOG.fine("no rebuild at position [" + x + ", " + y + "] because it is occupied by a player");
						continue LevelLoop;
					}
				}
				fBoard[pos] = newVal;
				JsonObjectBuilder item = JSON.createObjectBuilder();
				item.add("p", pos);
				item.add("v", String.valueOf((char) newVal));
				items.add(item);
			}
		}
		return items;
	}

	private byte[] fill(byte[] board, int width, int height) {
		for (int x = 0; x < width; x++) {
			for (int y = 0; y < height; y++) {
				byte val;
				if (isBorderPosition(x, y)) {
					val = fMeta.fBorder; 
				} else {
					val = getRandomBlockValue();
				}
				board[y * fMeta.fWidth + x] = val;
			}
		}
		return board;
	}

	private boolean isBorderPosition(int x, int y) {
		return y % 2 == 0 && x % 2 == 0
				|| y == 0 || y == fMeta.fHeight - 1
				|| x == 0 || x == fMeta.fWidth - 1;
	}

	private byte getRandomBlockValue() {
		byte block = fMeta.fEmpty;
		if (Math.random() < .1) {
			block = fMeta.fStone;
			if (Math.random() < .4) {
				if (Math.random() < .5)
					block = 'F'; // stone with fire
				else
					block = 'B'; // stone with bomb
				if (Math.random() < .1)
					block = 'R'; // stone with normal running shoe
				else if (Math.random() < .05)
					block = 'Y'; // stone with extreme running shoe
			}
		}
		return block;
	}

	byte[] getBoard() {
		return fBoard;
	}

	public int getHeight() {
		return fMeta.fHeight;
	}

	public boolean isEmpty(int position) {
		return fBoard[position] == fMeta.fEmpty;
	}

	public int getWidth() {
		return fMeta.fWidth;
	}

	public void updateFromJson(JsonObject board) {
		fBoard = extractRoom(board.getJsonArray("b"));
		fMeta.fWidth = board.getInt("w");
		fMeta.fHeight = board.getInt("h");
		fMeta.fEmpty = (byte) board.getString("e").charAt(0);
		fMeta.fBorder = (byte) board.getString("x").charAt(0);
		fMeta.fStone = (byte) board.getString("s").charAt(0);
		fMeta.fLevelIndex = board.getInt("i");
	}


	public JsonObjectBuilder toJson() {
		JsonObjectBuilder builder = JSON.createObjectBuilder();
		builder.add("w", getWidth());
		builder.add("h", getHeight());
		if (fMeta.fEmpty != 0)
			builder.add("e", Character.toString((char) fMeta.fEmpty));
		if (fMeta.fBorder != 0)
			builder.add("x", Character.toString((char) fMeta.fBorder));
		if (fMeta.fStone != 0)
			builder.add("s", Character.toString((char) fMeta.fStone));
		if (fMeta.fLevelIndex != null)
			builder.add("i", fMeta.fLevelIndex);

		JsonArrayBuilder room = JSON.createArrayBuilder();
		for (int i = 0; i < fBoard.length; i++) {
			room.add(String.valueOf((char) fBoard[i]));
		}
		builder.add("b", room);
		return builder;
	}

	public int getBlockCount(int startX, int startY, int width, int height) {
		int count = 0;
		for (int x = startX, n = startX + width; x < n; x++) {
			for (int y = startY, m = startY + height; y < m; y++) {
				if (isBorderPosition(x, y))
					continue;
				int pos = y * fMeta.fWidth + x;
				if (!isEmpty(pos))
					count++;
			}
		}
		return count;
	}
}