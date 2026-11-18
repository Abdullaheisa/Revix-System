import crypto from "node:crypto";

const ARGON2_MEMORY_KIB = 65536; // 64 MiB
const ARGON2_PASSES = 3;
const ARGON2_PARALLELISM = 4;
const ARGON2_TAG_LENGTH = 32;
const ARGON2_SALT_LENGTH = 16;

interface NodeArgon2Parameters {
  message: Buffer;
  nonce: Buffer;
  memory: number;
  passes: number;
  parallelism: number;
  tagLength: number;
}

type NodeArgon2Fn = (
  algorithm: "argon2d" | "argon2i" | "argon2id",
  parameters: NodeArgon2Parameters,
  callback: (err: Error | null, derivedKey: Buffer) => void,
) => void;

const nodeCryptoWithArgon2 = crypto as typeof crypto & {
  argon2: NodeArgon2Fn;
};

function deriveArgon2id(
  password: string,
  nonce: Buffer,
  options: {
    memory: number;
    passes: number;
    parallelism: number;
    tagLength: number;
  },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeCryptoWithArgon2.argon2(
      "argon2id",
      {
        message: Buffer.from(password, "utf8"),
        nonce,
        memory: options.memory,
        passes: options.passes,
        parallelism: options.parallelism,
        tagLength: options.tagLength,
      },
      (err: Error | null, derivedKey: Buffer) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

/**
 * Hashes a password using OpenSSL's standard Argon2id KDF built into Node.js (`node:crypto`).
 * Outputs standard PHC string format:
 * `$argon2id$v=19$m=65536,t=3,p=4$<salt_base64_nopad>$<hash_base64_nopad>`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(ARGON2_SALT_LENGTH);
  const derived = await deriveArgon2id(password, salt, {
    memory: ARGON2_MEMORY_KIB,
    passes: ARGON2_PASSES,
    parallelism: ARGON2_PARALLELISM,
    tagLength: ARGON2_TAG_LENGTH,
  });

  const saltB64 = salt.toString("base64").replace(/=+$/, "");
  const hashB64 = derived.toString("base64").replace(/=+$/, "");
  return `$argon2id$v=19$m=${ARGON2_MEMORY_KIB},t=${ARGON2_PASSES},p=${ARGON2_PARALLELISM}$${saltB64}$${hashB64}`;
}

/**
 * Verifies a password against an Argon2id PHC hash in constant time.
 */
export async function verifyPassword(
  password: string,
  storedPhcHash: string,
): Promise<boolean> {
  const parts = storedPhcHash.split("$");
  // Expected: ["", "argon2id", "v=19", "m=...,t=...,p=...", "<salt>", "<hash>"]
  if (parts.length !== 6 || parts[1] !== "argon2id") {
    return false;
  }

  const paramsPart = parts[3];
  const saltPart = parts[4];
  const hashPart = parts[5];
  if (!paramsPart || !saltPart || !hashPart) {
    return false;
  }

  const paramMap = new Map<string, number>();
  for (const kv of paramsPart.split(",")) {
    const [key, rawVal] = kv.split("=");
    const parsed = Number.parseInt(rawVal ?? "", 10);
    if (!key || !Number.isFinite(parsed) || parsed <= 0) {
      return false;
    }
    paramMap.set(key, parsed);
  }

  const memory = paramMap.get("m");
  const passes = paramMap.get("t");
  const parallelism = paramMap.get("p");
  if (!memory || !passes || !parallelism) {
    return false;
  }

  const salt = Buffer.from(saltPart, "base64");
  const expectedHash = Buffer.from(hashPart, "base64");
  if (salt.length < 8 || expectedHash.length < 16) {
    return false;
  }

  try {
    const actualHash = await deriveArgon2id(password, salt, {
      memory,
      passes,
      parallelism,
      tagLength: expectedHash.length,
    });

    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    return crypto.timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}
