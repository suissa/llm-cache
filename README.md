# LLM Cache

Uma camada de cache otimizada para conversas de Modelos de Linguagem de Grande Porte (LLMs), ideal para ser utilizada em chatbots e agentes inteligentes. Este projeto utiliza `ioredis` para uma integração rápida e eficiente com o Redis.

## 🤔 Por que este projeto foi criado?

No desenvolvimento de chatbots e agentes baseados em LLMs, é comum que os usuários façam perguntas repetidas ou que as conversas sigam fluxos semelhantes. Cada chamada para a API de um LLM (como GPT, Claude, etc.) tem um custo computacional e financeiro.

Este projeto foi criado para solucionar esse problema, oferecendo uma camada de cache inteligente que armazena os resultados de conversas anteriores. Ao fazer isso, podemos:

-   **Reduzir a latência:** Respostas já cacheadas são entregues instantaneamente.
-   **Diminuir os custos:** Reduz o número de chamadas para as APIs de LLMs.
-   **Melhorar a consistência:** Garante que a mesma pergunta receba sempre a mesma resposta (se desejado).

É uma ferramenta essencial para construir aplicações de IA mais eficientes, rápidas e econômicas.

## 🚀 Começando

Siga estas instruções para ter uma cópia do projeto rodando na sua máquina local para desenvolvimento e testes.

### Pré-requisitos

-   [Node.js](https://nodejs.org/) (versão 18 ou superior)
-   [npm](https://www.npmjs.com/)
-   Uma instância do [Redis](https://redis.io/) rodando

### Instalação

1.  Clone o repositório:
    ```sh
    git clone https://github.com/seu-usuario/llm-cache.git
    ```
2.  Entre no diretório do projeto:
    ```sh
    cd llm-cache
    ```
3.  Instale as dependências:
    ```sh
    npm install
    ```

## ⚙️ Uso

Para utilizar a camada de cache, você pode importar o SDK e inicializá-lo com a sua configuração do Redis.

*Exemplo de uso será adicionado aqui conforme o projeto evolui.*

## ✅ Testes

Este projeto utiliza [Vitest](https://vitest.dev/) para os testes unitários e de integração. Para rodar os testes, execute o seguinte comando:

```sh
npm test
```

Para uma experiência de desenvolvimento mais interativa, você pode usar a UI do Vitest:

```sh
npx vitest --ui
```

## CI/CD

A integração contínua é gerenciada pelo GitHub Actions. O workflow, definido em `.github/workflows/ci.yml`, é acionado a cada `push` ou `pull request` para a branch `main`. Ele instala as dependências e executa os testes para garantir a qualidade e a estabilidade do código.

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
