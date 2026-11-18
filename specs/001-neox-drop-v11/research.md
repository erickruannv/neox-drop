# Decisões de preparação e fontes

As decisões de produto vêm da V1.1; nenhum fornecedor foi provisionado. Registro completo dos
complementos técnicos em [VALIDACAO-V1.1.md](../../docs/VALIDACAO-V1.1.md).

- Python 3.13 prevalece sobre o mínimo genérico 3.12+ do roteiro importado: decisão explícita do responsável.
- Supabase get_user(jwt) + perfil ativo por request; não get_session isolado nem cliente auth global mutável.
- Projeções públicas separadas das administrativas; sizesAvailable sinaliza disponibilidade, não contagem interna.
- Sem GET admin por id adicional: formulário local usa listagem administrativa e retorno das mutações.
- Contrato 14 operações; health mínimo, JSON uniforme, requests/response schemas e CSRF explícitos.
- Detalhe público não registra visita; POST recent evita duplicar side effects.
- Checkout ignora preços extras; agrupa linhas e rejeita soma >10/estoque; UI confirma preço atual.
- Limites operacionais fixados para baseline: q 100 chars, brand/category 120, 50 linhas e mensagem 8000 chars.
  Limites de transporte/rate-limit numéricos serão parametrizados e testados em T004; não afetam wire format.
- Telefone autoritativo em store_settings; env serve apenas configuração controlada, sem fallback divergente.
- PATCH merge de featured, substituição total de sizes/galleryUrls, null somente para remover model3dUrl.
- Cache-aside com invalidação e probe MongoDB de active/updatedAt a cada hit. Envelope interno
  versionado; mutação compara versão e avança updatedAt. Sem flag local como garantia global.
  Aceita-se leitura leve extra em favor da correção; medir antes de alegar ganho.
- Model Viewer phi min=max, azimute livre, sem zoom/pan; ajustar ângulo ao GLB real, não fixar número pela foto.
- Referências visuais têm licença/publicação pendente; não baixar, gerar ou substituir assets nesta etapa.

Fontes primárias consultadas em 2026-11-18:
- https://supabase.com/docs/reference/python/auth-getuser
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://modelviewer.dev/docs/
- https://spec.openapis.org/oas/v3.1.1.html

Não há pesquisa de runtime/deploy concluída. Versões de dependências, acesso aos serviços de teste,
limiares de rate-limit/timeouts e GLB são pré-condições das tarefas correspondentes, não contrato oculto.
