import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sniffImage } from "../file-security";
import { isValidBackgroundUrl } from "../validations";

describe("upload content sniffing", () => {
  it("detects PNG", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
    assert.equal(sniffImage(png)?.type, "image/png");
    assert.equal(sniffImage(png)?.ext, "png");
  });

  it("detects JPEG", () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    assert.equal(sniffImage(jpg)?.type, "image/jpeg");
  });

  it("detects GIF87a and GIF89a", () => {
    assert.equal(sniffImage(Buffer.from("GIF87a", "ascii"))?.type, "image/gif");
    assert.equal(sniffImage(Buffer.from("GIF89a", "ascii"))?.type, "image/gif");
  });

  it("detects WebP", () => {
    assert.equal(sniffImage(Buffer.from("RIFF0000WEBPxx", "ascii"))?.type, "image/webp");
  });

  it("rejects HTML/script payloads claimed as images", () => {
    const evil = Buffer.from("<html><script>alert(1)</script></html>", "ascii");
    assert.equal(sniffImage(evil), null);
  });

  it("rejects short and empty buffers", () => {
    assert.equal(sniffImage(Buffer.alloc(0)), null);
    assert.equal(sniffImage(Buffer.from([0x89, 0x50])), null);
  });

  it("accepts a real PNG header regardless of trailing data", () => {
    const poly = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from("GIF8a", "ascii"),
    ]);
    assert.equal(sniffImage(poly)?.ext, "png");
  });
});

describe("template background URL validation", () => {
  it("accepts root-relative app paths", () => {
    assert.ok(isValidBackgroundUrl("/uploads/templates/tmpl_a.png"));
  });

  it("accepts absolute http(s) URLs", () => {
    assert.ok(isValidBackgroundUrl("https://cdn.example.com/bg.png"));
    assert.ok(isValidBackgroundUrl("http://internal/bg.png"));
  });

  it("rejects protocol-relative URLs", () => {
    assert.ok(!isValidBackgroundUrl("//evil.com/x.png"));
    assert.ok(!isValidBackgroundUrl("/\\evil.com/x.png"));
  });

  it("rejects data:, javascript:, and file: schemes", () => {
    assert.ok(!isValidBackgroundUrl("data:image/svg+xml;base64,AAAA"));
    assert.ok(!isValidBackgroundUrl("javascript:alert(1)"));
    assert.ok(!isValidBackgroundUrl("file:///etc/passwd"));
  });

  it("rejects non-URL garbage", () => {
    assert.ok(!isValidBackgroundUrl("not a url"));
  });
});
