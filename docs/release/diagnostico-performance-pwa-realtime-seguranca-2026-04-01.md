# Diagnostico Tecnico Focado - Performance, PWA, Realtime e Seguranca

Data: 2026-04-01

---

## 1. Performance (frontend)

## Achado P-1 - Hotspots de complexidade em componentes centrais

Diagnostico:

- componentes criticos concentram grande volume de logica de estado, render e regra de negocio.

Evidencia:

- hooks e shells operacionais aparecem entre os maiores arquivos do frontend.

Impacto de produto:

- manutencao mais lenta
- maior chance de regressao em ajustes de UX
- debug mais caro em incidente

Recomendacao:

- extrair modulos por responsabilidade (estado, render, side-effects)
- manter dynamic import para areas de baixa frequencia de uso

Prioridade: P1  
Risco de inacao: medio-alto

---

## Achado P-2 - Invalidações e refetch com potencial de ruido sob alta taxa de eventos

Diagnostico:

- fallback de invalidacao em tempo real e correto, mas pode aumentar churn de rede em cenarios de alta mutacao.

Evidencia:

- estrategia mistura patch local + invalidacao com debounce.

Impacto de produto:

- custo de rede e CPU maior em pico
- degradacao perceptivel em dispositivos mais fracos

Recomendacao:

- ampliar cobertura de patch deterministico para eventos frequentes
- manter refetch como ultimo recurso, nao caminho principal

Prioridade: P1  
Risco de inacao: medio

---

## 2. PWA e offline

## Achado W-1 - Registro de Service Worker restrito ao modulo /app

Diagnostico:

- PWA esta funcional para trilha operacional mobile, mas nao cobre toda experiencia da plataforma.

Evidencia:

- registro de SW ocorre no layout mobile do modulo /app.

Impacto de produto:

- usuario percebe comportamento inconsistente entre areas da aplicacao
- expectativa de app instalavel nao se confirma de forma uniforme

Recomendacao:

- definir oficialmente escopo PWA da release
- se objetivo for cobertura ampliada, mover registro para fronteira global controlada

Prioridade: P1  
Risco de inacao: medio

---

## Achado W-2 - Estrategia de cache com versionamento manual

Diagnostico:

- nome de cache fixo exige disciplina manual para cada release.

Impacto de produto:

- chance de servir ativos desatualizados em rollout

Recomendacao:

- versionar cache por release/build id
- formalizar politica de invalidação

Prioridade: P1  
Risco de inacao: medio

---

## 3. Realtime

## Achado R-1 - Arquitetura funcional robusta, mas com acoplamento alto no cliente

Diagnostico:

- backend realtime esta bem desenhado (workspace channels, autenticacao, adapter redis opcional).
- no frontend, reconciliacao de eventos e snapshots esta concentrada em um bloco grande.

Impacto de produto:

- risco de regressao ao evoluir eventos
- curva de entrada alta para novos devs

Recomendacao:

- separar engine de patch por dominio (live/kitchen/summary)
- manter contrato de envelope com schema mais estrito

Prioridade: P1  
Risco de inacao: medio

---

## Achado R-2 - Dependencia de Redis para escala horizontal correta

Diagnostico:

- sem Redis adapter, o realtime opera corretamente apenas em instancia unica.

Impacto de produto:

- em escala horizontal sem Redis, eventos podem nao propagar entre instancias

Recomendacao:

- tratar Redis como obrigatorio para producao com mais de uma instancia
- monitorar health de redis como gate de deploy

Prioridade: P0  
Risco de inacao: alto

---

## 4. Seguranca

## Achado S-1 - Endpoint de insight IA com semantica GET

Diagnostico:

- endpoint com custo externo e processamento usa GET, o que reduz o nivel de intencionalidade da acao.

Impacto de produto:

- possibilidade de acionamento indevido
- risco financeiro por consumo externo

Recomendacao:

- migrar para POST + CSRF
- manter cache por foco para evitar aumento de latencia

Prioridade: P0  
Risco de inacao: alto

---

## Achado S-2 - CSP ainda com unsafe-inline

Diagnostico:

- baseline de seguranca e boa, mas CSP permanece com concessao comum de framework.

Impacto de produto:

- reduz a efetividade da ultima camada de defesa contra injecoes

Recomendacao:

- trilha futura de nonce/hash CSP
- manter sanitizacao e escape como defesa principal no curto prazo

Prioridade: P2  
Risco de inacao: baixo-medio

---

## 5. Conclusao tecnica

O sistema esta forte em base arquitetural e seguranca aplicacional. Os principais riscos de release nao estao no core de negocio, e sim na camada de governanca de release (CI full-stack), hardening de endpoint sensivel e consolidacao de PWA/realtime para escala.

Direcao recomendada:

- fechar P0 imediatamente
- executar P1 na janela curta seguinte
- deixar P2 para evolucao estruturada sem travar liberacao controlada
