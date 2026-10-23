export interface ApiFormFieldSchema {
  title?: string
  type?: string
  enum?: unknown[]
  default?: unknown
  format?: string
  pattern?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  readOnly?: boolean
  uniqueItems?: boolean
  items?: ApiFormFieldSchema
  oneOf?: Array<{ const?: unknown; title?: string }>
  properties?: Record<string, ApiFormFieldSchema>
  additionalProperties?: boolean
}

export interface ApiFormSchema {
  type?: string
  title?: string
  required?: string[]
  properties?: Record<string, ApiFormFieldSchema>
}

export interface ApiNewForm<T = Record<string, unknown>> {
  schema: ApiFormSchema
  model: T
}
