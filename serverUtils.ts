import { sanitizeString, routeMessage } from "./utils";
import type Net from "net";

export function processChunk(chunk: Buffer, socket: Net.Socket) {
	const fullString = chunk.toString();
	const msgs = fullString.split("\n");
	
	// If no new line character, then add full string to the buffer
	if (!fullString.includes("\n")) {
		sanitizeString(socket, fullString, false);
	} else {
		for (let i = 0; i < msgs.length; i++) {
			const msg = msgs[i];
			// String before first new line will complete the buffer into a complete message
			if (i == 0) {
				const completedMessage = sanitizeString(socket, msg, true);
				
				
				routeMessage(completedMessage, socket, socket.address()["address"]);
			} else if (i == msgs.length - 1) {
				// String after the last new line will go into the buffer
				msg != "" && sanitizeString(socket, msg, false);
			} else {
				// Strings in between two newlines are complete and passed through directly
				routeMessage(msg, socket, socket.address()["address"]);
			}
		}
	}
}
