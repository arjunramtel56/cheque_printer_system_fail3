declare module "crypto-js" {
  interface CiphertextParams {
    toString: () => string;
  }
  type Encoder = { toString: () => string };
  interface WordArray {
    toString: (encoder?: Encoder) => string;
  }
  interface CipherParams {
    toString: (encoder?: Encoder) => string;
  }
  const CryptoJS: {
    AES: {
      encrypt: (data: string | object, key: string | WordArray) => CipherParams;
      decrypt: (ciphertext: string | CipherParams, key: string | WordArray) => CipherParams;
    };
    enc: {
      Utf8: WordArray & Encoder;
      Hex: WordArray & Encoder;
    };
    SHA256: (data: string) => WordArray;
    HmacSHA256: (message: string, key: string) => WordArray;
  };
  export default CryptoJS;
}