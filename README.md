# Form-AI

Form-AI é uma base de formulários web simples e responsiva para coletar decisões de negócio antes da implementação de um sistema.

> **Status:** projeto em evolução. A versão atual é um MVP funcional usado em um caso real. A arquitetura, a interface e os recursos ainda podem mudar conforme novos testes e necessidades forem identificados.

Este projeto nasceu durante o planejamento do PDV de um mini mercado. A cliente recebe um link, responde pelo celular e as respostas são armazenadas em um banco privado. O responsável pelo projeto recebe uma notificação resumida no Telegram.

O objetivo é transformar perguntas de descoberta em decisões organizadas sem depender de Google Forms, Notion Forms ou de uma conta da pessoa que responde.

## Demonstração

Formulário público de decisões do PDV:

<https://mini-mercado-decisions.mynder.workers.dev>

O mesmo Worker pode ser adaptado para outros formulários e outros projetos.

## Recursos atuais

- layout responsivo para celular e desktop;
- identificação obrigatória da pessoa que responde;
- perguntas de múltipla escolha;
- opção **Outra resposta** em cada pergunta;
- campo de complemento associado à pergunta;
- campo de observações gerais;
- validação básica antes do envio;
- confirmação visual após o envio;
- armazenamento privado das respostas no Cloudflare D1;
- notificação resumida no Telegram;
- preservação da resposta mesmo quando a notificação falha;
- endpoint de saúde para verificação operacional;
- cache da página desativado para evitar formulário desatualizado.

## Como funciona

```text
Pessoa responde pelo navegador
          |
          v
Cloudflare Worker valida e recebe o JSON
          |
          +--> Cloudflare D1 armazena a resposta
          |
          +--> Telegram envia uma notificação resumida
```

O formulário público não expõe as respostas anteriores nem o restante do workspace do projeto. As respostas ficam no banco D1 associado ao Worker.

## Arquitetura

- **HTML, CSS e JavaScript:** interface do formulário;
- **Cloudflare Worker:** entrega a página, valida o envio e coordena as integrações;
- **Cloudflare D1:** armazenamento das respostas;
- **Telegram Bot API:** notificação opcional para o responsável.

Não há framework de frontend nesta versão. O formulário é pequeno o suficiente para funcionar com HTML, CSS e JavaScript nativos, reduzindo dependências e manutenção.

## Estrutura

```text
decision-form/
├── migrations/
│   └── 0001_responses.sql
├── src/
│   └── index.js
├── .gitignore
├── README.md
└── wrangler.toml
```

## Modelo de dados

As respostas são armazenadas na tabela `responses`:

| Campo | Descrição |
| --- | --- |
| `id` | Identificador interno |
| `created_at` | Data e hora do envio em UTC |
| `payload` | Respostas em JSON |
| `user_agent` | Navegador usado no envio |

O JSON contém o nome da pessoa, a resposta de cada pergunta, os complementos personalizados e a observação geral.

```json
{
  "client_name": "Nome da cliente",
  "discounts": "Outra resposta",
  "discounts_details": "Desconto somente em compras acima de determinado valor",
  "offline": "Sim",
  "notes": "Observação geral"
}
```

## Desenvolvimento local

Pré-requisitos:

- Node.js;
- Wrangler;
- uma conta Cloudflare para usar D1 remoto.

Para iniciar o Worker localmente:

```bash
npx wrangler dev
```

Para verificar a sintaxe antes de publicar:

```bash
node --check src/index.js
```

O arquivo `wrangler.toml` aponta para o banco D1 usado pelo ambiente remoto. Não inclua tokens ou segredos no repositório.

## Banco e migrations

```bash
npx wrangler d1 create mini-mercado-decisions
npx wrangler d1 migrations apply mini-mercado-decisions --remote
```

Consultar respostas remotamente:

```bash
npx wrangler d1 execute mini-mercado-decisions \
  --remote \
  --command="SELECT id, created_at, payload FROM responses ORDER BY id DESC"
```

## Secrets

As notificações do Telegram usam secrets do Worker:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

Os valores não devem ser colocados no `wrangler.toml`, no código ou em commits.

## Deploy

Validar o pacote sem publicar:

```bash
npx wrangler deploy --dry-run
```

Publicar:

```bash
npx wrangler deploy
```

Verificar a aplicação publicada:

```bash
curl https://mini-mercado-decisions.mynder.workers.dev/health
```

Resposta esperada:

```json
{"ok":true,"service":"mini-mercado-decisions"}
```

## Endpoints

### `GET /`

Entrega o formulário público.

### `POST /api/responses`

Recebe as respostas em JSON, valida o nome da pessoa, grava o registro no D1 e tenta enviar a notificação ao Telegram.

### `GET /health`

Retorna o estado básico do Worker.

## Privacidade e segurança

- o formulário público permite envio, mas não consulta respostas;
- as respostas não são exibidas na página pública;
- tokens ficam configurados como secrets da Cloudflare;
- o endpoint rejeita JSON inválido e payloads excessivos;
- a resposta é armazenada antes da tentativa de notificação;
- observações podem conter dados pessoais e devem ser tratadas como privadas;
- o banco não deve ser exposto diretamente ao público;
- o link do formulário deve ser compartilhado apenas com as pessoas necessárias.

## Limitações atuais

- não há painel administrativo web;
- a consulta das respostas é feita pelo D1/Wrangler;
- o Telegram é uma notificação opcional, não o armazenamento principal;
- não há edição da resposta depois do envio;
- não há autenticação de administrador na interface;
- o formulário atual é definido no código;
- não há construtor visual de formulários;
- não há integração fiscal, Stone ou WhatsApp neste microprojeto.

## Próximas evoluções

Os itens abaixo são possibilidades planejadas, não recursos disponíveis na versão atual:

1. painel privado para consultar respostas;
2. exportação CSV;
3. edição ou correção controlada de respostas;
4. templates de formulários;
5. construtor de perguntas orientado por IA;
6. API ou MCP para criar formulários por linguagem natural;
7. autenticação e permissões para múltiplos projetos.

## Decisões técnicas

### Por que não usar uma plataforma externa?

O formulário precisava ser simples, público e rápido para a cliente responder. A implementação própria evita criar contas em várias plataformas, reduz dependências e permite controlar o armazenamento e o formato das respostas.

### Por que não usar um framework frontend?

O fluxo atual é uma única página com poucas interações. HTML, CSS e JavaScript nativos atendem ao objetivo com menor superfície de manutenção. Um framework pode ser avaliado se o projeto ganhar painel, autenticação ou múltiplos tipos de formulário.

### Por que Cloudflare Worker e D1?

O Worker entrega a página e a API no mesmo projeto, enquanto o D1 oferece armazenamento SQL próximo da aplicação. Isso mantém a infraestrutura pequena e permite evoluir o formulário sem introduzir um servidor tradicional.

## Autoria

Projeto pessoal de **Rafael Lauri**, criado como apoio ao planejamento do Sistema Mini Mercado e como base para futuros formulários orientados por IA.
