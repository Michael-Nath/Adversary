import { Transaction, Block } from "./types";
import * as sha256 from "fast-sha256";

const canonicalize = require("canonicalize");
export function createObjectID(object: Block | Transaction): string {
	const canonicalizedJSON = canonicalize(object);
	const uint8arr = new TextEncoder().encode(canonicalizedJSON);
	const hash = sha256.hash(uint8arr);
	return Buffer.from(hash).toString("hex");
}

