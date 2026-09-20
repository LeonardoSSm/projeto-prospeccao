import { describe, expect, it } from "vitest";
import { isBlockedIp } from "./ip-classifier";

describe("isBlockedIp", () => {
  it("blocks loopback addresses", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("::1")).toBe(true);
  });

  it("blocks the cloud metadata link-local address", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
  });

  it("blocks private RFC1918 ranges", () => {
    expect(isBlockedIp("10.0.0.5")).toBe(true);
    expect(isBlockedIp("172.16.5.1")).toBe(true);
    expect(isBlockedIp("192.168.1.1")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 addresses that wrap a blocked IPv4", () => {
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIp("::ffff:10.0.0.1")).toBe(true);
  });

  it("blocks IPv6 unique-local and link-local ranges", () => {
    expect(isBlockedIp("fc00::1")).toBe(true);
    expect(isBlockedIp("fe80::1")).toBe(true);
  });

  it("allows public IPv4 and IPv6 addresses", () => {
    expect(isBlockedIp("93.184.215.14")).toBe(false); // example.com
    expect(isBlockedIp("2606:2800:220:1:248:1893:25c8:1946")).toBe(false);
  });

  it("denies unparseable input by default", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});
