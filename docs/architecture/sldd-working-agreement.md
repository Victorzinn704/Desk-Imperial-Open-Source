# SLDD Working Agreement — Desk Imperial

Fonte base: https://github.com/soujava/sldd-skills

Este projeto adota SLDD como trilho de engenharia para mudanças que exigem controle de qualidade antes de código. O objetivo é manter velocidade com IA sem deixar arquitetura, segurança, versões e testes virarem decisão implícita.

## Quando usar SLDD completo

Use o loop completo antes de implementar mudanças em:

- Segurança, autenticação, sessão, permissões, RBAC, PIN administrativo ou cookies
- Dados financeiros, caixa, folha, pagamentos, gateway, Tap to Pay ou PIX
- Backend, contratos de API, banco, migrations, filas, Redis, realtime ou offline queue
- Upgrade de framework, runtime, SDK, biblioteca crítica ou mudança de build/deploy
- Arquitetura de módulo, extração de serviço, refatoração grande ou novo boundary
- Feature com risco de regressão operacional: PDV, comanda, cozinha, salão, estoque

## Fluxo obrigatório para mudanças grandes

1. **Intento de produto**
   - Problema real
   - Usuário afetado
   - Métricas de sucesso
   - Fora de escopo
   - Riscos
   - Critérios Given/When/Then

2. **Entendimento do código existente**
   - Arquivos e módulos envolvidos
   - Padrões atuais a preservar
   - Pontos de integração
   - Dívidas e riscos já existentes

3. **Desenho técnico alto nível**
   - Boundaries
   - Fluxo de dados
   - Responsabilidades
   - Segurança e observabilidade
   - Alternativas rejeitadas

4. **Desenho baixo nível e política de versões**
   - Contratos de API
   - Modelos de dados
   - Modelo de erro
   - Estratégia de testes
   - Versões permitidas de runtime/framework/dependências
   - Plano de implementação sequenciado

5. **Testes primeiro**
   - Testes unitários para lógica
   - Testes de integração para contratos/dados
   - E2E ou screenshot quando a mudança for visível ao usuário

6. **Implementação mínima**
   - Implementar apenas o que os testes e o plano pedem
   - Qualquer mudança arquitetural fora do plano exige nota de delta

7. **Verificação final**
   - Matriz requisito vs implementação
   - Validação de versões
   - Riscos restantes
   - Decisão explícita de pronto/não pronto

## Versão leve para UI e limpeza visual

Para ajustes de design-lab, responsividade, densidade visual e remoção de ruído:

1. Definir objetivo do usuário em uma frase
2. Localizar a superfície e os componentes reais
3. Fazer mudança pequena e reversível
4. Validar com teste focado, typecheck/build quando aplicável
5. Conferir screenshot quando houver risco visual

Essa versão leve não dispensa SLDD completo quando a UI mexe em fluxo crítico, mutação real, permissão, caixa, venda, comanda ou dados financeiros.

## Checklist para PR ou deploy

- A mudança respeita o padrão existente do módulo?
- Os contratos de API ou dados mudaram? Se sim, estão documentados?
- Há risco de versão ou dependência fora da política atual?
- Segurança, permissões e estados de erro foram considerados?
- Observabilidade/logs suficientes para diagnosticar falha em produção?
- Testes cobrem caminho feliz, erro e pelo menos um edge case relevante?
- Para UI: light/dark, tablet/mobile e screenshot foram verificados quando necessário?
- Há decisão explícita de pronto/não pronto antes do deploy?
