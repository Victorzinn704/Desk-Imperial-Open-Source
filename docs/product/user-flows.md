# Fluxos do Usuário — Desk Imperial

**Versão:** 1.0  
**Última atualização:** 2026-04-01

---

## Como ler este documento

Cada fluxo descreve o caminho que o usuário percorre no sistema para completar uma tarefa.
Os fluxos são baseados no comportamento real do código, não em especificação teórica.

**Atores:**

- **OWNER** — dono do negócio
- **STAFF** — funcionário (garçom, atendente, caixa)

---

## Fluxo 1 — Primeiro acesso (OWNER)

**Objetivo:** criar conta e configurar o negócio pela primeira vez.

```
1. Acessa /cadastro
2. Preenche nome, e-mail e senha
3. Sistema envia e-mail de verificação via Brevo
4. Acessa o link de verificação
5. Conta ativada — redireciona para /dashboard
6. Configura perfil da empresa (nome, endereço, cidade)
   → geocodificação via Nominatim acontece em background
7. Cadastra produtos em Portfólio
8. Cadastra funcionários em Equipe
9. Configura Admin PIN (opcional mas recomendado)
10. Pronto para operar
```

**Pontos de atenção:**

- E-mail de verificação tem validade configurável (`EMAIL_VERIFICATION_TTL_MINUTES`)
- Geocodificação do endereço tem timeout curto para não travar o cadastro (`REGISTRATION_GEOCODING_TIMEOUT_MS=1800`)
- Se a geocodificação falhar, o cadastro continua normalmente (`REGISTRATION_GEOCODING_STRICT=false`)

---

## Fluxo 2 — Login diário

**Objetivo:** entrar no sistema no início do expediente.

```
1. Acessa /login
2. Informa e-mail e senha
3. Sistema valida credenciais e cria sessão
   → cookie de sessão: HttpOnly, Secure, SameSite
   → cookie CSRF emitido para mutações
4. Redireciona para /dashboard (OWNER) ou /app/staff (STAFF)
5. Sistema carrega dados do workspace em paralelo (products, employees, operations)
```

**Rate limit:** 5 tentativas de login a cada 15 minutos. Após o limite, bloqueio de 15 minutos.

---

## Fluxo 3 — Abertura e atendimento de comanda (STAFF)

**Objetivo:** registrar um pedido do cliente e acompanhar o atendimento.

```
1. Acessa o PDV
2. Clica em "Nova comanda"
3. Informa nome ou CPF/CNPJ do cliente
   → CPF/CNPJ validado com algoritmo real
4. Adiciona itens da comanda (produtos do portfólio ativo)
5. Aplica desconto se necessário
   → desconto acima do limite exige Admin PIN
6. Salva a comanda — status: Aberta
7. Arrasta comanda para "Em Preparo" quando a cozinha começa
8. Arrasta para "Pronta" quando o pedido está pronto
9. Arrasta para "Fechada" quando o cliente paga
10. Sistema registra o fechamento no financeiro
```

**Tempo real:** cada mudança de status é propagada via Socket.IO para todos os dispositivos conectados ao workspace imediatamente.

---

## Fluxo 4 — Fechamento do dia (OWNER)

**Objetivo:** encerrar o expediente com visão completa do que aconteceu.

```
1. Acessa Financeiro
2. Vê KPIs do dia: receita, custo, margem, número de atendimentos
3. Vê ranking de vendedores do dia
4. Vê top produtos vendidos
5. Exporta CSV com os pedidos do dia (se precisar)
6. Fecha o caixa no módulo de Operações
   → registra fechamento com valor e responsável
7. Acessa Folha de Pagamento
   → sistema já calculou salário + comissão de cada funcionário
8. Visualiza o mapa de vendas — de onde vieram os clientes do dia
```

---

## Fluxo 5 — Gestão de estoque via pedido

**Objetivo:** garantir que o estoque seja descontado automaticamente ao vender.

