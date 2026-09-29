ATUALIZAÇÃO — SOMA DE MANIFESTOS EM PEÇAS

Correção:
- Firmed pode vir do SAP como quantidade de manifestos/pallets em alguns PNs.
- Se Firmed for um inteiro positivo menor que o lote (itens/pallet), o sistema interpreta como quantidade de manifestos.
- Quantidade efetiva = manifestos × itens/pallet.

Exemplo:
Firmed bruto = 2
Itens/Pallet = 880
Firmed efetivo = 1.760 peças
Qtd. entrega = 1.760 peças
Pallets = 2

A linha mostra a memória do cálculo para auditoria.
O total da janela, pallets, carretas, reprocessamento e exportação passam a usar a quantidade efetiva em peças.

A regra não altera valores Firmed que já estejam em peças (por exemplo Firmed = 540 e lote = 540).
