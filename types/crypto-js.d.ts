declare module "crypto-js" {
  const CryptoJS: {
    AES: {
      encrypt: (data: string, key: string) => { toString: () => string };
      decrypt: (ciphertext: string, key: string) => { toString: (encoder: { Utf8: string }) => string };
    };
    enc: {
      Utf8: string;
      Hex: string;
    };
    SHA256: (data: string) => { toString: () => string };
  };
  export default CryptoJS;
}
