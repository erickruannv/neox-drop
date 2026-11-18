# Redis — contrato de chaves (NEOX drop V1.1)

Este arquivo é documentação e **não** um script que deve ser executado contra banco real sem conferir o identificador de ambiente.

```text
recent:visitor:{opaqueId}    LIST     TTL 604800s    até 5 IDs de produtos únicos
cache:product:{productId}   STRING   TTL 300s       JSON somente com atributos públicos
```

Registro recente, em transação ou mecanismo equivalente conforme SDK utilizado:

```redis
MULTI
LREM recent:visitor:DEMO_RANDOM_ID 0 64aabbccddeeff0011223344
LPUSH recent:visitor:DEMO_RANDOM_ID 64aabbccddeeff0011223344
LTRIM recent:visitor:DEMO_RANDOM_ID 0 4
EXPIRE recent:visitor:DEMO_RANDOM_ID 604800
EXEC
```

Consultas de demonstração:

```redis
LRANGE recent:visitor:DEMO_RANDOM_ID 0 4
TTL recent:visitor:DEMO_RANDOM_ID
```

O exemplo usa dados **fictícios** e chaves de demonstração. A API precisa verificar produto ativo no MongoDB antes de adicionar à lista. Falha de Redis não pode impedir compra nem listagem.
