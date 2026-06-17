# Template De Diagnóstico Técnico

**Uso:** reproduzir e comunicar problemas de API, integração ou fluxo operacional.  
**Regra:** não colar token, cookie, senha, PIN, documento real, segredo, terminal ID real ou dado sensível de cliente.

## 1. Identificação

```text
Título:
Data/hora:
Ambiente: local | staging | produção | demo
Superfície: web | PWA owner | PWA staff | API externa | webhook | worker
Fluxo afetado: auth | produto | comanda | cozinha | caixa | pagamento | impressão | Telegram | barcode
Severidade: baixa | média | alta | crítica
Status: investigando | reproduzido | mitigado | resolvido | escalado
```

## 2. Relato original

```text
O que foi reportado:
Quem reportou:
Frequência: uma vez | intermitente | sempre
Impacto percebido:
```

## 3. Contexto técnico sanitizado

```text
Usuário/role:
Workspace/owner:
Endpoint:
Método:
Query string:
Status code:
x-request-id:
User-Agent:
Origem/Referer:
```

Não registrar valores reais de `Cookie`, `Authorization`, `X-CSRF-Token`, `MERCADO_PAGO_*`, `TELEGRAM_*`, `QZ_*`, `DATABASE_URL` ou credenciais.

## 4. Request sanitizado

```http
POST /api/v1/exemplo HTTP/1.1
Host: api.local
Content-Type: application/json
X-CSRF-Token: <redacted>
Cookie: <redacted>
X-Request-Id: <request-id>
```

```json
{
  "campo": "valor-sanitizado"
}
```

## 5. Resposta obtida

```text
Status:
x-request-id:
Mensagem:
Código de erro, se houver:
```

```json
{
  "message": "exemplo sanitizado",
  "requestId": "req_..."
}
```

## 6. Resultado esperado

```text
O que deveria acontecer:
Por que deveria acontecer:
Regra de negócio/documento relacionado:
```

## 7. Passos de reprodução

1. Preparar ambiente e usuário.
2. Executar login ou obter sessão válida.
3. Executar a requisição com payload sanitizado.
4. Registrar status code e `x-request-id`.
5. Conferir estado no banco com query read-only.
6. Conferir logs/Sentry/Faro pelo identificador.
7. Repetir para confirmar se é determinístico ou intermitente.

## 8. Hipóteses

| Hipótese | Como validar | Resultado |
| -------- | ------------ | --------- |
|          |              |           |

## 9. Logs e observabilidade

```text
Fonte: API logs | Sentry | Faro | Prometheus | worker logs | browser console
Filtro usado:
Evidência:
```

## 10. SQL read-only usado

```sql
-- Cole apenas SELECTs sanitizados.
-- Não incluir dado pessoal real em prints ou anexos.
```

Resultado resumido:

```text

```

## 11. Causa raiz

```text
Categoria: uso incorreto | contrato/API | permissão | regra de negócio | integração externa | infraestrutura | bug
Causa raiz:
Evidência que sustenta:
```

## 12. Comunicação para cliente/desenvolvedor

```text
Identificamos que ...
Evidência: ...
Para corrigir/contornar: ...
Se o problema persistir, envie: endpoint, horário, status code e x-request-id.
```

## 13. Decisão

```text
Resolvido por documentação:
Resolvido por configuração:
Precisa de correção de código:
Precisa de rollback:
Precisa de incidente:
Precisa de melhoria preventiva:
```

## 14. Prevenção

- [ ] Adicionar teste unitário ou e2e.
- [ ] Atualizar OpenAPI/contrato.
- [ ] Atualizar documentação de erro.
- [ ] Criar alerta.
- [ ] Criar caso no `developer-support-case-studies.md`.
- [ ] Registrar postmortem se impactou produção.
