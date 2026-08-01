# Corpus de treino

O arquivo `corpus.txt` que acompanha o repositorio e apenas um
**placeholder** curto (alguns paragrafos originais em portugues), para que
`mvn test` e os comandos da CLI funcionem imediatamente. Ele **nao** e
grande o bastante para treinar um bom modelo.

## O que voce precisa

- Um arquivo de texto **`.txt`**, codificado em **UTF-8**.
- **Portugues**, de **dominio publico**.
- Tamanho recomendado: **~1 MB** (cerca de 1 milhao de caracteres).

Quanto maior e mais consistente o corpus, mais legivel fica o texto gerado,
principalmente pelo MLP (ETAPA 2) e pelo Transformer (ETAPA 3).

## Onde encontrar textos de dominio publico

Obras cujo autor faleceu ha mais de 70 anos costumam estar em dominio
publico no Brasil. Boas fontes:

- **Projeto Gutenberg** — https://www.gutenberg.org (filtre por idioma
  "Portuguese"); baixe a versao "Plain Text UTF-8".
- **Dominio Publico (MEC)** — http://www.dominiopublico.gov.br
- **Wikisource em portugues** — https://pt.wikisource.org

Autores classicos frequentemente disponiveis: Machado de Assis, Eca de
Queiros, Jose de Alencar, Aluisio Azevedo, entre outros.

## Como preparar o arquivo

1. Baixe o `.txt` em UTF-8.
2. Opcional, mas recomendado: remova o cabecalho/rodape de licenca que
   algumas fontes adicionam, deixando so o texto da obra.
3. Salve como `data/corpus.txt` (substituindo o placeholder).

Um utilitario simples para juntar varios arquivos num so, no shell:

```bash
cat parte1.txt parte2.txt parte3.txt > data/corpus.txt
```

Confira o tamanho:

```bash
wc -c data/corpus.txt      # numero de bytes (~1_000_000 e um bom alvo)
```

## Observacao sobre acentos

O tokenizador trabalha em nivel de caractere e lida com acentos
normalmente (cada caractere Unicode vira um id). Voce pode manter o texto
com acentuacao completa; o vocabulario simplesmente ficara um pouco maior.
