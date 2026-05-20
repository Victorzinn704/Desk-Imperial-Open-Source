# Brevo: Dominio e Sender

## Ponto mais importante

O envio transacional do projeto agora depende da `API HTTPS` da Brevo.

Para isso funcionar em producao, voce precisa de duas coisas no painel da Brevo:

- uma `API key` valida em `Brevo API > API Keys`
- um `sender` valido para o email definido em `EMAIL_FROM_EMAIL`

## Estrutura recomendada

Separe o portal do subdominio de envio:

- `app.seudominio.com.br` para o site
- `api.seudominio.com.br` para a API
- `send.seudominio.com.br` para a reputacao de email

Exemplo:

- site: `app.deskimperial.online`
- API: `api.deskimperial.online`
- envio transacional: `send.deskimperial.online`
- remetente: `no-reply@send.deskimperial.online`
- resposta: `suporte@deskimperial.online`

## Passo a passo

1. No painel da Brevo, abra `Senders, Domains & Dedicated IPs`.
2. Adicione o dominio ou subdominio de envio que voce controla.
3. Copie exatamente os registros DNS mostrados pela Brevo.
4. Adicione esses registros no painel DNS do seu dominio.
5. Aguarde a propagacao.
6. Valide o dominio no painel da Brevo.
7. Depois adicione o sender final, como `no-reply@send.seudominio.com.br`.

## Registros que costumam aparecer

- `DKIM`
- `SPF`
- `MX` de feedback
- `DMARC` opcional, mas recomendado

Observacao:

- os nomes e valores exatos devem ser copiados do painel da Brevo
- nao invente manualmente os registros

## Variaveis depois da validacao

No runtime da API:

```env
EMAIL_PROVIDER=brevo
BREVO_API_URL=https://api.brevo.com/v3/smtp/email
BREVO_API_KEY=sua-api-key-real-da-brevo
EMAIL_FROM_NAME=DESK IMPERIAL
EMAIL_FROM_EMAIL=no-reply@send.seudominio.com.br
EMAIL_REPLY_TO=suporte@seudominio.com.br
EMAIL_SUPPORT_ADDRESS=suporte@seudominio.com.br
APP_NAME=DESK IMPERIAL
```

## O que quebra o envio

Se o email nao sair, confira primeiro:

- a chave configurada e realmente uma `API key` da Brevo, e nao login Brevo
- `EMAIL_FROM_EMAIL` existe como sender valido no painel
- o dominio do sender passou na validacao DNS
- a API key foi atualizada no host/secret store correto

## Diferenca entre portal e email

- `app.seudominio.com.br` publica o portal
- `api.seudominio.com.br` publica o backend
- `send.seudominio.com.br` protege a reputacao do remetente dos emails

Os tres podem existir ao mesmo tempo e cada um resolve uma parte da operacao.
