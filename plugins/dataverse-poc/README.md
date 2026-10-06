## dataverse-poc

Plugin per agenti Copilot (VS Code e Copilot CLI) che gestisce le **POC su Dataverse / Power Platform** con un orchestratore e sotto-agenti specializzati. Contenuti e istruzioni sono in italiano.

### Cosa contiene

| Componente | Tipo | Visibile all'utente | Ruolo |
| --- | --- | --- | --- |
| `Dataverse POC Orchestrator` | agente | sì | Pianifica, apre gli stage con conferma, delega, verifica, aggiorna il piano |
| `poc-prototype-builder` | agente | no | Prototipo HTML/YAML (model-driven o code app), componenti simulati, build |
| `poc-datamodel` | agente | no | Standard vs custom (Microsoft Learn), contratto YAML; in stage R tabelle, colonne, choice, relazioni, chiavi con PACX |
| `poc-demo-data` | agente | no | Dataset sintetici YAML; in stage R seed dei record |
| `poc-forms-views` | agente | no | Form, viste, app module, sitemap con AppMaker MCP e PACX |
| `poc-genpage` | agente | no | Una generative page per invocazione: `.tsx`, compilazione, upload |
| `poc-pcf` | agente | no | Controlli PCF: manifest, implementazione, PCF Workbench, push |
| `poc-webresources` | agente | no | JavaScript di form, HTML/CSS, icone tabelle, comandi ribbon |
| `poc-code-app` | agente | no | Power Apps code app (React/Vite) per POC `appType: code-app` |
| `poc-tester` | agente | no | Verifica indipendente: validator, smoke test Playwright, metadata, browser |
| `poc-deployer` | agente | no | Preflight ambiente, solution, publish, export/import, inventario cleanup |
| `dataverse-poc-planner` | skill | `/` | appType, scope, schermate, percorso demo |
| `dataverse-poc-schema` | skill | `/` | Contratto Dataverse di tabelle e colonne |
| `dataverse-poc-model-driven` | skill | `/` | Prototipo model-driven con chrome Dynamics 365 CE |
| `dataverse-poc-code-app` | skill | `/` | Prototipo code app |
| `dataverse-poc-pipeline` | skill | `/` | Scaffold, validator, build, smoke test, copertura requisiti |
| `dataverse-poc-realization` | skill | no | Contratto multi-agente: stage gate, brief/report, ownership, guardrail, gotcha |
| `prototype-dataverse-app` | skill | no | Riferimenti e asset condivisi (schema YAML, shell D365, app standard, smoke test) |
| `poc-guard` | hook `PreToolUse` | — | Chiede conferma prima di comandi PAC/PACX distruttivi, cambi di ambiente, URL espliciti, import di solution |

I sotto-agenti hanno `user-invocable: false`: non compaiono nel selettore e li usa solo l'orchestratore, che li elenca in `agents:`.

### Come funziona

```mermaid
flowchart LR
    U[Utente] --> O[Dataverse POC Orchestrator]
    O -->|stage P| PB[poc-prototype-builder]
    O -->|stage P/R| DM[poc-datamodel]
    O --> DD[poc-demo-data]
    O -->|stage R| DEP[poc-deployer]
    O --> FV[poc-forms-views]
    O --> GP[poc-genpage x N]
    O --> PCF[poc-pcf]
    O --> WR[poc-webresources]
    O --> CA[poc-code-app]
    O --> T[poc-tester]
```

| Stage | Cosa produce | Gate |
| --- | --- | --- |
| P — Prototipo | YAML + HTML runtime/statico con componenti simulati | `appType` deciso con l'utente |
| R — Realizzazione DEV | Metadata, dati demo, UI, pagine, controlli in un ambiente DEV | Prototipo validato e ambiente, solution, prefisso, LCID confermati |
| D — Rilascio | Export/import verso altri ambienti | Conferma per ogni rilascio |

L'orchestratore tiene lo stato in un **documento di piano** (`POC/Piano_<Iniziativa>_<Cliente>.md`) con la tabella `🎯 Target ambiente`. Ogni sotto-agente riceve un brief autosufficiente e restituisce un report standard (`COMPLETATO` / `PARZIALE` / `BLOCCATO`). Il contratto completo è in [dataverse-poc-realization](skills/dataverse-poc-realization/SKILL.md).

### Prerequisiti

- Node.js (validator, build e smoke test delle POC; script del hook).
- `pac` (Power Platform CLI) e `pacx` per lo stage R; profili di autenticazione già creati dall'utente.
- Edge o Chrome installati per lo smoke test (`playwright-core` non scarica browser).
- Server MCP configurati nell'installazione di VS Code. Gli agenti li referenziano con questi nomi; gli strumenti non disponibili vengono ignorati:

| Nome atteso | Uso |
| --- | --- |
| `local-microsoftdocs/mcp` | Microsoft Learn: riuso tabelle standard, documentazione |
| `appmaker` | AppMaker (Dataverse): metadata, form, viste, app module, sitemap |
| `local-playwright` | Verifiche nel browser |
| `icons` | Icone delle tabelle |
| `local-microsoft/markitdown` | Conversione di documenti sorgente in Markdown |

Le skill di altri plugin richiamate per nome (`pacx-*`, `appmaker-*`, `pcf-*`, `genpage`, `create-code-app`, `deploy`, `model-driven-ribbon-*`, `test-automation`) arrivano dai plugin Power Platform e P.R.I.S.M.A. già installati: senza di loro gli agenti funzionano ma con meno guida.

### Installazione

- **Cartella locale**: aggiungere in `settings.json` `"chat.pluginLocations": { "<percorso>/plugins/dataverse-poc": true }`.
- **Da Git**: dopo il push, comando **Chat: Install Plugin From Source** con l'URL del repository.
- **Marketplace**: aggiungere il repository a `chat.plugins.marketplaces`; il manifest è in `.github/plugin/marketplace.json`.

Se un repository contiene già copie locali degli stessi agenti o skill (in `.github/agents/` o `.github/skills/`), rimuoverle: i nomi duplicati confondono la scelta del sotto-agente.

### Uso

1. Selezionare l'agente **Dataverse POC Orchestrator**.
2. Descrivere requisiti, POC esistente o cartella, e fin dove arrivare (prototipo, realizzazione DEV, rilascio).
3. Rispondere alle domande su `appType`, prefisso e, prima dello stage R, su ambiente e solution.

### Limiti noti

- Il hook usa la decisione `ask`. In VS Code apre la conferma; in Copilot CLI il comportamento dipende dal supporto di `ask` nella versione in uso.
- Il hook ispeziona solo i comandi da terminale e gli strumenti MCP con `delete` nel nome: non sostituisce i permessi in Dataverse.
- Lo smoke test presuppone le convenzioni dei renderer della skill (`[data-nav]`, `tr[data-open]`, `[data-form-tab]`, `.sim-frame`).
