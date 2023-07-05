function generateCodeVerifier() {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const verifierLength = 128;
    let codeVerifier = '';
    for (let i = 0; i < verifierLength; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        codeVerifier += charset.charAt(randomIndex);
    }
    return codeVerifier;
}

function sha256(plainText: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(arrayBuffer: any) {
    const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer) as any));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function generateCodeChallenge() {
    const codeVerifier = generateCodeVerifier();
    const sha = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(sha);
    return {
        codeVerifier,
        codeChallenge,
    };
}
