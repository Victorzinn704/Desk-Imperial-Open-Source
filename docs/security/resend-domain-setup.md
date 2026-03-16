# Resend: Dominio e Sender

## Ponto mais importante

O dominio `imperial-desk-web-production.up.railway.app` nao serve como dominio de envio no Resend.

Motivo:

- ele pertence a Railway
- voce nao controla a zona DNS desse dominio
- sem controle de DNS, voce nao consegue validar DKIM, SPF e DMARC

## Estrutura recomendada

Use dois enderecos separados:

- `app.seudominio.com.br` para o site
- `send.seudominio.com.br` para o envio de email

Exemplo:

- site: `app.deskimperial.com.br`
- email transacional: `send.deskimperial.com.br`
- remetente: `no-reply@send.deskimperial.com.br`
- resposta: `suporte@deskimperial.com.br`

## Passo a passo

1. Compre ou use um dominio que seja seu.
2. No provedor DNS desse dominio, mantenha acesso para editar registros.
3. No Resend, adicione o dominio ou subdominio de envio.
4. Copie exatamente os registros mostrados pelo Resend.
5. Adicione esses registros no seu provedor DNS.
6. Aguarde a propagacao e valide o dominio no Resend.

## Registros que costumam aparecer

- `DKIM`
- `SPF`
- `MX` de feedback
- `DMARC` opcional, mas recomendado

Observacao:

- os nomes e valores exatos devem ser copiados do painel do Resend
- nao invente manualmente esses registros

## Variaveis depois da validacao

Na Railway:

```env
RESEND_API_URL=https://api.resend.com/emails
RESEND_API_KEY=sua-chave
RESEND_FROM_EMAIL=no-reply@send.seudominio.com.br
EMAIL_REPLY_TO=suporte@deskimperial.com.br
EMAIL_SUPPORT_ADDRESS=suporte@deskimperial.com.br
SMTP_FROM_NAME=DESK IMPERIAL
APP_NAME=DESK IMPERIAL
```

## Diferenca entre site e email

- `app.seudominio.com.br` publica o portal
- `send.seudominio.com.br` autentica o remetente dos emails

Os dois podem existir ao mesmo tempo e cada um resolve um problema diferente.
