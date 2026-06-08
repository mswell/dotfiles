export interface PromptSignals {
	labels: string[];
	length: number;
	isAck: boolean;
	isSimple: boolean;
	hasImages: boolean;
	hasCodeBlocks: boolean;
	hasFilePaths: boolean;
	hasCodePatterns: boolean;
	explicitCodex: boolean;
	explicitGemini: boolean;
	explicitGeminiPro: boolean;
	explicitGeminiFlash: boolean;
	explicitOpenCode: boolean;
	explicitOpenCodeFast: boolean;
	explicitOpenCodeWork: boolean;
	explicitMaxReasoning: boolean;
	security: boolean;
	securityHeavy: boolean;
	bugbounty: boolean;
	implementation: boolean;
	debug: boolean;
	architecture: boolean;
	largeContext: boolean;
	summarization: boolean;
	report: boolean;
	pocOrScript: boolean;
	critical: boolean;
	codingScore: number;
	securityScore: number;
}

const ACK_PATTERNS = [
	/^(yes|no|sim|não|nao|ok|okay|thanks|obrigado|valeu|beleza|sure|yep|nope|nah|s|n|y)\.?$/i,
	/^(continua|continue|go|vai|próximo|proximo|next|done|feito|pronto)\.?$/i,
];

const SIMPLE_KEYWORDS = [
	"what is", "o que é", "what's", "define", "explain", "explica",
	"resumo", "summary", "translate", "traduzir", "format", "formata",
	"mostra", "show me", "lista", "list", "read the file", "lê o arquivo",
];

const SUMMARIZATION_KEYWORDS = [
	"summarize", "summary", "resuma", "resumo", "cluster", "clusteriza",
	"map", "mapeia", "mapear", "inventory", "inventário", "inventario",
	"extract", "extrai", "extrair", "classifica", "classify", "compare", "compara",
];

const IMPLEMENTATION_KEYWORDS = [
	"implement", "implementation", "build", "create", "edit", "change", "fix",
	"patch", "write code", "add tests", "test suite", "refactor", "migrate",
	"implementar", "implementa", "criar", "edita", "editar", "alterar",
	"ajustar", "corrigir", "corrige", "consertar", "adicionar teste",
	"criar teste", "refatorar", "migrar",
];

const DEBUG_KEYWORDS = [
	"debug", "diagnose", "stacktrace", "stack trace", "failing test", "error",
	"exception", "regression", "reproduce", "repro", "race condition", "deadlock",
	"depurar", "diagnosticar", "erro", "teste falhando",
	"regressão", "regressao", "reproduzir", "condição de corrida", "condicao de corrida",
];

const ARCHITECTURE_KEYWORDS = [
	"architecture", "system design", "design do sistema", "adr", "rfc", "prd",
	"domain driven", "ddd", "hexagonal", "clean architecture", "distributed",
	"microservices", "event sourcing", "cqrs", "proposal", "estratégia",
	"estrategia", "arquitetura", "plano", "planejar", "proposta",
];

const SECURITY_KEYWORDS = [
	"bug bounty", "bugbounty", "hackerone", "pentest", "vulnerability",
	"vulnerabilidade", "exploit", "xss", "ssrf", "idor", "bola", "authz",
	"authorization", "authentication", "csrf", "sqli", "injection", "rce",
	"privilege escalation", "pii", "caido", "burp", "payload", "cve",
	"segurança", "seguranca", "falha", "autorização", "autorizacao",
];

const SECURITY_HEAVY_KEYWORDS = [
	"business logic", "lógica de negócio", "logica de negocio", "impact",
	"impacto", "reportable", "reportabilidade", "auth bypass", "bypass",
	"exploitability", "explorabilidade", "chain", "cadeia", "privilege escalation",
	"account takeover", "ato", "multi-tenant", "tenant", "access control",
	"controle de acesso", "authorization bypass", "idor", "bola", "pii",
];

const REPORT_KEYWORDS = [
	"report", "writeup", "hackerone report", "bugcrowd", "impact narrative",
	"steps to reproduce", "remediation", "relatório", "relatorio", "draft",
	"escreva o report", "prepara o report", "prepare o report",
];

const POC_KEYWORDS = [
	"poc", "proof of concept", "curl", "script", "exploit script", "reproducer",
	"reprodução", "reproducao", "payload", "controlled script", "teste controlado",
];

function includesAny(text: string, keywords: readonly string[]): boolean {
	return keywords.some((keyword) => text.includes(keyword));
}

