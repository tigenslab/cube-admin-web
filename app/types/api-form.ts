export interface ApiFormFieldSchema {
  title?: string
  type?: string
  enum?: unknown[]
  default?: unknown
  format?: string
  readOnly?: boolean
  const?: unknown
  items?: ApiFormFieldSchema
  oneOf?: Array<{ const?: unknown; title?: string }>
  properties?: Record<string, ApiFormFieldSchema>
  additionalProperties?: boolean
}

export interface ApiFormSchema {
  type?: string
  title?: string
  properties?: Record<string, ApiFormFieldSchema>
}

export interface ApiNewForm<T = Record<string, unknown>> {
  schema: ApiFormSchema
  model: T
}

const validationKeywords = new Set([
  'required',
  'pattern',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
  'dependencies',
  'dependentRequired',
  'dependentSchemas',
  'not',
  'if',
  'then',
  'else',
  'allOf',
  'anyOf',
])

export function apiFormDisplaySchema(schema: ApiFormSchema): ApiFormSchema {
  function cleanField(field: ApiFormFieldSchema): ApiFormFieldSchema {
    const clean = Object.fromEntries(
      Object.entries(field).filter(([key]) => !validationKeywords.has(key)),
    ) as ApiFormFieldSchema

    if (field.properties) {
      clean.properties = Object.fromEntries(
        Object.entries(field.properties).map(([key, child]) => [key, cleanField(child)]),
      )
    }
    if (field.items) clean.items = cleanField(field.items)

    return clean
  }

  return cleanField(schema)
}
