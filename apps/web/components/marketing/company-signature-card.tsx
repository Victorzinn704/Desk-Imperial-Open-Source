'use client'

export function CompanySignatureCard() {
  return (
    <div className="imperial-signature-card">
      <div className="imperial-signature-card__border" />
      <div className="imperial-signature-card__content">
        <div className="imperial-signature-card__crest">
          <span className="imperial-signature-card__crest-main">DI</span>
          <span className="imperial-signature-card__crest-second">DI</span>
          <span className="imperial-signature-card__trail" />
        </div>
        <p className="imperial-signature-card__company">Desk Imperial</p>
        <p className="imperial-signature-card__summary">
          Operacao comercial, visao executiva e controle empresarial em uma camada unica.
        </p>
      </div>
      <span className="imperial-signature-card__bottom">Desk Imperial</span>
    </div>
  )
}
