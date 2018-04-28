/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
package ws.model;

public class Player extends Sprite {
	private String fName;
	private int fColor;
	private int fLives;

	public Player(int id) {
		fId = id;
	}

	public String getName() {
		return fName;
	}

	public void setName(String name) {
		fName = name;
	}

	public int getColor() {
		return fColor;
	}

	public void setColor(int color) {
		fColor = color;
	}

	public int getLives() {
		return fLives;
	}

	public void setLives(int lives) {
		fLives = lives;
	}

	@Override
	public String toString() {
		return fName + " [" + fId + "]";
	}
}