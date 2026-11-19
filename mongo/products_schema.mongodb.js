// Executar explicitamente em mongosh, da raiz do projeto, somente em banco de teste NOVO.
const fs = require('fs');
if (process.env.APP_ENV !== 'test' || process.env.TEST_CONNECTIONS_ENABLED !== 'true') {
  throw new Error('Ambiente de teste autorizado obrigatório');
}
const name = process.env.MONGODB_DATABASE;
if (!name || !name.endsWith('_test')) throw new Error('Banco precisa terminar em _test');
const target = db.getSiblingDB(name);
if (target.getCollectionNames().includes('products')) {
  throw new Error('Coleção existente: revisar migração/collMod separadamente');
}
const config = JSON.parse(fs.readFileSync('mongo/products_schema.json', 'utf8'));
target.createCollection('products', {
  validator: config.validator, validationLevel: 'strict', validationAction: 'error'
});
for (const index of config.indexes) {
  const {key, ...options} = index;
  target.products.createIndex(key, options);
}
print('Coleção e índices preparados; conferir validators/explain no banco de teste.');
