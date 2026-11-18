# Skills do time para Codex e pi

Comece pela entrada que corresponde ao trabalho disponível.
Uma issue pronta vai direto para entrega, e um PR já aberto pode ir direto para verificação.

| Entrada | Codex | pi | Saída |
| --- | --- | --- | --- |
| Ideia que precisa de escolhas | `$grill-me` | `/skill:grill-me` | Acordo sobre o comportamento esperado |
| Iniciativa com decisões entre sessões | `$wayfinder` | `/skill:wayfinder` | Mapa e decisões no tracker |
| Pedido definido | `$prepare-issue` | `/skill:prepare-issue` | Issue com consumidor, interface e aceite verificável |
| Issue pronta | `$deliver-issue` | `/skill:deliver-issue` | Mudança testada e evidência do autor no PR |
| PR aberto | `$verify-pr` | `/skill:verify-pr` | Parecer independente sobre a revisão verificada |

Por exemplo, no pi, use `/skill:deliver-issue <URL da issue>`.
Em uma sessão nova de Codex, use `$verify-pr <URL do PR>`.
O tech lead decide o merge com o parecer e os checks da revisão atual.

## Entrega e verificação

Em `prepare-issue`, registre o ponto de entrada público por onde o consumidor observa o resultado.
Para uma promessa de qualidade agregada em IA, combinem também conjunto de avaliação, métrica e limiar.

Em `deliver-issue`, a interface acordada na issue conduz o TDD: reproduzir o comportamento em um teste, vê-lo falhar pelo motivo esperado, fazer a menor mudança que o deixe verde e repetir por comportamento.
A revisão do diff cobre a aderência à issue e às convenções do projeto.
O autor exercita o caminho real e inclui a evidência no PR.

Em `verify-pr`, outra sessão recebe a issue e o PR, compara o mesmo cenário na base comum e no head e relata o esperado e o observado.
Os pareceres possíveis são `PASS`, `PASS+NOTES`, `FAIL` e `INCONCLUSIVE`.
O parecer distingue resultados reproduzidos pelo verificador daqueles informados pelo autor ou pela CI.

## Usar em outro projeto

Este checkout já fornece as skills em [`.agents/skills/`](../../.agents/skills).
Codex e pi descobrem essa pasta a partir de um projeto confiável.
Abra uma nova sessão de Codex ou use `/reload` no pi após atualizar os arquivos.
Se uma instalação pessoal anunciar o mesmo nome, confira se o caminho selecionado aponta para a pasta do projeto.

Para adotar o fluxo em outro repositório, copie a pasta a partir da revisão de dotfiles escolhida pelo time e versione a cópia no projeto consumidor.
O exemplo abaixo é executado na raiz do projeto consumidor, com `dotfiles` em um diretório irmão.
Confira a simulação antes de aplicar, sobretudo se o destino já contiver skills com os mesmos nomes.

```sh
mkdir -p .agents/skills
rsync -ani ../dotfiles/.agents/skills/ .agents/skills/
rsync -ai ../dotfiles/.agents/skills/ .agents/skills/
```

Nas instruções do projeto consumidor, indique o tracker e o glossário adotados.
Para usar Wayfinder com GitHub, indique a seção “Wayfinding operations” deste guia nas instruções do projeto.
Nas skills do Matt, uma chamada à ferramenta “Skill” significa carregar o `SKILL.md` da skill nomeada com o mecanismo disponível no agente.
Em um host sem delegação, uma segunda sessão pode receber a investigação ou verificação e devolver o resultado.

## Wayfinding operations

Use uma issue com a label `wayfinder:map` para registrar o objetivo e o índice de decisões.
Cada decisão vira uma sub-issue com a label `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` ou `wayfinder:task`.
Quando o tracker não oferece sub-issues, use uma lista de tarefas no mapa e inclua o link do mapa em cada decisão.
Registre os bloqueios como dependências entre issues ou, se o tracker não oferecer esse recurso, como links para as decisões que precisam ser resolvidas antes.

Para retomar o trabalho, escolha uma decisão aberta, sem responsável e com todos os bloqueios resolvidos.
Atribua a decisão ao engenheiro responsável, registre a resposta na issue e feche-a.
Acrescente ao mapa o título com link e uma frase com a decisão tomada.
Use `prepare-issue` quando for hora de transformar a decisão em trabalho de implementação.

## Origem e atualização

`prepare-issue`, `deliver-issue` e `verify-pr` são mantidas pelo time.
As referências de desenho são o [planejamento de Addy Osmani](https://github.com/addyosmani/agent-skills/tree/main/skills/planning-and-task-breakdown), a [implementação de Matt Pocock](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/implement/SKILL.md) e a [verificação pré-merge de Lauren Tan](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md).
Os três fluxos do time têm instruções próprias e funcionam sem instalar esses pacotes.

As seis pastas importadas são `grill-me` e `grilling` de `skills/productivity/`, e `wayfinder`, `domain-modeling`, `research` e `prototype` de `skills/engineering/`.
Ao atualizar, copie as mesmas pastas completas da revisão escolhida, confira as dependências referenciadas e mantenha a licença junto delas. [Revisão importada de Matt Pocock](https://github.com/mattpocock/skills/tree/5beb35b040e3de97e54fa9e386d7e42d15c295c2) · [Licença MIT](../../.agents/skills/LICENSE-mattpocock)
