export type DiagnosticStatus = 'PASS' | 'FAIL' | 'WARNING' | 'INCONCLUSIVE' | 'NOT_TESTED';
export type EvidenceSourceType = 'LIVE_TEST' | 'CAPTURE_ANALYSIS' | 'LAB_EVIDENCE' | 'SIMULATED';

export type FailurePoint =
  | 'PHYSICAL_OR_LOCAL_INTERFACE'
  | 'DEFAULT_GATEWAY'
  | 'ROUTING_AND_TRANSIT'
  | 'DNS_RESOLUTION'
  | 'TARGET_SERVICE_PORT'
  | 'NETWORK_CONGESTION_PACKET_LOSS'
  | 'NONE_HEALTHY'
  | 'INCONCLUSIVE';

export interface DiagnosticObservation {
  testName: string;
  stage: 'INTERFACE' | 'GATEWAY' | 'ROUTING' | 'DNS' | 'TRANSPORT' | 'PACKET_CAPTURE';
  status: DiagnosticStatus;
  evidenceSource: EvidenceSourceType;
  details: string;
  metric?: string | number;
  limitations?: string;
}

export interface ComprehensiveDiagnosisReport {
  id: string;
  target: string;
  timestamp: string;
  mode: EvidenceSourceType;
  overallStatus: 'CONNECTED_AND_HEALTHY' | 'CONNECTED_DEGRADED' | 'DISCONNECTED_OR_FAILED' | 'INCONCLUSIVE';
  mostLikelyFailurePoint: FailurePoint;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  primaryHeadline: string;
  technicalRootCause: string;
  observations: DiagnosticObservation[];
  testsPassed: string[];
  testsFailed: string[];
  testsInconclusive: string[];
  testsNotTested: string[];
  alternativeExplanations: string[];
  recommendedSteps: string[];
  limitationsStatement: string;
}

export interface StoredDiagnosticRecord {
  id: string;
  timestamp: string;
  target: string;
  mode: string;
  testType: string;
  overallStatus: string;
  mostLikelyFailurePoint: string;
  confidence: string;
  primaryHeadline: string;
  technicalRootCause: string;
  report: ComprehensiveDiagnosisReport;
}

export interface ParsedPacket {
  frameNumber: number;
  timestamp: number;
  timestampIso: string;
  length: number;
  protocol: string;
  sourceIp: string;
  destinationIp: string;
  sourcePort?: number;
  destinationPort?: number;
  tcpFlags?: {
    syn: boolean;
    ack: boolean;
    rst: boolean;
    fin: boolean;
    psh: boolean;
    raw: string;
  };
  icmpDetails?: {
    type: number;
    code: number;
    typeName: string;
  };
  dnsDetails?: {
    queryName?: string;
    isResponse: boolean;
    rcode?: number;
    rcodeName?: string;
    answersCount?: number;
  };
  summary: string;
  layerDetails?: Record<string, any>;
}

export interface CaptureAnalysisResult {
  fileName: string;
  fileSizeBytes: number;
  parserUsed: 'TSHARK' | 'NATIVE_PCAP_PARSER';
  tsharkVersion?: string;
  totalPackets: number;
  durationSeconds: number;
  protocolBreakdown: Record<string, number>;
  packets: ParsedPacket[];
  dnsSummary: {
    queriesCount: number;
    responsesCount: number;
    unansweredQueries: string[];
    errorResponses: Array<{ query: string; rcode: number; rcodeName: string }>;
  };
  tcpSummary: {
    synSent: number;
    synAckReceived: number;
    resets: number;
    unacknowledgedSyns: number;
  };
  icmpSummary: {
    echoRequests: number;
    echoReplies: number;
    unreachableCount: number;
    messages: Array<{ type: number; code: number; meaning: string; src: string; dst: string }>;
  };
  keyFindings: string[];
  limitations: string;
}

export interface TopologyNodeData {
  id: string;
  label: string;
  role: string;
  ip?: string;
  mac?: string;
  status: 'SUCCESS' | 'FAIL' | 'WARNING' | 'NEUTRAL';
  evidenceSource: EvidenceSourceType;
  details?: string;
  latency?: string;
}

export interface EducationalScenario {
  id: string;
  title: string;
  badge: 'SIMULATED';
  summary: string;
  problemStatement: string;
  academicConcept: string;
  targetHost: string;
  targetPort?: number;
  expectedBehavior: string;
  ciscoConfigRef: string;
  pcapSampleRef: string;
  topologyNodes: Array<{
    id: string;
    label: string;
    ip?: string;
    status: 'SUCCESS' | 'FAIL' | 'WARNING' | 'NEUTRAL';
    evidenceSource: EvidenceSourceType;
    tooltip: string;
  }>;
  observations: DiagnosticObservation[];
  precomputedDiagnosis: ComprehensiveDiagnosisReport;
}

export interface ToolsStatus {
  tshark: {
    isAvailable: boolean;
    version?: string;
    executablePath?: string;
    backendParser: 'TSHARK' | 'NATIVE_PCAP_PARSER';
    diagnosticNotice: string;
    installationGuide: {
      windows: string;
      linux: string;
      macos: string;
      downloadUrl: string;
    };
  };
  systemTools: {
    pingAvailable: boolean;
    tracerouteAvailable: boolean;
    dnsResolverAvailable: boolean;
    socketApiAvailable: boolean;
  };
  environment: {
    platform: string;
    architecture: string;
    nodeVersion: string;
  };
}

export interface SubnetInfo {
  name?: string;
  networkAddress: string;
  cidr: number;
  subnetMask: string;
  firstUsableIp: string;
  lastUsableIp: string;
  broadcastAddress: string;
  totalHosts: number;
  usableHosts: number;
}

export interface VlsmPlanResult {
  baseNetwork: string;
  baseCidr: number;
  subnets: SubnetInfo[];
  totalAllocatedHosts: number;
  hasOverlap: boolean;
  overlaps: Array<{ subnet1: string; subnet2: string }>;
}