```
1. OWNER cadastra produto com quantidade em estoque
2. STAFF cria pedido com o produto
3. Sistema valida estoque disponível em transação serializable
   → se não houver estoque suficiente, pedido é rejeitado com erro claro
4. Pedido confirmado → estoque decrementado automaticamente
5. Se pedido for cancelado → estoque revertido automaticamente
```

**Proteção:** a validação usa `SERIALIZABLE` isolation level para evitar venda duplicada em concorrência.

---

## Fluxo 6 — Insight executivo com IA (OWNER)

**Objetivo:** obter um resumo do desempenho do negócio assistido por IA.

```
1. OWNER acessa a seção de IA no painel
2. Seleciona moeda e foco da análise
3. Sistema verifica cache Redis (TTL 15 minutos)
   → se cache válido: retorna resultado imediatamente
   → se cache expirado: faz requisição ao Gemini
4. Gemini gera resumo estruturado com base nos dados do workspace
5. Resultado exibido no painel
6. Sistema salva no cache para próximas requisições
```

**Rate limit:** 6 requisições a cada 60 minutos por workspace. Proteção de custo de API.

---

## Fluxo 7 — Recuperação de senha

**Objetivo:** recuperar acesso quando a senha é esquecida.

```
1. Acessa /recuperar-senha
2. Informa o e-mail cadastrado
3. Sistema envia e-mail com código temporário via Brevo
4. Acessa /redefinir-senha e informa o código
5. Define nova senha
6. Redireciona para login
```

**Segurança:**

- Token de reset tem validade configurável (`PASSWORD_RESET_TTL_MINUTES=30`)
- Rate limit em cada etapa para evitar abuso
- Código inválido após uso — não pode ser reutilizado

---

## Fluxo 8 — Acesso do funcionário

**Objetivo:** funcionário entra no sistema para trabalhar.

```
1. Acessa /login com suas credenciais de funcionário
2. Sistema autentica e identifica o papel: STAFF
3. Redireciona para /app/staff (mobile) ou PDV (desktop)
4. Funcionário vê apenas:
   - PDV e comandas
   - Calendário
   - Suas próprias vendas
5. Seções de financeiro, folha, configurações: inacessíveis
```

**Isolamento:** todas as queries do STAFF filtram por `companyOwnerId` do workspace — nunca acessa dados de outro negócio.

---

## Fluxo 9 — Configuração do calendário comercial

**Objetivo:** planejar eventos e promoções e correlacionar com vendas.

```
1. OWNER acessa Calendário
2. Cria evento: nome, data, tipo (promoção, jogo, data especial)
3. Arrasta evento para reposicionar no calendário se necessário
4. No fechamento do período, vê as vendas correlacionadas com os eventos daqueles dias
5. Usa essa informação para planejar os próximos eventos
```

---

## Fluxo 10 — Verificação via Admin PIN

**Objetivo:** proteger uma ação sensível (ex: aplicar desconto acima do limite).

```
1. STAFF tenta aplicar desconto acima do permitido
2. Sistema exibe modal solicitando Admin PIN
3. STAFF (ou OWNER presente) digita o PIN de 4 dígitos
4. Sistema valida o PIN server-side com challenge efêmero
   → PIN correto: ação liberada, prova armazenada em cookie HttpOnly
   → PIN incorreto: erro, tentativa registrada
5. Após 3 tentativas incorretas: PIN bloqueado por 5 minutos
```

**Segurança:** a prova de verificação do PIN nunca fica exposta no JavaScript do cliente.

---

## Diagrama resumido dos fluxos principais

```
Cadastro → Verificação de e-mail → Login
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                 OWNER                               STAFF
                    │                                   │
          ┌─────────┼─────────┐                    PDV mobile
          │         │         │                         │
      Financeiro  PDV ao    Equipe              Abrir comanda
      Folha       vivo      Calendário          Adicionar itens
      Mapa        Mapa      Relatórios          Mover status
      IA          Export                        Fechar comanda
```
