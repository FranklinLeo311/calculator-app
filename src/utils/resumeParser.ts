import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

// Flat list of all skills (must stay in sync with SKILL_CATEGORIES in ProfileScreen)
const ALL_SKILLS = [
    'React','Vue','Angular','HTML/CSS','JavaScript','TypeScript','Next.js','Tailwind',
    'Node.js','.NET','Java','Python','PHP','Go','Ruby','Spring Boot','FastAPI',
    'React Native','Flutter','iOS/Swift','Android/Kotlin','Expo',
    'Manual Testing','Selenium','Jest','Cypress','Appium','Playwright','JUnit','QA Automation',
    'MySQL','PostgreSQL','MongoDB','Redis','Oracle','SQL Server','Firebase',
    'AWS','Azure','GCP','Docker','Kubernetes','CI/CD','Jenkins','Terraform',
    'Git','Jira','Agile/Scrum','Figma','REST APIs','GraphQL','Microservices',
];

// Aliases map: lowercase alias → canonical skill name
const ALIASES: Record<string, string> = {
    'react.js':'React','reactjs':'React',
    'vue.js':'Vue','vuejs':'Vue',
    'angular.js':'Angular','angularjs':'Angular',
    'html':'HTML/CSS','css':'HTML/CSS','html5':'HTML/CSS','css3':'HTML/CSS',
    'js':'JavaScript','es6':'JavaScript','es2015':'JavaScript',
    'ts':'TypeScript',
    'next':'Next.js','nextjs':'Next.js',
    'node':'Node.js','nodejs':'Node.js','node.js':'Node.js',
    'dotnet':'.NET','asp.net':'.NET','c#':'.NET','csharp':'.NET',
    'spring':'Spring Boot','springboot':'Spring Boot',
    'fastapi':'FastAPI','fast api':'FastAPI',
    'rn':'React Native','react-native':'React Native',
    'ios':'iOS/Swift','swift':'iOS/Swift',
    'android':'Android/Kotlin','kotlin':'Android/Kotlin',
    'flutter':'Flutter',
    'manual test':'Manual Testing','qa':'QA Automation','quality assurance':'QA Automation',
    'selenium':'Selenium','webdriver':'Selenium',
    'cypress':'Cypress','playwright':'Playwright','appium':'Appium',
    'junit':'JUnit','junit5':'JUnit',
    'postgres':'PostgreSQL','postgresql':'PostgreSQL',
    'mongo':'MongoDB','mongodb':'MongoDB',
    'sql server':'SQL Server','mssql':'SQL Server',
    'redis':'Redis','firebase':'Firebase','oracle':'Oracle',
    'amazon web services':'AWS','aws':'AWS',
    'microsoft azure':'Azure','azure':'Azure',
    'google cloud':'GCP','gcp':'GCP',
    'docker':'Docker','kubernetes':'Kubernetes','k8s':'Kubernetes',
    'ci/cd':'CI/CD','cicd':'CI/CD','github actions':'CI/CD','gitlab ci':'CI/CD',
    'jenkins':'Jenkins','terraform':'Terraform',
    'git':'Git','github':'Git','gitlab':'Git','bitbucket':'Git',
    'jira':'Jira','confluence':'Jira',
    'scrum':'Agile/Scrum','agile':'Agile/Scrum','kanban':'Agile/Scrum',
    'figma':'Figma','sketch':'Figma',
    'rest':'REST APIs','restful':'REST APIs','api':'REST APIs',
    'graphql':'GraphQL',
    'microservice':'Microservices','microservices':'Microservices',
};

export type ParsedResume = {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    linkedIn?: string;
    github?: string;
    location?: string;
    experienceYears?: number;
    skills: string[];
    rawText: string;
    fileName: string;
    sizeKb: number;
    base64Uri: string;   // stored for re-display
};

