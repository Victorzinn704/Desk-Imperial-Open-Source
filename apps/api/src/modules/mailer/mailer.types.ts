type DeliveryMode = 'brevo-api' | 'log'

export type DeliveryPreference = DeliveryMode | 'auto'

export type DeliveryResult = {
  mode: DeliveryMode
  messageId?: string | null
}

export type TransactionalEmailPayload = {
  to: string
  subject: string
  text: string
  html: string
  fallbackLogMessage: string
  tags: string[]
}

export type TransactionalEmailContent = Pick<TransactionalEmailPayload, 'html' | 'subject' | 'tags' | 'text'>

export type TransactionalEmailDispatch = {
  to: string
  content: TransactionalEmailContent
  fallbackLogMessage: string
}

export type MailTemplateContext = {
  appName: string
  supportEmail: string
}
