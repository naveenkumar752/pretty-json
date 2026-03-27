import Ajv from "ajv"
import addFormats from "ajv-formats"

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateWithSchema(data: any, schema: any): SchemaValidationResult {
  try {
    const validate = ajv.compile(schema)
    const valid = validate(data)
    
    if (!valid) {
      return {
        isValid: false,
        errors: validate.errors?.map(err => {
          const path = err.instancePath || "root";
          return `${path}: ${err.message}`;
        }) || ["Unknown validation error"]
      }
    }
    
    return { isValid: true, errors: [] };
  } catch (e: any) {
    return {
      isValid: false,
      errors: [`Invalid Schema: ${e.message}`]
    };
  }
}
export function generateSchemaFromData(data: any): any {
  if (data === null) {
    return { type: "null" }
  }

  const type = typeof data

  if (type === "string") {
    return { type: "string" }
  }

  if (type === "number") {
    return { type: "number" }
  }

  if (type === "boolean") {
    return { type: "boolean" }
  }

  if (Array.isArray(data)) {
    const itemsSchema = data.length > 0 
      ? generateSchemaFromData(data[0]) 
      : { type: "string" }
    return {
      type: "array",
      items: itemsSchema
    }
  }

  if (type === "object") {
    const properties: any = {}
    const required: string[] = []

    Object.entries(data).forEach(([key, value]) => {
      properties[key] = generateSchemaFromData(value)
      required.push(key)
    })

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined
    }
  }

  return { type: "string" }
}
