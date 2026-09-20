import net from "node:net";

interface Ipv4Range {
  base: number;
  bits: number;
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function range(cidr: string): Ipv4Range {
  const [base, bits] = cidr.split("/");
  return { base: ipv4ToInt(base), bits: Number(bits) };
}

// Faixas bloqueadas (docs/DOCUMENTATION.md seção 5.4, item 3): loopback, link-local
// (inclui o metadado de nuvem 169.254.169.254), redes privadas, CGNAT, multicast,
// reservado, broadcast e blocos de documentação/teste.
const BLOCKED_IPV4_RANGES: Ipv4Range[] = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "255.255.255.255/32",
].map(range);

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return BLOCKED_IPV4_RANGES.some(({ base, bits }) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (base & mask);
  });
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 (ULA)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true; // fe80::/10 (link-local)
  }
  if (normalized.startsWith("ff")) return true; // ff00::/8 (multicast)

  // IPv4-mapped (::ffff:a.b.c.d) e NAT64 (64:ff9b::/96): valida o IPv4 embutido.
  const mappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedMatch) return isBlockedIpv4(mappedMatch[1]);
  const nat64Match = normalized.match(/^64:ff9b::(\d+\.\d+\.\d+\.\d+)$/);
  if (nat64Match) return isBlockedIpv4(nat64Match[1]);

  return false;
}

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIpv4(ip);
  if (net.isIPv6(ip)) return isBlockedIpv6(ip);
  return true; // não reconhecido -> nega por padrão
}
