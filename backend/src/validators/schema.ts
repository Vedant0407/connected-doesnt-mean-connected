import { z } from 'zod';

// Strict regex for domain name (RFC 1123) or IPv4 address
const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const localhostRegex = /^localhost$/i;

export const diagnosticTargetSchema = z.string().trim().refine(
  (val) => domainRegex.test(val) || ipv4Regex.test(val) || localhostRegex.test(val),
  {
    message: 'Target must be a valid domain name (e.g. google.com), IPv4 address (e.g. 8.8.8.8), or "localhost". Special characters and shell symbols are rejected.',
  }
);

export const runDiagnosticSchema = z.object({
  target: diagnosticTargetSchema,
  testType: z.enum([
    'QUICK',
    'COMPREHENSIVE',
    'DNS_ONLY',
    'TCP_PORT_ONLY',
    'GATEWAY_ONLY',
    'TRACEROUTE_ONLY',
  ]).default('COMPREHENSIVE'),
  customDnsServer: z.string().trim().regex(ipv4Regex, 'Custom DNS server must be a valid IPv4 address').optional(),
  tcpPort: z.number().int().min(1).max(65535).default(80),
  runTraceroute: z.boolean().default(false),
});

export const exportReportSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
  format: z.enum(['json', 'csv']).default('json'),
});

export const compareRunsSchema = z.object({
  runId1: z.string().min(1),
  runId2: z.string().min(1),
});

export const vlsmCalculatorSchema = z.object({
  baseNetwork: z.string().trim().regex(ipv4Regex, 'Base network must be a valid IPv4 address'),
  baseCidr: z.number().int().min(8).max(30),
  requirements: z.array(
    z.object({
      name: z.string().min(1).max(50),
      requiredHosts: z.number().int().min(1).max(65534),
    })
  ).min(1, 'At least one subnet requirement is needed'),
});
