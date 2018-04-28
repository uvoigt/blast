/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
package ws.model;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import javax.websocket.Session;

public class Game {
	public enum Status {
		closed, allowRequest, open
	}

	private final int fId;
	private String fName;
	private final Session fInitiator;
	private final Board fBoard;
	private final Status fStatus;
	private final boolean fAutoRebuildEmptySections;
	private long fNextAutoRebuildCheck;

	private final Set<Session> fParticpants = Collections.synchronizedSet(new HashSet<Session>());

	public Game(int id, String name, Status status, Board board, boolean autoRebuildEmptySections) {
		this(id, name, null, status, board, autoRebuildEmptySections);
	}

	public Game(int id, String name, Session initiator, Status status, Board board, boolean autoRebuildEmptySections) {
		fId = id;
		fName = name;
		fInitiator = initiator;
		fStatus = status;
		fBoard = board;
		fAutoRebuildEmptySections = autoRebuildEmptySections;
	}

	public boolean contains(Session session) {
		return fParticpants.contains(session);
	}

	public Session getInitiator() {
		return fInitiator;
	}

	public Board getBoard() {
		return fBoard;
	}

	public void updateBoard(int pos, byte val) {
		fBoard.getBoard()[pos] = val;
	}

	public Status getStatus() {
		return fStatus;
	}

	public boolean addParticipant(Session session) {
		return fParticpants.add(session);
	}

	public boolean removeParticipant(Session session) {
		return fParticpants.remove(session);
	}

	public Session[] getParticipants() {
		return fParticpants.toArray(new Session[fParticpants.size()]);
	}

	public int getParticpantNumber() {
		return fParticpants.size();
	}


	public int getId() {
		return fId;
	}

	public String getName() {
		return fName;
	}

	public void setName(String name) {
		fName = name;
	}

	public boolean isAutoRebuildEmptySections() {
		return fAutoRebuildEmptySections;
	}

	public long getNextAutoRebuildCheck() {
		return fNextAutoRebuildCheck;
	}

	public void setNextAutoRebuildCheck(long nextAutoRebuildCheck) {
		fNextAutoRebuildCheck = nextAutoRebuildCheck;
	}
}