// TODO:
// Make data property of ValidationMessage work with JSON

export interface ValidationMessage {
	valid: boolean;
	error: ErrorMessage;
	data: Object;
}

export interface Message {
	type: string;
}

export interface ErrorMessage extends Message {
	error: string;
}

export interface HelloMessage extends Message {
	version: string;
	agent: string;
}