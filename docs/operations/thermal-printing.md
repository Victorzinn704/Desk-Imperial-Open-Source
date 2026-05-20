# Impressao Termica

**Estado:** canonico
**Ultima atualizacao:** 2026-05-05

## Fluxo Atual

A impressao termica e uma integracao de borda do caixa, nao do servidor Oracle.

```text
Browser do caixa -> QZ Tray/Web Serial/Web USB/Web Bluetooth -> impressora local/LAN
API Oracle -> estado da comanda, pagamento e historico
```

O deploy Oracle entrega a API e a web. A impressora continua dependendo do dispositivo do operador, permissao do navegador e QZ Tray quando esse provedor for usado.

## Provedores Suportados

- `QZ_TRAY`: preferido no desktop/caixa com impressora instalada no Windows ou na LAN.
- `WEB_SERIAL`: impressoras USB-serial/COM quando o navegador suportar.
- `WEB_USB`: impressoras USB classe printer quando autorizadas pelo navegador.
- `WEB_BLUETOOTH`: experimental; depende de suporte do navegador e do hardware.

## Variaveis e Cliente

Para QZ em rede local:

```env
NEXT_PUBLIC_QZ_TRAY_LAN_IP=
NEXT_PUBLIC_QZ_TRAY_CONNECT_ORIGINS=
```

Helper local:

```powershell
node scripts/setup-qz-lan-ip.mjs
```

## Certificado QZ Tray

Use o script abaixo para instalar o certificado publico da QZ Tray e guardar a private key sem colar a chave em chats, issues ou commits:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-qz-tray-certificate.ps1
```

Se a chave privada ja estiver salva em arquivo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-qz-tray-certificate.ps1 -PrivateKeyPath "C:\caminho\private_key.pem"
```

O script grava os arquivos em `.secrets/qz-tray`, restringe permissao no Windows e atualiza `apps/web/.env.local` com:

- `QZ_TRAY_CERTIFICATE_PATH`
- `QZ_TRAY_CERTIFICATE_SHA256`
- `QZ_TRAY_PRIVATE_KEY_ENCRYPTED_PATH`
- `QZ_TRAY_PRIVATE_KEY_ENCRYPTION_KEY`
- `QZ_TRAY_PRIVATE_KEY_SHA256`

O hash SHA-256 identifica e valida a chave, mas nao substitui a chave original: QZ Tray precisa de assinatura RSA real. Por isso a chave fica criptografada em repouso e so e descriptografada no servidor web no momento da assinatura. A chave privada nunca deve ser enviada para o frontend; o browser chama endpoints internos que assinam o payload.

### Diagnostico Assinado

Depois de configurar certificado e chave, valide com uma sessao autenticada:

```text
GET /api/printing/qz/health
```

Resposta esperada:

```json
{
  "materialConfigured": true,
  "certificateAvailable": true,
  "signatureAvailable": true,
  "signedModeReady": true
}
```

Se `signedModeReady=true` e o QZ ainda pedir aceite em toda impressao, o problema normalmente esta no trust local do QZ Tray, bloqueio de websocket local por extensao/navegador, Site Manager do QZ ou origem diferente da configurada. Nesse caso, a API nao esta retornando `204`; o cliente esta chegando ao QZ sem a relacao de confianca local consolidada.

Endpoints relacionados:

- `GET /api/printing/qz/certificate`: entrega o certificado publico.
- `POST /api/printing/qz/sign`: assina payloads do QZ sem expor private key ao browser.
- `GET /api/printing/qz/health`: verifica o material completo.

## Checklist de Caixa

1. Abrir QZ Tray no PC do caixa.
2. Permitir websocket/certificado QZ no navegador.
3. Desativar bloqueio de websocket local em uBlock/AdGuard/Brave Shields para o domínio do app.
4. Selecionar provedor e impressora no card de configuracao termica.
5. Imprimir teste curto antes da abertura do caixa.
6. Fechar uma comanda de teste e validar que os itens, totais e modalidade de pagamento saem no cupom operacional.

## Regras de Produto

- A impressao nunca deve bloquear a confirmacao financeira.
- Falha de impressao deve virar erro operacional visivel e reimprimivel.
- Pagamento confirmado pelo Mercado Pago deve permitir reimpressao com dados da transacao.
- Webhook no Oracle nao imprime sozinho; ele atualiza estado para o caixa conectado disparar a impressao local.

## PWA Android e Bluetooth

O provedor `WEB_BLUETOOTH` e experimental e depende de Bluetooth Low Energy/GATT. Muitas impressoras 80mm baratas, incluindo modelos vendidos como YYX0808, podem operar como Bluetooth Classic/SPP. Nesse caso, o Chrome Android nao consegue falar direto via Web Bluetooth.

Fluxo recomendado:

1. tente parear a impressora no Android;
2. no PWA, selecione `WEB_BLUETOOTH` e tente descoberta;
3. se nao aparecer ou nao expuser caracteristica gravavel, use `QZ_TRAY` em um PC da LAN ou um print agent local;
4. para operacao profissional, trate impressao como integracao de borda do caixa, nao como responsabilidade do Oracle.

Regra pratica: nuvem nao imprime em uma impressora local sem um agente/hardware local que receba o job. O servidor pode enfileirar e auditar; quem conversa com USB/Bluetooth/LAN e o dispositivo do estabelecimento.

## Evidencias de Codigo

- `apps/web/lib/printing/thermal-print.client.ts`
- `apps/web/lib/printing/qz-tray.client.ts`
- `apps/web/lib/printing/web-serial.client.ts`
- `apps/web/lib/printing/web-usb.client.ts`
- `apps/web/lib/printing/web-bluetooth.client.ts`
- `apps/web/lib/printing/comanda-thermal.ts`
- `apps/web/components/shared/thermal-print-settings-card.tsx`
