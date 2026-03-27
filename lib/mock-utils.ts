import { faker } from '@faker-js/faker'

export function generateMockData(template: any, count: number): any[] {
  const mocks: any[] = []
  
  for (let i = 0; i < count; i++) {
    mocks.push(generateSingleRecord(template))
  }
  
  return mocks
}

function generateSingleRecord(template: any): any {
  if (template === null) return null
  
  if (Array.isArray(template)) {
    // For arrays, we generate a small array based on the first element's type
    const itemTemplate = template.length > 0 ? template[0] : "string"
    return Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => 
      generateSingleRecord(itemTemplate)
    )
  }
  
  if (typeof template === 'object') {
    const record: any = {}
    Object.keys(template).forEach(key => {
      record[key] = generateValueForKey(key, template[key])
    })
    return record
  }
  
  // Primitives
  return generatePrimitive(typeof template)
}

function generateValueForKey(key: string, value: any): any {
  const k = key.toLowerCase()
  
  // Smart mapping based on key names
  if (k.includes('email')) return faker.internet.email()
  if (k.includes('name') || k.includes('first') || k.includes('last')) return faker.person.fullName()
  if (k.includes('id') || k.includes('uuid')) return faker.string.uuid()
  if (k.includes('phone')) return faker.phone.number()
  if (k.includes('address') || k.includes('street')) return faker.location.streetAddress()
  if (k.includes('city')) return faker.location.city()
  if (k.includes('country')) return faker.location.country()
  if (k.includes('company')) return faker.company.name()
  if (k.includes('date') || k.includes('created') || k.includes('updated')) return faker.date.recent().toISOString()
  if (k.includes('avatar') || k.includes('image') || k.includes('url')) return faker.image.avatar()
  if (k.includes('description') || k.includes('bio') || k.includes('text')) return faker.lorem.paragraph()
  if (k.includes('price') || k.includes('amount') || k.includes('cost')) return parseFloat(faker.commerce.price())
  
  // Fallback to type-based generation
  if (typeof value === 'object') return generateSingleRecord(value)
  return generatePrimitive(typeof value)
}

function generatePrimitive(type: string): any {
  switch (type) {
    case 'string': return faker.word.noun()
    case 'number': return faker.number.int({ min: 1, max: 1000 })
    case 'boolean': return faker.datatype.boolean()
    default: return faker.word.sample()
  }
}