function countMatches(text: string, keywords: readonly string[]): number {
	return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function add(labels: string[], condition: boolean, label: string): void {
	if (condition) labels.push(label);
}

export function extractSignals(
	prompt: string,
	options: { hasImages?: boolean; roughContextTokens?: number; recentToolCalls?: number } = {},
): PromptSignals {
	const text = prompt.toLowerCase().trim();
	const length = prompt.trim().length;
	const labels: string[] = [];

	const isAck = length <= 30 && ACK_PATTERNS.some((pattern) => pattern.test(text));
	const hasImages = !!options.hasImages;
	const hasCodeBlocks = prompt.includes("```") || prompt.includes("~~~");
	const hasFilePaths = /[\w./-]+\.(ts|tsx|js|jsx|py|rs|go|java|cpp|c|h|rb|php|sh|yaml|yml|json|toml|sql|md|css|scss|html|vue|svelte)\b/.test(prompt);
	const hasCodePatterns = /\b(function|const|let|var|import|export|class|interface|type|def |fn |func |pub |async |await)\b/.test(prompt);

	const explicitCodex = /\b(use|usa|usar|route|roteia|rotear)\b[^\n]{0,50}\b(codex|gpt|gpt-5\.5)\b/i.test(prompt) || /\b(codex|gpt-5\.5)\b[^\n]{0,50}\b(nessa|agora|this)\b/i.test(prompt);
	const explicitGeminiPro = /\bgemini\b[^\n]{0,40}\b(pro|strong|forte|profundo)\b/i.test(prompt) || /\b(pro|strong|forte|profundo)\b[^\n]{0,40}\bgemini\b/i.test(prompt);
	const explicitGeminiFlash = /\bgemini\b[^\n]{0,40}\b(flash|barato|cheap|rápido|rapido)\b/i.test(prompt) || /\b(flash|barato|cheap|rápido|rapido)\b[^\n]{0,40}\bgemini\b/i.test(prompt);
	const explicitGemini = explicitGeminiPro || explicitGeminiFlash || /\b(use|usa|usar|route|roteia|rotear)\b[^\n]{0,40}\bgemini\b/i.test(prompt);
	const explicitOpenCode = /\b(use|usa|usar|route|roteia|rotear)\b[^\n]{0,60}\b(opencode|open code|opencodego|open code go|qwen|deepseek|kimi|mimo|minimax|glm)\b/i.test(prompt) || /\b(opencode|opencodego|qwen|deepseek|kimi|mimo|minimax|glm)\b[^\n]{0,50}\b(nessa|agora|this|execute|executa|codar|implementar)\b/i.test(prompt);
	const explicitOpenCodeFast = explicitOpenCode && /\b(flash|fast|rápido|rapido|cheap|barato|triage|classificador|classifier|deepseek-v4-flash|mimo-v2\.5)\b/i.test(prompt);
	const explicitOpenCodeWork = explicitOpenCode && /\b(qwen|qwen3\.7|max|deepseek-v4-pro|pro|executor|executa|execução|execucao|implementation|implementar|codar|code)\b/i.test(prompt);
	const explicitMaxReasoning = /\b(xhigh|reasoning máximo|reasoning maximo|thinking máximo|thinking maximo|raciocínio máximo|raciocinio maximo)\b/i.test(prompt);

	const codingKeywordScore = countMatches(text, IMPLEMENTATION_KEYWORDS);
	const codingScore = codingKeywordScore + (hasCodeBlocks ? 3 : 0) + (hasFilePaths ? 2 : 0) + (hasCodePatterns ? 2 : 0);
	const securityScore = countMatches(text, SECURITY_KEYWORDS);
	const securityHeavyScore = countMatches(text, SECURITY_HEAVY_KEYWORDS);

	const security = securityScore > 0;
	const securityHeavy = securityHeavyScore > 0 || securityScore >= 3;
	const bugbounty = text.includes("bug bounty") || text.includes("bugbounty") || text.includes("hackerone") || text.includes("caido") || text.includes("burp") || text.includes("pentest");
	const implementation = codingScore > 0;
	const debug = includesAny(text, DEBUG_KEYWORDS);
	const architecture = includesAny(text, ARCHITECTURE_KEYWORDS);
	const summarization = includesAny(text, SUMMARIZATION_KEYWORDS);
	const report = includesAny(text, REPORT_KEYWORDS);
	const pocOrScript = includesAny(text, POC_KEYWORDS);
	const largeContext = length > 1400 || (options.roughContextTokens ?? 0) > 120_000;
	const critical = explicitMaxReasoning || (securityHeavy && (text.includes("critical") || text.includes("crítico") || text.includes("critico") || text.includes("account takeover") || text.includes("rce"))) || (architecture && length > 800) || (debug && length > 1000);
	const isSimple = !isAck && length < 100 && includesAny(text, SIMPLE_KEYWORDS);

	add(labels, isAck, "ack");
	add(labels, isSimple, "simple");
	add(labels, hasImages, "images");
	add(labels, hasCodeBlocks, "code-blocks");
	add(labels, hasFilePaths, "file-paths");
	add(labels, explicitCodex, "explicit-codex");
	add(labels, explicitGeminiPro, "explicit-gemini-pro");
	add(labels, explicitGeminiFlash, "explicit-gemini-flash");
	add(labels, explicitOpenCode, "explicit-opencode");
	add(labels, explicitOpenCodeFast, "explicit-opencode-fast");
	add(labels, explicitOpenCodeWork, "explicit-opencode-work");
	add(labels, security, "security");
	add(labels, securityHeavy, "security-heavy");
	add(labels, bugbounty, "bugbounty");
	add(labels, implementation, "implementation");
	add(labels, debug, "debug");
	add(labels, architecture, "architecture");
	add(labels, largeContext, "large-context");
	add(labels, summarization, "summarization");
	add(labels, report, "report");
	add(labels, pocOrScript, "poc-script");
	add(labels, critical, "critical");
	if ((options.recentToolCalls ?? 0) >= 6) labels.push("tool-heavy-session");

	return {
		labels,
		length,
		isAck,
		isSimple,
		hasImages,
		hasCodeBlocks,
		hasFilePaths,
		hasCodePatterns,
		explicitCodex,
		explicitGemini,
		explicitGeminiPro,
		explicitGeminiFlash,
		explicitOpenCode,
		explicitOpenCodeFast,
		explicitOpenCodeWork,
		explicitMaxReasoning,
		security,
		securityHeavy,
		bugbounty,
		implementation,
		debug,
		architecture,
		largeContext,
		summarization,
		report,
		pocOrScript,
		critical,
		codingScore,
		securityScore,
	};
}
