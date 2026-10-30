// Validates plugin structure: manifests, skill/agent frontmatter, subagent references, relative links, hook and
// plugin scripts referenced by agents and skills, JavaScript syntax.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const BUILTIN_AGENTS = new Set(['Explore', 'Plan']);

const readJson = (file) => {
    try {
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
        errors.push(`${file}: JSON non valido (${e.message})`);
        return null;
    }
};

const frontmatter = (file) => {
    const m = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return null;
    const get = (key) => {
        const r = m[1].match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
        return r ? r[1].trim().replace(/^["']|["']$/g, '') : undefined;
    };
    const list = (key) => {
        const r = m[1].match(new RegExp(`^${key}:\\s*\\[([\\s\\S]*?)\\]`, 'm'));
        return r ? r[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
    };
    return { get, list };
};

const walk = (dir) => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? (n === 'node_modules' || n === '.git' ? [] : walk(p)) : [p];
});

const market = readJson(join(root, '.github', 'plugin', 'marketplace.json'));
for (const entry of market?.plugins ?? []) {
    const pluginDir = resolve(root, entry.source);
    if (!existsSync(pluginDir)) { errors.push(`marketplace: source mancante ${entry.source}`); continue; }
    const manifest = readJson(join(pluginDir, 'plugin.json'));
    if (!manifest) continue;
    if (manifest.name !== entry.name) errors.push(`${entry.name}: name diverso fra marketplace e plugin.json`);
    if (manifest.version !== entry.version) errors.push(`${entry.name}: version diversa fra marketplace (${entry.version}) e plugin.json (${manifest.version})`);

    const skillsDir = join(pluginDir, manifest.skills ?? 'skills');
    for (const skill of readdirSync(skillsDir)) {
        const file = join(skillsDir, skill, 'SKILL.md');
        const fm = existsSync(file) && frontmatter(file);
        if (!fm) { errors.push(`skill ${skill}: SKILL.md o frontmatter mancante`); continue; }
        if (fm.get('name') !== skill) errors.push(`skill ${skill}: name "${fm.get('name')}" diverso dalla cartella`);
        if (!fm.get('description')) errors.push(`skill ${skill}: description mancante`);
    }

    const agentsDir = join(pluginDir, manifest.agents ?? 'agents');
    const agents = readdirSync(agentsDir).filter((f) => f.endsWith('.agent.md')).map((f) => ({ f, fm: frontmatter(join(agentsDir, f)) }));
    const names = new Set(agents.map((a) => a.fm?.get('name')));
    for (const { f, fm } of agents) {
        if (!fm?.get('name') || !fm.get('description')) errors.push(`agent ${f}: name o description mancante`);
        for (const sub of fm?.list('agents') ?? []) {
            if (!names.has(sub) && !BUILTIN_AGENTS.has(sub)) errors.push(`agent ${f}: sotto-agente "${sub}" inesistente`);
        }
    }

    // Plugin scripts named in agents and skills must exist (agents run them by name).
    for (const file of walk(pluginDir).filter((f) => f.endsWith('.md'))) {
        for (const m of readFileSync(file, 'utf8').matchAll(/<plugin-root>\/scripts\/([\w.-]+\.m?c?js)/g)) {
            if (!existsSync(join(pluginDir, 'scripts', m[1]))) errors.push(`${file.replace(root, '.')}: script inesistente scripts/${m[1]}`);
        }
    }

    const hooksFile = join(pluginDir, manifest.hooks ?? 'hooks.json');
    if (existsSync(hooksFile)) {
        for (const script of readFileSync(hooksFile, 'utf8').match(/scripts\/[\w.-]+/g) ?? []) {
            if (!existsSync(join(pluginDir, script))) errors.push(`hooks: script mancante ${script}`);
        }
    }
}

for (const file of walk(root).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const m of text.matchAll(/\]\(([^)\s#]+)(#[^)]*)?\)/g)) {
        const target = m[1];
        if (/^(https?:|mailto:)/.test(target)) continue;
        if (!existsSync(resolve(dirname(file), decodeURIComponent(target)))) errors.push(`${file.replace(root, '.')}: link rotto ${target}`);
    }
}

// Syntax check of every script shipped in the repository (plugin scripts, POC template, assets).
for (const file of walk(root).filter((f) => /\.(mjs|cjs|js)$/.test(f))) {
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (r.status !== 0) errors.push(`${file.replace(root, '.')}: sintassi non valida (${r.stderr.trim().split('\n').find((l) => /Error/.test(l)) ?? ''})`);
}

if (errors.length) {
    errors.forEach((e) => console.error(`ERRORE  ${e}`));
    process.exit(1);
}
console.log('Plugin valido.');
