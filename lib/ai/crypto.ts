/**
 * LLM Provider API Key 本地加密（S1.53）
 *
 * 目标：不再明文存储 API Key（此前等同 Hermes .env 明文行为）。
 * 方案：AES-256-GCM，密钥从「本机稳定指纹 + 应用固定 pepper」派生，密钥本身不落库。
 *
 * 边界与说明：
 * - 密钥派生自 hostname + username + platform + homedir（Node os 只读信息），
 *   同一台机器同一用户下稳定；换机器 / 换用户后无法解密旧密文 → 读取端返回 null，
 *   UI 提示「原 Key 无法解密，请重新填写」（不会崩溃，不会回退成明文）。
 * - 密文格式：v1:<iv_b64>.<ciphertext_b64>.<tag_b64>
 * - 本工具仍是「本机单用户」场景，不替代真正的密钥管理 / 系统钥匙串；
 *   防护目标是「数据库文件被复制/被 grep 时不直接暴露明文 Key」。
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { hostname, homedir, platform } from "node:os";
import { userInfo } from "node:os";

const PEPPER = "ai-workspace::llm-key::v1";
const PREFIX = "v1:";

function machineFingerprint(): string {
  const parts = [
    hostname(),
    typeof userInfo === "function" ? (() => { try { return userInfo().username; } catch { return ""; } })() : "",
    platform(),
    homedir(),
  ];
  return parts.join("|");
}

function deriveKey(): Buffer {
  return createHash("sha256").update(`${PEPPER}::${machineFingerprint()}`).digest();
}

/** 加密明文 Key → 密文串；空输入返回 null */
export function encryptApiKey(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}.${enc.toString("base64")}.${tag.toString("base64")}`;
}

/** 解密密文串 → 明文；格式非法或密钥不匹配（换机/换用户）返回 null */
export function decryptApiKey(enc: string | null | undefined): string | null {
  if (!enc) return null;
  if (!enc.startsWith(PREFIX)) return null;
  const body = enc.slice(PREFIX.length);
  const [ivB64, dataB64, tagB64] = body.split(".");
  if (!ivB64 || !dataB64 || !tagB64) return null;
  try {
    const key = deriveKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

/** 判断密文是否可解（用于 UI 展示「Key 已配置但无法解密」） */
export function isApiKeyDecryptable(enc: string | null | undefined): boolean {
  return decryptApiKey(enc) !== null;
}
