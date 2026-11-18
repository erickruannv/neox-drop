// NEOX drop V1.1 — mongo shell / mongosh — EXECUTAR SOMENTE EM BASE DE DESENVOLVIMENTO NOVA
// Colecao: neox_drop.products; cria indexes e validador.
// Se a colecao ja existir, nao rode diretamente: avaliar collMod/migracao controlada.

const dbNeox = db.getSiblingDB('neox_drop');

const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['sku','slug','name','brand','category','description','priceCents',
               'currency','active','mainImageUrl','galleryUrls','colorName','sizes','createdAt','updatedAt'],
    properties: {
      _id: { bsonType: 'objectId' },
      sku: { bsonType: 'string', minLength: 1 },
      slug: { bsonType: 'string', minLength: 1 },
      name: { bsonType: 'string', minLength: 1 },
      brand: { bsonType: 'string', minLength: 1 },
      category: { bsonType: 'string', minLength: 1 },
      description: { bsonType: 'string' },
      priceCents: { bsonType: ['int','long'], minimum: 0 },
      currency: { enum: ['BRL'] },
      active: { bsonType: 'bool' },
      mainImageUrl: { bsonType: 'string', minLength: 1 },
      galleryUrls: { bsonType: 'array', minItems: 1, items: { bsonType: 'string' } },
      model3dUrl: { bsonType: 'string' },
      colorName: { bsonType: 'string', minLength: 1 },
      sizes: { bsonType: 'array', minItems: 1, items: {
        bsonType: 'object', required: ['sizeBR','stock'],
        properties: {
          sizeBR: { bsonType: ['int','long'], minimum: 15, maximum: 60 },
          stock: { bsonType: ['int','long'], minimum: 0 }
        }
      }},
      attributes: { bsonType: 'object' },
      featured: { bsonType: 'object', properties: {
        enabled: { bsonType: 'bool' },
        order: { bsonType: ['int','long'], minimum: 1 },
        backgroundHex: { bsonType: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        accentHex: { bsonType: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }
      }},
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' }
    }
  }
};

dbNeox.createCollection('products', {
  validator, validationLevel: 'strict', validationAction: 'error'
});

dbNeox.products.createIndex({ sku: 1 }, { unique: true, name: 'uniq_sku' });
dbNeox.products.createIndex({ slug: 1 }, { unique: true, name: 'uniq_slug' });
dbNeox.products.createIndex({ active: 1, category: 1, createdAt: -1 }, { name: 'catalog_by_category' });
dbNeox.products.createIndex({ active: 1, brand: 1, createdAt: -1 }, { name: 'catalog_by_brand' });
dbNeox.products.createIndex({ active: 1, 'featured.enabled': 1, 'featured.order': 1 }, { name: 'featured_order' });
dbNeox.products.createIndex({ active: 1, 'sizes.sizeBR': 1 }, { name: 'catalog_by_size' });
dbNeox.products.createIndex({ name: 'text', brand: 'text', description: 'text' }, { name: 'catalog_text_search' });

printjson({ database: dbNeox.getName(), collection: 'products', indexes: dbNeox.products.getIndexes() });
