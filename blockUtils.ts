import { Transaction, Block } from "./types";
import * as sha256 from "fast-sha256";

const canonicalize = require("canonicalize");
export function createObjectID(object: Block | Transaction): string {
	const canonicalizedJSON = canonicalize(object);
	const hash = sha256.hash(canonicalizedJSON);
	return Buffer.from(hash).toString("hex");
}
