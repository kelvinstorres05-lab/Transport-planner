ATUALIZAÇÃO CORRIGIDA — SELECIONAR TODOS POR JANELA

Base utilizada: versão Movimentação Múltipla CORRIGIDA, confirmada anteriormente como funcional.

Alteração aplicada:
- Cada janela possui o botão “Selecionar todos da janela”.
- Somente os Part Numbers visíveis daquela janela são marcados.
- Depois, use “Mover selecionados para...” para escolher a janela de destino.
- Se todos já estiverem marcados, o botão muda para “Desmarcar todos da janela”.

Exemplo: Janela 3 > Selecionar todos da janela > escolher Janela 2 no painel Movimentação em lote > Mover selecionados > Reprocessar cenário.

Mantidos: seleção individual/múltipla, drag-and-drop, alertas, reset, fornecedores, exportações e demais funções.

VALIDAÇÃO: app.js passou no node --check. A implementação anterior de ações extras dentro do cabeçalho foi removida. Esta versão altera somente a seleção de todos por janela.
