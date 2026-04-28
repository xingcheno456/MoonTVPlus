async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const dataToSign = encoder.encode(data);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generateHmacSignature(
  data: string,
  secret: string,
): Promise<string> {
  if (!secret) {
    throw new Error('generateHmacSignature: secret is required');
  }

  try {
    return await hmacSha256(secret, data);
  } catch (error) {
    throw new Error(
      `generateHmacSignature failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function verifyHmacSignature(
  data: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!secret || !signature) {
    return false;
  }

  try {
    const expected = await hmacSha256(secret, data);
    if (expected.length !== signature.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}
