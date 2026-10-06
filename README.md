## dataverse-poc-agents

Marketplace di plugin per agenti Copilot dedicati alle POC su Dataverse e Power Platform. Uso interno.

| Plugin | Versione | Descrizione |
| --- | --- | --- |
| [dataverse-poc](plugins/dataverse-poc/README.md) | 1.0.0 | Orchestratore multi-agente per POC: prototipo HTML/YAML, datamodel, dati demo, form/viste/sitemap, generative page, PCF, web resource, code app, test, deploy |

### Struttura

```text
.github/plugin/marketplace.json   # elenco plugin del marketplace
plugins/dataverse-poc/
  plugin.json                     # manifest (formato Copilot)
  hooks.json                      # hook PreToolUse poc-guard
  agents/                         # orchestratore + sotto-agenti poc-*
  skills/                         # skill dataverse-poc-* e prototype-dataverse-app
  scripts/poc-guard.cjs           # script del hook
scripts/validate-plugin.mjs       # validazione strutturale
```

### Sviluppo

```powershell
node scripts/validate-plugin.mjs
```

Il validator controlla manifest, frontmatter di skill e agenti (`name` uguale alla cartella), sotto-agenti referenziati in `agents:`, link Markdown relativi e script del hook.

Prima di ogni rilascio aggiornare `version` sia in `plugins/<plugin>/plugin.json` sia in `.github/plugin/marketplace.json`, e il `CHANGELOG.md` del plugin: senza bump di versione VS Code non propone l'aggiornamento.

Non inserire nomi di clienti, URL di ambiente, app id, connection id o segreti: il plugin è condiviso fra progetti.
