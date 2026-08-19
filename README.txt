WK Transport Planner — versão protótipo

COMO USAR
1. Abra index.html no navegador.
2. A Base de Embalagens já vem pré-carregada a partir do arquivo enviado.
3. Na aba Planejamento, importe o arquivo semanal XLSX/XLS/CSV e mapeie Material, Planned Receipts e/ou Firmed Receipts.
4. O sistema converte peças em pallets usando Itens por pallet (LOTE), distribui pelas janelas e calcula carretas e ocupação.
5. A aba Impactos calcula saving, viagens, km e CO2e.
6. Use Backup JSON para preservar o banco local.

IMPORTANTE
- Os dados ficam armazenados no navegador (localStorage).
- A leitura/escrita de XLSX usa SheetJS carregado por CDN, portanto a importação de Excel requer acesso à internet. CSV e os dados já salvos continuam no navegador.
- Para uso corporativo multiusuário, recomenda-se migrar o banco para um backend (ex.: Supabase/PostgreSQL/SharePoint) e adicionar autenticação.
