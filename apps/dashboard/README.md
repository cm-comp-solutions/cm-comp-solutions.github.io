# Dashboard comercial · CM Consultoria

Demonstração independente da CM Consultoria, com React, TypeScript, Vite, shadcn/ui, Apache ECharts e TanStack Table. A API usa FastAPI e consulta o SQLite local em modo somente leitura. O logotipo vetorial e as cores vêm do [portfólio](https://cm-comp-solutions.github.io/).

## Executar no Windows

No diretório deste projeto, com Python 3.12 e Node.js 24:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m backend.seed
.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8180
```

Em outro terminal, a partir do mesmo diretório:

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev
```

Abra [localhost:4180](http://localhost:4180). A [documentação da API](http://localhost:8180/docs) fica na porta 8180. Para conferir o build, use `npm --prefix frontend run build`.

## Dados

- A carga padrão cria 300 mil pedidos fictícios de 2024 a novembro de 2026 em `data/comercial.sqlite3`. Use `--orders` e `--seed` para variar a carga e `--replace` para recriar a base existente.
- O recorte inicial usa o último ano da base. Filtros de região, canal, categoria e mês se combinam e ficam na URL. A série mensal preserva os meses para permitir trocar a seleção. O ranking preserva as categorias pelo mesmo motivo.
- Receita líquida é a receita bruta menos desconto. Margem bruta é a receita líquida menos custo. Ticket médio divide a receita líquida pela quantidade de pedidos. Valores monetários ficam em centavos inteiros no banco.
- A lista completa consulta 20 pedidos por página, com busca pelo número e ordenação no servidor. Cada linha abre o detalhamento do pedido.


## Publicação no GitHub Pages

A aplicação publicada está em `/dashboard/`. Os dados fictícios vêm do SQLite compactado em `frontend/public/comercial.sqlite3.gz`. A versão estática carrega o SQLite no navegador com sql.js e executa consultas em um Web Worker. A primeira abertura transfere aproximadamente 9 MB.

Para atualizar o aplicativo publicado, execute `npm ci` e `npm run build` em `frontend/`, copie o conteúdo de `frontend/dist/` para a pasta `dashboard/` na raiz do repositório e versione as alterações em conjunto. Os filtros e a navegação usam parâmetros na URL para funcionar em caminhos estáticos do GitHub Pages.

O backend FastAPI continua disponível para execução local. Antes de iniciá-lo, gere a base local com o comando de seed indicado acima.