// ── PDF text extraction ──────────────────────────────────────────────────────
function extractPdfText(pdfString: string): string {
    let text = '';

    // Extract strings inside parentheses inside BT...ET blocks (most common)
    const btBlocks = pdfString.match(/BT[\s\S]{0,3000}?ET/g) ?? [];
    for (const block of btBlocks) {
        const strings = block.match(/\(([^)\\]|\\.)*\)/g) ?? [];
        for (const s of strings) {
            text += s.slice(1, -1)
                .replace(/\\n/g, ' ')
                .replace(/\\r/g, ' ')
                .replace(/\\\(/g, '(')
                .replace(/\\\)/g, ')') + ' ';
        }
    }

    // Fallback: scan for long readable ASCII sequences (works for many simple PDFs)
    if (text.replace(/\s/g, '').length < 100) {
        const seqs = pdfString.match(/[A-Za-z][A-Za-z0-9 .,+#@\-/&()']{8,}/g) ?? [];
        text = seqs.join(' ');
    }

    return text;
}

// ── Skill matching ───────────────────────────────────────────────────────────
function detectSkills(text: string): string[] {
    const lower = text.toLowerCase();
    const found = new Set<string>();

    // Direct skill name match
    for (const skill of ALL_SKILLS) {
        if (lower.includes(skill.toLowerCase())) found.add(skill);
    }

    // Alias match
    for (const [alias, canonical] of Object.entries(ALIASES)) {
        if (lower.includes(alias)) found.add(canonical);
    }

    return Array.from(found);
}

// ── Contact & location extraction ────────────────────────────────────────────
function extractContactInfo(text: string): {
    email?: string; phone?: string; linkedIn?: string; github?: string;
    location?: string; experienceYears?: number;
} {
    const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/(?:\+?\d[\s\-.]?)?(?:\(?\d{3}\)?[\s\-.]?)?\d{3}[\s\-.]?\d{4}/);
    const linkedInMatch = text.match(/linkedin\.com\/in\/([A-Za-z0-9\-_%]+)/i);
    const githubMatch = text.match(/github\.com\/([A-Za-z0-9\-_%]+)/i);

    // Location: look for "City, State" or "City, Country" patterns near keywords
    let location: string | undefined;
    const locationMatch = text.match(
        /(?:location|address|city|based in)[:\s]+([A-Za-z\s,]+(?:Tamil Nadu|Maharashtra|Karnataka|Telangana|Delhi|India|remote))/i
    ) ?? text.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)?,\s*(?:Tamil Nadu|Maharashtra|Karnataka|Telangana|Delhi NCR|Noida|Gurgaon|Kochi|Coimbatore|Mumbai|Bangalore|Hyderabad|Pune|Chennai|India|Remote))\b/);
    if (locationMatch) location = locationMatch[1].trim();

    // Experience years: "X years", "X+ years", "X yrs"
    let experienceYears: number | undefined;
    const expMatch = text.match(/(\d+)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)/i)
        ?? text.match(/experience[:\s]+(\d+)\s*\+?\s*(?:years?|yrs?)/i);
    if (expMatch) {
        const n = parseInt(expMatch[1], 10);
        if (!isNaN(n) && n >= 0 && n <= 40) experienceYears = n;
    }

    return {
        email: emailMatch?.[0],
        phone: phoneMatch?.[0]?.trim(),
        linkedIn: linkedInMatch ? `linkedin.com/in/${linkedInMatch[1]}` : undefined,
        github: githubMatch ? `github.com/${githubMatch[1]}` : undefined,
        location,
        experienceYears,
    };
}

// ── Name / title heuristics ──────────────────────────────────────────────────
function extractNameAndTitle(text: string): { name?: string; title?: string } {
    const lines = text
        .split(/[\n\r|]+/)
        .map(l => l.trim())
        .filter(l => l.length >= 3 && l.length <= 60);

    let name: string | undefined;
    let title: string | undefined;

    const skipPatterns = /resume|curriculum|vitae|@|linkedin|github|http|phone|mobile|email|address|\d{5,}/i;
    const titlePatterns = /software|developer|engineer|analyst|tester|qa|designer|manager|lead|architect|consultant|intern|associate|specialist/i;

    for (const line of lines.slice(0, 12)) {
        if (skipPatterns.test(line)) continue;
        if (!name && /^[A-Z][a-z]+ [A-Z]/.test(line)) {
            name = line;
            continue;
        }
        if (!title && titlePatterns.test(line)) {
            title = line;
        }
    }

    return { name, title };
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function pickAndParseResume(): Promise<ParsedResume | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf','text/plain',
               'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
    });

    const res = result as any;
    if (res.type === 'cancel') return null;
    const asset = res.assets?.[0] ?? res;
    if (!asset?.uri) return null;

    const mime: string = asset.mimeType ?? 'application/octet-stream';
    const fileName: string = asset.name ?? 'resume';

    // Read file as base64
    const b64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const sizeKb = Math.round((b64.length * 3) / 4 / 1024);
    const base64Uri = `data:${mime};base64,${b64}`;

    // Decode to raw string for text extraction
    let rawText = '';
    try {
        if (mime === 'text/plain') {
            rawText = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.UTF8,
            });
        } else {
            // atob is available in React Native hermes
            rawText = extractPdfText(atob(b64));
        }
    } catch { /* rawText stays empty — skills won't auto-detect */ }

    const skills = detectSkills(rawText);
    const { name, title } = extractNameAndTitle(rawText);
    const contact = extractContactInfo(rawText);

    return { name, title, ...contact, skills, rawText, fileName, sizeKb, base64Uri };
}
