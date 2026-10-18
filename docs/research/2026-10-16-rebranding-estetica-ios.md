# Rebranding do Easy Grades rumo à estética do iOS moderno (Liquid Glass)

**Data:** 2026-10-16
**Tipo:** estudo de pesquisa (nenhum código alterado)
**Escopo:** `apps/web` (identidade "Grafite", spec `docs/superpowers/specs/2026-10-12-ux-mobile-pwa-design.md`)

> **Nota de contexto temporal.** O pedido fala em iOS 26, mas hoje (outubro de 2026) o sistema vigente já é o **iOS 27**, anunciado na WWDC26 (8 de junho de 2026). O iOS 27 **refina** o Liquid Glass, sem substituí-lo: a página "What's new" da Apple lista atualizações de HIG em 8 de junho de 2026 para ícones, scroll edge effects, sidebars e tab bars ([Apple, Design — What's new](https://developer.apple.com/design/whats-new/)). A imprensa relata um controle deslizante de opacidade do vidro no iOS 27 (fonte **secundária**, com versões conflitantes sobre quando ele apareceu: [BGR](https://bgr.com/2191219/ios-27-liquid-glass-fix-customization/), [Tom's Guide](https://www.tomsguide.com/phones/iphones/ios-27-has-a-bunch-of-changes-including-a-refined-liquid-glass-design-but-how-much-has-changed-from-ios-26)). Não encontrei esse controle descrito em fonte primária da Apple. Então este estudo trata "iOS 26" como a linguagem Liquid Glass em geral, com as orientações atuais da HIG (que já incorporam as revisões de 2025 e 2026).

---

## Resumo executivo

1. **Vidro só na camada de navegação.** A HIG é explícita: "Don't use Liquid Glass in the content layer" ([HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)). No Easy Grades, isso significa vidro na tab bar, no header compacto, na barra "Meu semestre", nos controles flutuantes do fluxograma e nas sheets. Cartões, tabelas, listas e gráficos continuam opacos.
2. **Adote uma "linguagem inspirada", não uma cópia.** O app roda também em Android e desktop. Copiar o iOS ao pé da letra (chevron sem rótulo, switches idênticos, SF Symbols) cria estranheza fora da Apple e esbarra em licenças. A proposta é levar a *estrutura* do iOS (camadas, concentricidade, hierarquia por agrupamento, tab bar flutuante, sheets com detents) para dentro da identidade Grafite.
3. **O esmeralda passa a ser a *tint color* do app,** com uso parcimonioso: aba selecionada, uma ação primária por tela, status. A HIG manda reservar a cor da marca para "primary actions or status indicators, like … an icon for the selected tab" e sugere levá-la para a camada de conteúdo ([HIG Branding](https://developer.apple.com/design/human-interface-guidelines/branding)). Isso já casa com a regra atual de "um acento só".
4. **Tipografia híbrida.** O SF Pro **não pode** ser hospedado num web app. A licença proíbe embutir a fonte em produtos e restringe o uso a mock-ups de software para sistemas da Apple ([Apple Fonts](https://developer.apple.com/fonts/)). A pilha `-apple-system, system-ui` entrega o SF nos aparelhos da Apple sem servir arquivo nenhum ([WebKit](https://webkit.org/blog/3709/using-the-system-font-in-web-content/)). A própria HIG sugere uma fonte de marca nos títulos e a fonte do sistema no corpo ([HIG Branding](https://developer.apple.com/design/human-interface-guidelines/branding)). Recomendação: Mona Sans nos títulos e números grandes, fonte do sistema no corpo.
5. **Escala de texto do iOS como referência.** O padrão "Large" do Dynamic Type vai de Large Title 34/41 a Caption 2 11/13, com corpo de 17 pt e mínimo de 11 pt ([HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)). Hoje o app usa 14–16 px no corpo; a proposta sobe para 17 px no mobile.
6. **Raios concêntricos e cápsulas.** A Apple define três tipos de forma: fixa, cápsula (raio = metade da altura) e concêntrica (raio do pai − padding) ([WWDC25 "Get to know the new design system"](https://developer.apple.com/videos/play/wwdc2025/356/)). Proposta: botões, chips e tab bar viram cápsula; painéis ganham raio maior e os filhos usam `calc(raio-pai − padding)`.
7. **Tab bar flutuante em cápsula de vidro, com rótulos.** Ela flutua sobre o conteúdo; minimizar ao rolar é opcional ([HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)). Mantenha os rótulos e os 44 pt de alvo. As críticas da NN/g sobre alvos apertados e controles que somem valem aqui ([NN/g](https://www.nngroup.com/articles/liquid-glass/)).
8. **Large title que colapsa** ao rolar em cada aba ([HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)), com um **scroll edge effect** (desfoque e esmaecimento) no lugar da `border-b` do header ([HIG Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views)).
9. **Sheets com detents (médio/grande) e grabber** no "Meu semestre" e no Exportar PNG ([HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)). O `Sheet` atual (Radix Dialog) não arrasta; precisa de um componente próprio ou de uma biblioteca.
10. **Motion com springs** convertidos para CSS `linear()`, suportado no Safari 17.2+ ([Chrome for Developers](https://developer.chrome.com/docs/css-ui/css-linear-easing-function), [MDN BCD](https://github.com/mdn/browser-compat-data)). Os parâmetros saem do modelo `Spring(duration:bounce:)` da Apple ([SwiftUI Spring](https://developer.apple.com/documentation/swiftui/spring)). Mantenha o limite de ≤250 ms *percebidos* nas interações frequentes.
11. **O vidro na web é blur + saturação + borda especular, sem refração.** A refração por SVG (`backdrop-filter: url(#…)`) só funciona no Chromium ([kube.io](https://kube.io/blog/liquid-glass-css-svg/)), então é inviável para um app voltado ao iPhone.
12. **Acessibilidade.** O Safari **não** suporta `prefers-reduced-transparency` ([MDN BCD](https://github.com/mdn/browser-compat-data)), então o web app não enxerga o "Reduzir transparência" do iOS. Fallbacks: `prefers-contrast: more` (suportado no Safari 14.1+) e uma preferência no próprio app ("Aparência: vidro / sólido").
13. **iOS 26 Safari ignora `theme-color`** e tinge a barra a partir do fundo do `body` ou de elementos `fixed` (relatos de desenvolvedores, **secundário**: [Ben Frain](https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/)). Uma tab bar `fixed` translúcida pode mudar a cor do "queixo" do Safari. É preciso testar no aparelho.
14. **Dashboards no estilo Saúde/Fitness:** cartões de resumo em lista agrupada, cada um com rótulo e ícone na cor do tema, número grande, contexto curto e um chevron para o detalhe. Essa lógica já existe em parte na Visão geral; o ganho está em agrupar e dar hierarquia, não em adicionar vidro.
15. **Riscos principais:** legibilidade sobre o vidro (crítica central da NN/g), custo de GPU do `backdrop-filter` em Android de entrada, e o "vale da estranheza" fora da Apple. Mitigação: vidro de opacidade alta (≥ 70–80% de tinta, decisão nossa e não número da HIG), poucos elementos com blur e um modo sólido.

---

## 1. Direção de arte do iOS 26/27

### 1.1 O que é o Liquid Glass

- É um material translúcido que "reflects and refracts its surroundings", aplicado a controles, navegação, ícones e widgets ([Apple Newsroom, 9 jun 2025](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)). A Apple o chama de "the broadest software design update ever" (mesma fonte).
- **Lente em vez de desfoque.** "Where as previous materials scattered light, this new set of materials dynamically bends, shapes, and concentrates light in real time" ([WWDC25 "Meet Liquid Glass"](https://developer.apple.com/videos/play/wwdc2025/219/)). Ao surgir e sumir, os objetos modulam a lente em vez de fazer fade (mesma sessão).
- **Adaptatividade.** Elementos pequenos (tab bar, toolbar) alternam entre claro e escuro conforme o fundo, e os glifos acompanham. Elementos grandes (menus, sidebars) se adaptam sem fazer essa troca ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/); [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)).
- **Sombra adaptativa.** A sombra fica mais opaca sobre texto e mais leve sobre fundo claro liso ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)).
- **Morphing.** "Liquid Glass dynamically morphs between the controls in each context"; um menu "simply pops open" a partir do botão ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)). Action sheets agora "springs from the action itself" ([WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/)).

### 1.2 Camadas: quando usar e quando não usar

- O vidro "forms a distinct functional layer for controls and navigation elements … that floats above the content layer" ([HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)).
- **Não use na camada de conteúdo.** Lá, use os *standard materials* (ultra-thin, thin, regular, thick). A exceção são controles transitórios, como sliders e toggles, que ganham aparência de vidro enquanto estão ativos (mesma fonte).
- **Use com parcimônia.** Os efeitos devem ficar nos "most important functional elements" (mesma fonte).
- **Sem vidro sobre vidro.** "Stacking Liquid Glass elements on top of each other can quickly make the interface feel cluttered". Para conteúdo sobre o vidro, use "fills, transparency, and vibrancy" ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)).
- **Separação controle/conteúdo.** Em vez de pôr um fundo sólido ou semiopaco atrás dos controles, use um *scroll edge effect*. O conteúdo de tela cheia deve passar por baixo das barras ([HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout)).
- **Modal vs. paralelo.** Numa tarefa modal, combine o vidro com uma camada de escurecimento. Numa tarefa paralela, o vidro sozinho separa. Ao arrastar uma sheet para cima, o vidro "becoming more opaque" ([WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/)).

### 1.3 Regular vs. clear

- **Regular:** desfoca e ajusta a luminosidade do fundo. É o que a maioria dos componentes usa e serve para elementos com bastante texto ([HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)).
- **Clear:** "highly translucent", só sobre fundos ricos (foto e vídeo). Sobre conteúdo claro, a HIG sugere uma camada escura de **35%** de opacidade (mesma fonte).
- "They should never be mixed." O clear "does not have adaptive behaviors". Ele só se justifica se houver mídia por trás, se o escurecimento não prejudicar o conteúdo e se o que fica por cima for "bold and bright" ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)).
- **Para o Easy Grades:** não há mídia, então **só regular**.

### 1.4 Tint e cor

- O vidro "has no inherent color". Aplicar cor ao fundo de um controle é "the approach the system uses for prominent button styling" ([HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)).
- Para destacar uma ação primária, ponha a cor no fundo, não no símbolo, e "refrain from adding color to the background of multiple controls" (mesma fonte).
- "When every element is tinted, nothing stands out" ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)).
- Em apps de conteúdo monocromático, "choosing your brand color as the app accent color can be an effective way" ([HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)). É o caso do Easy Grades, com Grafite neutro e esmeralda.
- Branding (atualizado em 9 set 2026): use a cor de marca para "primary actions or status indicators, like badges … or an icon for the selected tab", e "consider moving it into the content layer, where it scrolls beneath Liquid Glass controls" ([HIG Branding](https://developer.apple.com/design/human-interface-guidelines/branding)).
- As cores do sistema foram ajustadas nos modos claro, escuro e de contraste aumentado "so that they work in harmony with Liquid Glass" ([WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/)). A HIG pede variantes claro, escuro e **contraste aumentado** para cores próprias ([HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)).
- **Fundos.** O iOS separa o fundo "system" do "grouped" (primário, secundário, terciário), e o grouped é o de listas agrupadas ([HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)). O par `--fundo` #F4F4F2 + `--superficie` #FFFFFF já segue a lógica do grouped.
- **Valores das cores do sistema.** A HIG avisa: "Avoid hard-coding system color values … values may fluctuate from release to release" ([HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)). Por isso este estudo não copia hexadecimais de systemGreen etc.

### 1.5 Concentricidade e forma

- Três tipos de forma: "fixed shapes have a constant corner radius"; "Capsules use a radius that's half the height of the container"; "concentric shapes calculate their radius by subtracting padding from the parent's" ([WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/)).
- "For phone layouts, use a capsule with extra margin to create space near the screen edge." Componentes isolados usam "a concentric shape with a fallback radius" (mesma fonte).
- Os controles foram redesenhados para ficarem "perfectly concentric with the rounded corners of modern hardware and app windows" ([Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)).
- Nas toolbars, componentes customizados devem ter raio concêntrico com os cantos da barra ([HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)).
- A HIG prefere botões circulares ou em cápsula. A justificativa ("eyes tend to be drawn toward the corners") aparece na seção de visionOS ([HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)), e a WWDC confirma a migração dos controles grandes para cápsulas ([WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/)).
- **Não encontrei** na HIG um valor numérico de raio para cartões ou painéis no iOS. Os números propostos na seção de mapeamento são decisão de design, não regra da Apple.

### 1.6 Hierarquia, agrupamento e tipografia

- "Instead of relying on decoration, hierarchy should be expressed through layout and grouping." A ação primária (por exemplo, Done) "stays separate and appears tinted" ([WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/)).
- "Typography has been refined … now bolder and left-aligned" (mesma fonte).
- **Escala Dynamic Type do iOS no tamanho padrão "Large"** ([HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)):

| Estilo | Peso | Tamanho/entrelinha (pt) | Peso enfático |
|---|---|---|---|
| Large Title | Regular | 34/41 | Bold |
| Title 1 | Regular | 28/34 | Bold |
| Title 2 | Regular | 22/28 | Bold |
| Title 3 | Regular | 20/25 | Semibold |
| Headline | Semibold | 17/22 | Semibold |
| Body | Regular | 17/22 | Semibold |
| Callout | Regular | 16/21 | Semibold |
| Subhead | Regular | 15/20 | Semibold |
| Footnote | Regular | 13/18 | Semibold |
| Caption 1 | Regular | 12/16 | Semibold |
| Caption 2 | Regular | 11/13 | Semibold |

- Padrão de 17 pt e mínimo de 11 pt no iOS (mesma fonte).
- Fontes customizadas precisam acompanhar Dynamic Type e Bold Text (mesma fonte).
- Use poucas famílias: "Minimize the number of typefaces you use" (mesma fonte).

### 1.7 Layout, alvos de toque e espaçamento

- Controle padrão de **44×44 pt**, mínimo de 28×28 pt ([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). "A button needs a hit region of at least 44x44 pt" ([HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)).
- Espaçamento: "about 12 points of padding around elements that include a bezel", e cerca de 24 pt quando não há bezel ([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- Respeite as safe areas; Dynamic Island e barras não podem obstruir o conteúdo ([HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout)).
- Margens laterais de layout para iPhone **não** aparecem como número na página atual da HIG (as margens ficam nos guias do sistema e nos kits do [Apple Design Resources](https://developer.apple.com/design/resources/)). Os 16 px atuais (`px-4`) ficam como decisão nossa.

### 1.8 Ícones

- Os ícones de iOS, iPadOS, macOS e watchOS têm uma camada de fundo e camadas de frente que "take on Liquid Glass attributes like specular highlights, refraction, and translucency". São montados no **Icon Composer**, com variantes default, dark e mono ([HIG App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)). O Icon Composer 2 beta saiu em 8 jun 2026 ([What's new](https://developer.apple.com/design/whats-new/)).
- Forneça camadas quadradas sem máscara. "Prefer clearly defined edges"; evite traços finos ([HIG App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)).
- **Para um PWA,** o ícone é um PNG achatado (`apple-touch-icon`). **Não verifiquei** em fonte primária se o iOS 26/27 aplica efeitos de vidro, tint ou o visual "clear" a ícones de web apps da Tela de Início.
- SF Symbols tem "over 7,000 symbols" ([Apple](https://developer.apple.com/sf-symbols/)). A página não traz os termos de licença. A licença vem no download, **não verificada aqui**, e é amplamente entendida como restrita a plataformas Apple. Recomendação: continuar com Lucide, que já está no projeto.

---

## 2. Componentes

| Componente | O que a Apple diz | Fonte |
|---|---|---|
| **Tab bar** | Flutua sobre o conteúdo, com itens sobre vidro. Pode minimizar ao rolar quando há acessório (MiniPlayer). Sempre visível, com rótulos de uma palavra; prefira símbolos preenchidos. Não desabilite abas. Pode ter aba de busca no fim. | [HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) |
| **Acessório da tab bar** | Para recursos persistentes. "Avoid placing screen-specific actions here—a checkout button … belongs with the content it supports." | [WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| **Navigation bar / toolbar** | Large title que vira título padrão ao rolar e volta ao topo. Título com menos de 15 caracteres. No máximo três grupos de itens. Botões de toolbar ganham vidro automaticamente. | [HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), [HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) |
| **Scroll edge effect** | Não é decorativo. Só existe atrás de UI flutuante; um por view; "soft" é o padrão no iOS. | [HIG Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views), [WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| **Sheets** | Detents "large" e "medium" (cerca de metade). Inclua grabber em sheet redimensionável; ele também funciona com VoiceOver. Cancel à esquerda e Done à direita. Uma sheet por vez. | [HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) |
| **Segmented control** | Escolhas relacionadas que afetam uma view; segmentos de largura igual; só texto ou só ícone; não serve para navegar entre seções (para isso, tab bar). | [HIG Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) |
| **Busca** | Pode ser aba, toolbar inferior ou topo. "Place search at the bottom if there's room." | [HIG Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) |
| **Agrupamento de botões** | Agrupe por função; não misture símbolo e texto no mesmo grupo; botões de texto ficam em contêiner próprio. | [WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/) |
| **Sliders e toggles** | Na camada de conteúdo, ganham vidro só durante a interação. | [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials) |
| **Gráficos** | Escolha a marca (barra, linha, ponto) pelo que quer comunicar. Eixo de barras a partir de zero. Ticks em sequências familiares. Poucas linhas de grade. Títulos descritivos. Alinhe a borda inicial do gráfico com a tela. Todo gráfico precisa ser acessível (VoiceOver, Audio Graphs). | [HIG Charts](https://developer.apple.com/design/human-interface-guidelines/charts) |
| **Toasts** | O iOS **não tem** toast como componente. Existem notificações e banners do sistema ([HIG Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)) e alertas. Um toast de "Desfazer" é um padrão web; mantê-lo é aceitável, mas com estilo de cápsula flutuante. | — |
| **Empty states** | "If a section is empty, explain why its content is unavailable" (no contexto das abas). | [HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) |

**Listas inset grouped.** A HIG atual de Lists and tables não traz um texto específico sobre o visual "inset grouped". O padrão (seções em cartões arredondados sobre o fundo grouped) é observável nos Ajustes e na Saúde e está nos UI Kits da Apple ([Apple Design Resources](https://developer.apple.com/design/resources/)). A orientação de cor está em [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color) (fundos grouped).

---

## 3. Motion

- **Springs como padrão.** No SwiftUI, a animação `default` é `spring(response: 0.55, dampingFraction: 1.0, blendDuration: 0)` desde o iOS 17 ([SwiftUI Animation.default](https://developer.apple.com/documentation/swiftui/animation/default)). Os presets `.smooth` ("no bounce"), `.snappy` ("small amount of bounce") e `.bouncy` ("higher amount of bounce") têm `duration` padrão de 0,5 s ([smooth](https://developer.apple.com/documentation/swiftui/animation/smooth(duration:extrabounce:)), [snappy](https://developer.apple.com/documentation/swiftui/animation/snappy(duration:extrabounce:)), [bouncy](https://developer.apple.com/documentation/swiftui/animation/bouncy(duration:extrabounce:))). **Os valores de bounce de cada preset não estão documentados** nessas páginas.
- **Modelo duration/bounce.** O tipo `Spring` converte entre (duration, bounce) e (mass, stiffness, damping). Por exemplo, `Spring(duration: 0.5, bounce: 0.3)` dá `(1.0, 157.9, 17.6)` ([SwiftUI Spring](https://developer.apple.com/documentation/swiftui/spring)). Isso confere com rigidez = (2π/d)² e amortecimento = 4π(1−bounce)/d (massa 1), usados nos snippets da seção 8.
- **Princípios da HIG** ([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)): motion com propósito; "Make motion optional"; feedback breve e preciso; "generally avoid adding motion to UI interactions that occur frequently"; deixe a pessoa cancelar a animação. O vidro reage com mais ênfase ao toque direto e com menos ao trackpad.
- **Reduce Motion** ([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)): "Tightening animation springs to reduce bounce effects"; troque movimentos em x/y/z por fades; "Avoiding animating into and out of blurs". Este último pesa para o vidro: **não anime o raio do blur** com reduced motion.
- **Acessibilidade do vidro no sistema** ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)):
  - Reduce Transparency deixa o vidro "frostier".
  - Increase Contrast deixa os elementos "predominantly black or white … with a contrasting border".
  - Reduce Motion "disables any elastic properties".
- **Haptics.** Na web, o iOS **não** suporta `navigator.vibrate` ([MDN BCD](https://github.com/mdn/browser-compat-data)). O Safari 17.4 trouxe o `<input type="checkbox" switch>` nativo ([WebKit 17.4](https://webkit.org/blog/15063/)). Fontes **secundárias** descrevem um truque que dispara haptic a partir dele ([ios-haptics](https://npmjs.com/package/ios-haptics), [issue do Ionic](https://github.com/ionic-team/ionic-framework/issues/29942)), com relatos conflitantes sobre versões e uma possível correção posterior. **Não dependa disso.** A alternativa é a HIG: feedback visual breve, mudança de estado clara e texto em `aria-live`.

---

## 4. Implementação na web

### 4.1 Suporte dos navegadores (MDN browser-compat-data v8.1.6, consultado em 2026-10-16)

| Recurso | Chrome | Safari / iOS | Firefox | Uso no Easy Grades |
|---|---|---|---|---|
| `backdrop-filter` | 76 | 18 sem prefixo (9 com `-webkit-`) | 103 | Base do vidro. Declare também `-webkit-backdrop-filter`. |
| `backdrop-filter: url(#svg)` (refração) | sim | **não** | não | Descartar ([kube.io](https://kube.io/blog/liquid-glass-css-svg/); bug do WebKit relatado por terceiros: [WebKit #313914](https://bugs.webkit.org/show_bug.cgi?id=313914)). |
| `linear()` easing | 113 | 17.2 | 112 | Springs. |
| `prefers-reduced-transparency` | 118 | **não** | só com flag | Não detecta o "Reduzir transparência" do iOS. |
| `prefers-contrast` | 96 | 14.1 / iOS 14.5 | 101 | Fallback de vidro → sólido. |
| `prefers-reduced-motion` | 74 | 10.1 | 63 | Já usado. |
| `color-mix()` | 111 | 16.2 | 113 | Tintas do vidro. |
| `@property` | 85 | 16.4 | 128 | Animar variáveis (por exemplo, a opacidade da tinta). |
| Scroll-driven (`animation-timeline`) | 115 | **26** | preview | Large title que colapsa e minimização da tab bar, sem JS no iOS 26+. |
| View Transitions (mesmo documento) | 111 | 18 | 144 | Morph entre abas; sheet que "nasce do botão". |
| `@starting-style` | 117 | 17.5 | 129 | Entrada de popovers e sheets. |
| `corner-shape` (superelipse) | 139 | só preview | preview | Ainda não; pode virar aprimoramento progressivo. |
| `env(safe-area-inset-*)` | 69 | 11.1 | 65 | Já usado. |
| `display-mode` | 42 | 13 / iOS 12.2 | 47 | Ajustes só no PWA instalado. |

### 4.2 Como aproximar o Liquid Glass em CSS

- **Camadas do efeito:**
  1. fundo translúcido com tinta (`color-mix` da superfície);
  2. `backdrop-filter: blur() saturate()`;
  3. borda especular (`inset` box-shadow claro no topo e hairline translúcida);
  4. sombra externa suave.
- **Não dá para reproduzir:** a refração real e o brilho que segue a geometria. A técnica com `feDisplacementMap` exige `backdrop-filter: url()`, que, segundo o autor, "Only Chrome currently supports" ([kube.io](https://kube.io/blog/liquid-glass-css-svg/)). O mesmo autor diz que mudar forma ou tamanho "are currently costly" e chama o trabalho de "strictly experimental". Como o público-alvo usa iPhone, isso fica fora.
- **Legibilidade.** A HIG nota que o vidro "appears more opaque in larger elements" ([HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)), e a Apple tornou o vidro *mais* opaco nas betas e no 26.1 por causa de queixas ([MacRumors](https://www.macrumors.com/2025/10/20/ios-26-1-liquid-glass-toggle/) e [Thurrott](https://www.thurrott.com/apple/323084/ios-26-beta-3-tones-down-liquid-glass-redesign), **secundárias**). Na web, sem a adaptação dinâmica do sistema, vale errar para o lado opaco: tinta de 72–85% da superfície, blur de 12–20 px e texto sempre `--texto` ou `--suave`. **São valores nossos, a validar com medição de contraste no pior fundo**, e não números da Apple.
- **Desempenho.** O `backdrop-filter` obriga o navegador a recompor a região atrás do elemento a cada quadro de rolagem.
  - Limite o vidro a poucos elementos pequenos e fixos (tab bar, header, barra do semestre, controles do fluxograma).
  - Nunca use em listas, cartões ou nós do React Flow.
  - Não anime o raio do blur; anime `opacity`/`transform`.
  - Teste em Android de entrada (Chrome) e em iPhone antigo. A Apple oferece o iOS 27 até o iPhone 11, segundo fontes secundárias.
  - **Não encontrei** benchmark primário de custo do `backdrop-filter` em mobile; meça no projeto (Performance panel e FPS no Safari Web Inspector).
- **Sheets e overlays.** Uma sheet de vidro sobre um overlay escurecido é o que a WWDC recomenda para tarefas modais ("pair Liquid Glass with a dimming layer"). Mantenha o overlay atual.

### 4.3 Bibliotecas da comunidade

| Opção | O que é | Encaixa no stack? |
|---|---|---|
| **Konsta UI** | Componentes mobile em Tailwind (React, Vue, Svelte), temas iOS e Material, MIT. A v5 promete "iOS 26 … look and feel"; a v5.5.0 é de 28 set 2026 ([konstaui.com](https://konstaui.com/)). | **Não recomendado.** É um segundo sistema de componentes paralelo ao shadcn, com outros tokens e outra semântica de acessibilidade. Pode servir de *referência visual*. Não verifiquei se o tema iOS 26 inclui vidro. |
| **Ionic (modo iOS) + `@rdlabo/ionic-theme-ios26`** | Ionic com um tema comunitário de iOS 26 ([zenn.dev, secundário](https://zenn.dev/rdlabo/articles/1cac6284b08db2)). Não achei suporte oficial do Ionic. | **Não.** Trocaria todo o framework de UI. |
| **Framework7** | Kit mobile com tema iOS. | **Não**, pelo mesmo motivo. Não pesquisei a versão atual. |
| **Liquid glass com SVG/WebGL** (kube.io, liquid-glass-js etc.) | Demos de refração. | **Não.** Só Chromium, ou WebGL pesado. |
| **Vaul** (drawer com snap points, base do Drawer do shadcn) | Daria sheets arrastáveis com detents. O README diz "This repo is unmaintained" ([GitHub](https://github.com/emilkowalski/vaul)). | **Com cautela.** Usar travando a versão, ou escrever um drag simples sobre o `Sheet` atual. |
| **Tokens próprios em Tailwind v4** (seção 8) | `@utility glass` com fallbacks. | **Recomendado.** Zero dependências, respeita a CSP e as fontes self-hosted. |

Nenhuma opção exige CDN. Todas seriam instaladas via npm, mas só a última respeita sem atrito a convenção "shadcn + patches documentados".

### 4.4 Fonte: SF Pro, `system-ui` e Mona Sans

- **Licença.** A licença na página de fontes da Apple diz: "TO BE USED SOLELY FOR CREATING MOCK-UPS OF USER INTERFACES … RUNNING ON APPLE'S iOS, OS X OR tvOS" e "You may not embed the Apple Font in any software programs or other products" ([Apple Fonts](https://developer.apple.com/fonts/)). Num fórum de desenvolvedores da Apple, a resposta é que não se pode usar SF em web app ([Apple Developer Forums](https://developer.apple.com/forums/thread/733267)). **Self-hosting do SF Pro está descartado.**
- **Pilha de sistema.** `font-family: -apple-system, system-ui, …` usa o SF nos aparelhos da Apple, e o navegador cai para o próximo item nas outras plataformas ([WebKit](https://webkit.org/blog/3709/using-the-system-font-in-web-content/)). No Android e no Windows sairão Roboto e Segoe UI. Isso é uma *adaptação por plataforma gratuita*, mas também perda de consistência visual.
- **Dynamic Type na web.** O WebKit expõe `font: -apple-system-body` (e headline, subheadline, caption1, caption2, footnote…), que segue o tamanho de texto do iOS ([WebKit](https://webkit.org/blog/3709/using-the-system-font-in-web-content/)). Dá para usar sob `@supports (font: -apple-system-body)` no `html` e escalar o resto em `rem`. Só funciona no WebKit da Apple; os outros navegadores mantêm o zoom do próprio navegador.
- **Impacto sobre a Mona Sans.**
  - (a) **Manter só Mona Sans:** identidade forte e igual em todos os sistemas, mas sem o "feeling" de iOS no corpo de texto.
  - (b) **Híbrido** (recomendado, alinhado à [HIG Branding](https://developer.apple.com/design/human-interface-guidelines/branding): "use a custom font for headlines … system fonts for body"): Mona Sans em títulos, números grandes e `code-label`; `system-ui` no corpo. Ganha legibilidade nativa em tamanhos pequenos e o arquivo de fonte fica menor se os eixos forem subsetados. Atenção: hoje o `body` usa `tabular-nums`, e SF, Roboto e Segoe suportam `font-variant-numeric: tabular-nums`.
  - (c) **Trocar por Inter:** aproxima o SF em todas as plataformas, mas é a escolha mais genérica e "da moda", o mesmo motivo que tirou Bricolage e Hanken. Não recomendado.
  - Se ficar com (b), o `heading-ink` com wdth 125 e peso 800 já é mais "editorial" que o iOS. Para soar mais Apple, dá para descer para wdth 100–112 e peso 700, mais perto do bold dos Large Titles. **Isso é decisão estética, não regra.**

---

## 5. Referências de apps

> As observações sobre apps de terceiros são **leitura de design minha**. Não encontrei em fonte primária descrições do redesign iOS 26 de Flighty ou Copilot Money (as buscas não retornaram material dos desenvolvedores). As afirmações verificáveis têm fonte.

| App | O que mostra | Lição para o Easy Grades |
|---|---|---|
| **Música, News, Podcasts** | Tab bar que "shrinks" ao rolar e volta ao subir ([Apple Newsroom iOS 26](https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/)); MiniPlayer como acessório da tab bar ([HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)). | Minimizar a tab bar é opcional e faz sentido em listas longas (Disciplinas). O "Meu semestre" lembra o MiniPlayer, mas é específico de uma tela (ver o mapeamento). |
| **Fotos** | Abas separadas para Biblioteca e Coleções ([Newsroom iOS 26](https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/)). | Poucas abas, cada uma com uma função clara. As 4 abas atuais estão boas. |
| **Safari** | Página de borda a borda, controles flutuantes (mesma fonte). Crítica da NN/g aos controles que somem ([NN/g](https://www.nngroup.com/articles/liquid-glass/)). | Conteúdo de tela cheia sob o vidro, sim; esconder navegação, não. |
| **Mapas** | O caso canônico de conteúdo rico (o mapa) sob controles e sheets de vidro com detents. A HIG cita o Mapas ao tratar de cor sobre arte ([HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)). | **O fluxograma é o "mapa" do Easy Grades:** canvas de borda a borda, controles de zoom, legenda e exportação em vidro, e detalhes da disciplina numa sheet de detent médio. |
| **Saúde** | Resumo com categorias fixadas e destaques com gráfico; toque para detalhar ([Apple Support](https://support.apple.com/guide/iphone/view-your-health-data-iphe3d379c32/ios)). | A Visão geral pode ter "Fixados" (CR, progresso, formatura prevista) e "Destaques" (ritmo, sequência, custo de reprovação), cada cartão levando ao detalhe. |
| **Fitness** | Anéis e cartões de resumo com uma métrica dominante (observação). | Uma métrica grande por cartão, com cor só para o progresso. O `MarkerBand` já faz esse papel e é o elemento-assinatura. |
| **Ajustes** | Listas inset grouped; busca no fundo da tela ([HIG Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)). | Disciplinas em inset grouped; busca acessível ao polegar. |
| **Wallet** | Busca no topo para não cobrir os passes embaixo ([HIG Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)). | No Planejamento, a barra inferior já ocupa o fundo, então a busca fica no topo. |
| **Flighty** (ADA 2023, Interaction) | Premiado pelo uso de Live Activities e integrações ([Apple Newsroom 2023](https://www.apple.com/newsroom/2023/06/apple-announces-winners-of-the-2023-apple-design-awards/)). É conhecido por densidade de dados legível e estados de "o que vem a seguir" (observação). | Mostrar o *próximo marco* ("faltam 3 períodos, 42 créditos"), não só o histórico. |
| **Copilot Money** | Dashboard financeiro com gráfico de tendência e categorias (observação; sem fonte primária encontrada). | Combinar tendência (CR por período) e composição (horas por categoria) na mesma tela, com cor contida. |
| **Tide Guide** (ADA 2026, Visuals and Graphics) | App de gráficos e tabelas premiado ([Apple Newsroom 2026](https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/)). | Prova de que dados técnicos podem ser o centro visual: gráficos limpos e bem rotulados valem mais que efeitos. |
| **Things, Linear, Revolut, Arc/Dia** | Referências frequentes de polimento (observação). Não pesquisei redesigns específicos para iOS 26. | Things: hierarquia por tipografia e espaço. Linear: densidade e atalhos no desktop. Revolut: cartões de métricas. |

**Padrão consolidado para dashboards (Saúde, Fitness, Flighty, Copilot):**

1. Um número protagonista por cartão.
2. Rótulo pequeno com ícone e a cor do tema.
3. Uma linha de contexto ("+0,12 no último período").
4. Micrográfico opcional.
5. Chevron e toque para o detalhe.
6. Cartões opacos em lista agrupada sobre o fundo grouped.
7. Vidro só na navegação.

---

## 6. Críticas e riscos

- **Legibilidade.** A NN/g (Raluca Budiu, 10 out 2025) chamou o iOS 26 de "an illegible mess" em sobreposições de texto. A crítica cita animação sem propósito ("Motion for motion's sake is not usability"), alvos menores e mais juntos na tab bar, controles que somem, botão voltar sem rótulo, e conclui: "Apple is prioritizing spectacle over usability" ([NN/g](https://www.nngroup.com/articles/liquid-glass/)).
- **Recuos da Apple.**
  - Na beta 3 do iOS 26, o vidro ficou mais opaco ([Thurrott](https://www.thurrott.com/apple/323084/ios-26-beta-3-tones-down-liquid-glass-redesign), secundário).
  - No iOS 26.1 entrou o ajuste **Clear/Tinted** em Ajustes > Tela e Brilho > Liquid Glass. Ele aumenta a opacidade e o contraste, vale também para apps de terceiros e, segundo a Apple, veio de feedback de usuários na beta ([MacRumors](https://www.macrumors.com/2025/10/20/ios-26-1-liquid-glass-toggle/), [Tom's Guide](https://www.tomsguide.com/phones/iphones/ios-26-1-lets-you-adjust-liquid-glass-transparency-on-your-iphone-heres-how-to-do-it), secundários).
  - A HIG ganhou atualizações de Liquid Glass em 9 set 2025, 16 dez 2025 e 8 jun 2026 (changelogs de [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Color](https://developer.apple.com/design/human-interface-guidelines/color) e [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)).
  - No iOS 27, o controle de opacidade relatado pela imprensa (secundário, ver nota no topo).
  - **Leitura:** a própria Apple vem movendo o padrão para *mais opaco*. Um web app que copiar o vidro "de lançamento" já nasce datado.
- **Uncanny valley fora da Apple.** No Android e no Windows, o vidro vai renderizar (o `backdrop-filter` funciona), mas idiomas do iOS como chevron sem rótulo, a cápsula do switch e a busca no fundo podem parecer estranhos. A HIG pede "familiar components" e "standard patterns consistently" ([HIG Branding](https://developer.apple.com/design/human-interface-guidelines/branding)), e o familiar muda por plataforma.
  - **Recomendação:** linguagem *inspirada* e única.
  - Use camadas, cápsulas, concentricidade, large titles e sheets com detents. Esses padrões também existem, com outro nome, no Material 3 (bottom sheets, navigation bar).
  - **Não** reproduza o que é marca registrada da Apple: SF, SF Symbols, ícones idênticos aos do sistema, chevron "< Voltar" sem texto.
  - Adapte por *capacidade*, nunca por user-agent: fonte do sistema, `pointer: coarse`, `display-mode: standalone`, `prefers-contrast`.
- **Acessibilidade na web.** Sem `prefers-reduced-transparency` no Safari, quem liga "Reduzir transparência" no iPhone continuaria vendo o vidro do app. É um argumento forte para um ajuste "Aparência: vidro / sólido" no menu "Mais opções" e para usar `prefers-contrast: more` como gatilho do sólido.
- **`theme-color` no iOS 26.** Relatos de que o Safari 26 ignora a meta e tinge as barras pelo `body` ou por elementos `fixed` ([Ben Frain](https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/), [Apple Developer Forums](https://developer.apple.com/forums/thread/801239)). Uma tab bar `fixed` translúcida pode gerar tintas inesperadas no navegador; no PWA standalone isso não se aplica da mesma forma. **Teste no iPhone real** antes de decidir entre `fixed` e `sticky`.
- **Performance e bateria:** ver 4.2.
- **Manutenção:** um "tema iOS" vira dívida a cada WWDC. Tokens próprios e semânticos (`--glass-*`) isolam essa dívida em um arquivo.

---

## 7. Mapeamento para o Easy Grades

Legenda: **Esforço** P (≤1 dia), M (2–4 dias), G (≥1 semana). **Risco** = chance de regressão de acessibilidade, desempenho ou identidade.

| Área | Hoje (Grafite) | Proposta inspirada no iOS | Esforço | Risco |
|---|---|---|---|---|
| **Tokens de cor** | `--fundo`, `--superficie`, `--texto`, `--suave`, `--linha`, `--campo`, esmeralda (3 tons), `--erro`. Botões grafite. | Manter a paleta e acrescentar tokens de material: `--glass-tint`, `--glass-edge`, `--glass-shadow` (claro e escuro), um conjunto de **contraste aumentado** (`prefers-contrast: more`, pedido pela [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)) e `--fundo-agrupado` (= `--fundo`). **O esmeralda vira a tint do app:** aba selecionada, foco, progresso, status "concluída" e, no máximo, **uma** ação primária tingida por tela (por exemplo, "Usar sugestão"). O resto dos botões fica grafite ou neutro. | P | Baixo |
| **Tipografia** | Mona Sans em tudo; `heading-ink` 800/wdth 125; display 44 e stat 64 px. | Híbrido: `system-ui` no corpo, Mona Sans em títulos, números e códigos. Escala com nomes do iOS (`text-large-title` 34/41, `title1` 28/34, `title2` 22/28, `title3` 20/25, `headline` 17/22 semibold, `body` 17/22, `callout` 16/21, `subhead` 15/20, `footnote` 13/18, `caption` 12/16; mínimo 11). Opcional: `-apple-system-body` na raiz via `@supports`. | M | Médio (identidade; reflow de layouts com corpo maior) |
| **Radius** | 8 px nos controles, 14 px nos painéis e sheets, pílula só nos chips. | Botões, chips, campos de busca, segmented e tab bar viram **cápsula**. Painéis e cartões passam a 20–24 px (valor nosso); filhos usam `calc(var(--r-pai) - var(--pad))`. A sheet acompanha os cantos da tela no topo (cerca de 28–32 px, valor nosso). | P–M | Baixo |
| **Sombras e materiais** | Sem sombra; bordas `--linha`; superfície branca. | Conteúdo: superfície opaca, sem sombra ou com sombra quase nula, hairline. Navegação: `glass` (tinta, blur e saturação, borda especular, sombra suave). Sem vidro sobre vidro. | M | Médio (contraste e GPU) |
| **Tab bar (< md)** | Barra fixa de borda a borda, 56 px, `border-t`, traço de 2 px na aba ativa. | **Cápsula de vidro flutuante**, inset de 12–16 px das bordas e acima da safe area. Indicador ativo como pílula de fundo (tinta esmeralda clara ou grafite) que desliza com spring entre abas. Ícone preenchido na ativa ([HIG](https://developer.apple.com/design/human-interface-guidelines/tab-bars): "Prefer filled symbols"). Rótulos sempre visíveis e alvo ≥ 44 px. Minimização ao rolar só em Disciplinas, se for testada. | M | Médio (alvos, `theme-color` do Safari, toasts que precisam de novo offset) |
| **Header** | Marca, nav no desktop e ações; `border-b`. | Mobile: **large title por aba** ("Visão geral", "Disciplinas"…) que colapsa num título inline centralizado ou à esquerda dentro de uma barra de vidro ao rolar (scroll-driven no Safari 26+, IntersectionObserver como fallback). À direita, o botão ⋯ em cápsula de vidro. O `scroll edge effect` (gradiente com máscara e blur leve) substitui a `border-b`. Desktop: barra de vidro sticky com o nav como segmented control ou abas. | M | Médio |
| **Sheets** | `Sheet` shadcn (Radix Dialog) inferior, animação própria, sem arrastar. | Sheet com **grabber**, detents médio e grande, cantos concêntricos ao aparelho e vidro regular sobre overlay escurecido. Botões: Cancelar à esquerda, Concluir à direita ([HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)). Implementar o drag por cima do Radix (pointer events e `transform`) ou adotar Vaul com versão travada. O `sheet.tsx` continua sem patch; o comportamento vai num wrapper. | G | Médio–alto (foco, VoiceOver, gesto vs. rolagem interna) |
| **Cards de métricas (Visão geral)** | `OverviewSummary`: 3 colunas separadas por `border-y`, números `heading-ink` display. | **Cartões estilo Saúde:** cada métrica (CR, formatura prevista, horas fora de sala) num cartão opaco arredondado com rótulo pequeno, ícone na cor do tema, número grande em Mona Sans, contexto em footnote e chevron opcional para a seção de detalhe. Seções "Fixados" e "Destaques". O `MarkerBand` continua como herói, sem vidro. | M | Baixo |
| **Lista de Disciplinas** | Chips com contagem, agrupamento com cabeçalho sticky, tabela no desktop e cartões no mobile. | Mobile: **inset grouped** (uma seção por período, cartão arredondado com linhas separadas por hairline recuada, linha ≥ 44 px, nota à direita, badge de status com ícone e texto). Cabeçalho de seção em estilo footnote/subhead com "CR 8,2 · 360 h". Segmented control em cápsula para Período/Categoria. A busca pode ficar no fundo, acima da tab bar, como em Ajustes, ou no topo; decidir em teste. | M | Baixo |
| **Fluxograma** | React Flow com controles padrão (44 px no mobile), minimapa com borda, legenda, botão Exportar. | **"Modo Mapas":** canvas de borda a borda sob o header de vidro; controles (zoom, ajustar, lista/grafo, exportar) em **cápsulas de vidro** agrupadas por função; legenda num popover de vidro. Nós continuam **opacos**, com raio concêntrico ao cartão e sem vidro. Detalhe da disciplina numa sheet de detent médio. | M | Médio (desempenho do blur sobre um canvas que se move: testar FPS no pan) |
| **Planejamento ("Meu semestre")** | Barra fixa acima da tab bar abaixo de lg; abre bottom sheet; painel sticky em ≥ lg. | Barra em **cápsula de vidro** acima da tab bar, com contagem, créditos e CR projetado. Ao tocar, morph (View Transition) para a sheet com detents. A WWDC desaconselha ações específicas de uma tela no acessório da tab bar, então ela **não** deve se fundir à tab bar; fica como elemento flutuante próprio, só nesta tela. | M | Médio |
| **Toasts (Sonner)** | Base; offsets manuais para a tab bar e a barra do semestre. | Cápsula de vidro compacta com ícone, texto curto e "Desfazer" tingido. Recalcular os offsets para a tab bar flutuante. | P | Baixo |
| **Gráficos (Recharts)** | CR, horas e projeção; lazy. | Estilo Swift Charts: grade mínima, eixo de barras em 0, barras com cantos arredondados (`radius` do Recharts), rótulo e valor alinhados à borda inicial, títulos descritivos e resumo acessível ([HIG Charts](https://developer.apple.com/design/human-interface-guidelines/charts)). Cor: esmeralda para o dado principal e grafite/suave para o resto. | P–M | Baixo |
| **Ícone do app / PWA** | Grade 3×3 sobre grafite; PNGs gerados de `brand/icon.svg`. | Manter o símbolo. Opcionalmente, uma versão com "profundidade" achatada (gradiente sutil no fundo e células com leve brilho), respeitando "clearly defined edges" e sem máscara pré-aplicada ([HIG App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)). Testar a versão maskable. Não presumir efeitos de vidro do sistema em ícone de web app (não verificado). | P | Baixo |
| **Motion tokens** | `--ease-snap`, `--ease-glide`, `--ease-drawer` (cubic-bezier), ≤250 ms. | Acrescentar `--spring-snappy` e `--spring-smooth` como `linear()` (seção 8) com durações reais. Springs só em movimento espacial (indicador da aba, sheet, morph); fades continuam com ease. Reduced motion: springs viram fade de ≤150 ms, sem bounce, sem animar blur. | P | Baixo |

---

## 8. Snippets de referência (Tailwind v4)

### 8.1 Material de vidro com fallbacks

```css
:root {
  --glass-tint: color-mix(in oklab, var(--superficie) 78%, transparent);
  --glass-edge: color-mix(in oklab, #fff 60%, transparent);
  --glass-shadow: 0 8px 24px rgb(0 0 0 / 0.10), 0 1px 2px rgb(0 0 0 / 0.06);
}
@media (prefers-color-scheme: dark) {
  :root {
    --glass-tint: color-mix(in oklab, var(--superficie) 80%, transparent);
    --glass-edge: color-mix(in oklab, #fff 14%, transparent);
    --glass-shadow: 0 8px 24px rgb(0 0 0 / 0.45);
  }
}

@utility glass {
  background: var(--superficie);
  border: 1px solid var(--linha);
  box-shadow: var(--glass-shadow);
  @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    background: var(--glass-tint);
    -webkit-backdrop-filter: blur(16px) saturate(170%);
    backdrop-filter: blur(16px) saturate(170%);
    border-color: var(--glass-edge);
    box-shadow: inset 0 1px 0 var(--glass-edge), var(--glass-shadow);
  }
}

@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .glass {
    background: var(--superficie);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    border-color: var(--texto);
  }
}
:root[data-aparencia="solida"] .glass {
  background: var(--superficie);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
```

A tinta de 78–80% e o blur de 16 px são pontos de partida, **não valores da Apple**. Valide o contraste de `--suave` sobre o vidro com o pior fundo possível (por exemplo, um nó esmeralda passando por baixo).

### 8.2 Scroll edge effect (em vez de `border-b`)

```css
@utility scroll-edge-top {
  position: relative;
  &::after {
    content: "";
    position: absolute;
    inset: 100% 0 auto;
    height: 16px;
    pointer-events: none;
    background: linear-gradient(var(--fundo), transparent);
  }
}
```

### 8.3 Springs com `linear()`

Os valores foram gerados neste estudo pela simulação do modelo `Spring(duration:bounce:)` (massa 1, rigidez (2π/d)², amortecimento 4π(1−b)/d, que confere com o exemplo da [doc da Apple](https://developer.apple.com/documentation/swiftui/spring)). A duração CSS é o tempo até assentar (±0,2%), maior que o `duration` "percebido".

```css
@theme {
  /* d=0.25 s, bounce 0: assenta em ~380 ms, sem overshoot */
  --ease-spring-smooth: linear(0, 0.09, 0.256, 0.427, 0.576, 0.694, 0.783, 0.848, 0.895, 0.928, 0.951, 0.967, 0.978, 0.985, 0.99, 0.993, 0.996, 0.997, 0.998, 0.999, 1);
  /* d=0.3 s, bounce 0.2: assenta em ~430 ms, overshoot ~1,4% */
  --ease-spring-snappy: linear(0, 0.085, 0.257, 0.446, 0.617, 0.754, 0.856, 0.925, 0.97, 0.996, 1.009, 1.014, 1.014, 1.012, 1.01, 1.007, 1.005, 1.003, 1.002, 1.001, 1);
}

.tab-indicator {
  transition: transform 430ms var(--ease-spring-snappy);
}
@media (prefers-reduced-motion: reduce) {
  .tab-indicator {
    transition: opacity 150ms ease;
  }
}
```

O movimento percebido termina perto de 250–300 ms; a cauda tem amplitude abaixo de 1%. Isso respeita o espírito do limite de 250 ms das interações frequentes. Ainda assim, use springs só em movimentos espaciais.

### 8.4 Safe areas e tab bar flutuante

```css
.tabbar {
  position: fixed;
  inset-inline: max(12px, env(safe-area-inset-left)) max(12px, env(safe-area-inset-right));
  bottom: max(8px, env(safe-area-inset-bottom));
  border-radius: 9999px;
}
.tabbar-item {
  min-height: 44px;
  border-radius: inherit;
}
main {
  padding-bottom: calc(72px + max(8px, env(safe-area-inset-bottom)));
}
```

`viewport-fit=cover` já está no `index.html`. No PWA standalone, `apple-mobile-web-app-status-bar-style="black-translucent"` deixa o conteúdo passar por baixo da status bar (combina com large title e vidro). Isso exige `padding-top: env(safe-area-inset-top)` em tudo que for fixo no topo; hoje o valor é `default`.

---

## 9. Checklist de acessibilidade e desempenho

**Acessibilidade**
- [ ] Texto sobre vidro ≥ 4.5:1 (≤ 17 pt) contra o **pior** fundo que pode passar por baixo; componentes e bordas ≥ 3:1 ([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- [ ] Modo sólido acionado por `prefers-contrast: more`, `prefers-reduced-transparency: reduce` (Chrome) **e** pela preferência no app (Safari não expõe a transparência).
- [ ] Variante de contraste aumentado nos tokens: bordas `--texto` e tinta opaca.
- [ ] Status continua com ícone e texto; o vidro nunca carrega significado sozinho.
- [ ] Alvos ≥ 44 px dentro da tab bar em cápsula, com espaçamento real entre eles (crítica da NN/g).
- [ ] Tab bar sempre visível. Se minimizar, os rótulos voltam ao tocar ou rolar para cima e nenhuma aba some.
- [ ] Large title: o `<h1>` real continua no DOM; o título inline colapsado é `aria-hidden`.
- [ ] Sheet: grabber operável por teclado e leitor de tela (botão "Expandir/Recolher"), foco preso, Esc fecha, foco volta ao gatilho.
- [ ] Reduced motion: sem bounce, sem animar blur, sem morph de posição; só fade de ≤150 ms.
- [ ] Corpo de 17 px no mobile; testar zoom de 200% e, se adotado, `-apple-system-body` nos tamanhos de acessibilidade.
- [ ] Gráficos com título descritivo e resumo textual ([HIG Charts](https://developer.apple.com/design/human-interface-guidelines/charts)).

**Desempenho**
- [ ] No máximo 3–4 elementos com `backdrop-filter` visíveis ao mesmo tempo.
- [ ] Nenhum `backdrop-filter` em itens de lista, cartões ou nós do React Flow.
- [ ] Animar só `transform` e `opacity`; nunca o raio do blur.
- [ ] Medir FPS de rolagem e pan do fluxograma em Android de entrada e em iPhone antigo, com e sem vidro.
- [ ] Exportação PNG (`html-to-image`): o vidro do canvas deve ficar fora da captura (a classe `.is-exporting` já existe; incluir os controles flutuantes).
- [ ] Fontes: se o corpo for `system-ui`, avaliar subset da Mona Sans só para títulos.
- [ ] Testar `theme-color`/tinta das barras do Safari 26 com a tab bar `fixed` translúcida.

---

## 10. Roteiro sugerido em fases

1. **Fase 0: decisões e protótipo (P).** Responder às perguntas da seção 11. Fazer um protótipo descartável (skill `prototype`) de três telas a 390 px: Visão geral, Disciplinas e Fluxograma, com tab bar e header de vidro. Medir o contraste sobre o vidro e o FPS no iPhone real e num Android.
2. **Fase 1: fundações (P–M).** Tokens de vidro e contraste aumentado, utilitário `glass`, escala tipográfica, fonte híbrida, raios em cápsula e concêntricos, springs `linear()`. Atualizar a spec (seção 3.0 "Grafite" → "Grafite 2" ou novo nome) e o `CLAUDE.md`.
3. **Fase 2: casca de navegação (M).** Tab bar flutuante, large title com scroll edge, menu ⋯ em cápsula, offsets de toast, preferência "Aparência: vidro/sólido" no menu.
4. **Fase 3: conteúdo (M).** Cartões de métricas na Visão geral, inset grouped em Disciplinas, estilo Swift Charts nos gráficos. **Sem vidro.**
5. **Fase 4: superfícies flutuantes (G).** Sheets com detents e grabber, barra "Meu semestre" em cápsula com morph, controles de vidro no fluxograma.
6. **Fase 5: polimento e ícone (P).** Ícone revisto, View Transitions entre abas, auditoria react-doctor, teste com VoiceOver no iPhone e TalkBack no Android.

Cada fase segue o fluxo do projeto: branch própria, `pnpm react-doctor:changed` e gate ≥ 90.

---

## 11. Perguntas em aberto para o dono decidir

1. **Fidelidade:** copiar o iOS (tab bar e sheets idênticas, idiomas da Apple) ou "linguagem inspirada" com a identidade Grafite? Este estudo recomenda a inspirada.
2. **Fonte:** manter só Mona Sans, adotar o híbrido (Mona nos títulos e `system-ui` no corpo) ou trocar tudo pelo `system-ui`? Se for híbrido, os títulos continuam em wdth 125/800 ou ficam mais sóbrios, em wdth 100–112/700?
3. **Esmeralda como tint:** ele pode tingir **uma** ação primária por tela (botão "prominent" no estilo iOS), ou os botões continuam todos grafite e o esmeralda fica só em progresso, aprovação, foco e aba ativa?
4. **Escopo do vidro:** só a casca (tab bar, header, barra do semestre, controles do fluxograma) ou também as sheets e o menu ⋯? E no desktop (≥ md), o header vira vidro ou fica sólido?
5. **Tab bar que minimiza ao rolar:** adotar (mais área de conteúdo) ou manter fixa (mais previsível, como pede a NN/g)?
6. **Sheets arrastáveis:** vale o esforço G (drag e detents próprios) ou basta a sheet atual com grabber decorativo e botão de expandir?
7. **Preferência de aparência no app** ("vidro / sólido"): aceitável no menu "Mais opções"? Ela é a única forma de respeitar quem usa "Reduzir transparência" no iPhone.
8. **Corpo de 17 px no mobile:** aceitar o aumento de altura das telas (Disciplinas e Planejamento ficam mais longas)?
9. **Dynamic Type via `-apple-system-body`:** adotar no iOS, sabendo que os outros sistemas não acompanham?
10. **Nome e spec:** o resultado é uma evolução do "Grafite" ou uma identidade nova, que exige nova spec e novas regras no `CLAUDE.md`?

---

## 12. Fontes

### Primárias (Apple, WebKit, MDN, Chrome)

- Apple HIG: [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) · [Color](https://developer.apple.com/design/human-interface-guidelines/color) · [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) · [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) · [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) · [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) · [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) · [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) · [Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views) · [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) · [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) · [Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) · [Charts](https://developer.apple.com/design/human-interface-guidelines/charts) · [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) · [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Branding](https://developer.apple.com/design/human-interface-guidelines/branding) · [Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications) · [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Apple Design — What's new](https://developer.apple.com/design/whats-new/) · [Apple Design Resources](https://developer.apple.com/design/resources/)
- WWDC25: ["Meet Liquid Glass" (219)](https://developer.apple.com/videos/play/wwdc2025/219/) · ["Get to know the new design system" (356)](https://developer.apple.com/videos/play/wwdc2025/356/)
- Apple Newsroom: [Nova linguagem de design (9 jun 2025)](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) · [iOS 26](https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/) · [ADA 2023](https://www.apple.com/newsroom/2023/06/apple-announces-winners-of-the-2023-apple-design-awards/) · [ADA 2025](https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/) · [ADA 2026](https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/)
- SwiftUI: [Spring](https://developer.apple.com/documentation/swiftui/spring) · [Animation.default](https://developer.apple.com/documentation/swiftui/animation/default) · [smooth](https://developer.apple.com/documentation/swiftui/animation/smooth(duration:extrabounce:)) · [snappy](https://developer.apple.com/documentation/swiftui/animation/snappy(duration:extrabounce:)) · [bouncy](https://developer.apple.com/documentation/swiftui/animation/bouncy(duration:extrabounce:))
- [Apple Fonts (licença do SF)](https://developer.apple.com/fonts/) · [SF Symbols](https://developer.apple.com/sf-symbols/) · [Apple Developer Forums: SF em web app](https://developer.apple.com/forums/thread/733267) · [Apple Developer Forums: cor da barra no iOS 26](https://developer.apple.com/forums/thread/801239) · [Apple Support: app Saúde](https://support.apple.com/guide/iphone/view-your-health-data-iphe3d379c32/ios)
- WebKit: [Using the System Font in Web Content](https://webkit.org/blog/3709/using-the-system-font-in-web-content/) · [Safari 17.4](https://webkit.org/blog/15063/) · [Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) · [Bug 313914](https://bugs.webkit.org/show_bug.cgi?id=313914)
- MDN: [prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency) · [browser-compat-data v8.1.6](https://github.com/mdn/browser-compat-data) (tabela 4.1) · [caniuse](https://caniuse.com/)
- Chrome for Developers: [linear() easing](https://developer.chrome.com/docs/css-ui/css-linear-easing-function)

### Secundárias

- [NN/g — "Liquid Glass Is Cracked, and Usability Suffers in iOS 26" (Raluca Budiu, 10 out 2025)](https://www.nngroup.com/articles/liquid-glass/) (pesquisa de usabilidade independente)
- [kube.io — Liquid Glass in the Browser (4 set 2025)](https://kube.io/blog/liquid-glass-css-svg/)
- [MacRumors — iOS 26.1 toggle](https://www.macrumors.com/2025/10/20/ios-26-1-liquid-glass-toggle/) · [Tom's Guide — iOS 26.1](https://www.tomsguide.com/phones/iphones/ios-26-1-lets-you-adjust-liquid-glass-transparency-on-your-iphone-heres-how-to-do-it) · [Thurrott — beta 3](https://www.thurrott.com/apple/323084/ios-26-beta-3-tones-down-liquid-glass-redesign)
- [BGR — iOS 27 Liquid Glass](https://bgr.com/2191219/ios-27-liquid-glass-fix-customization/) · [Tom's Guide — iOS 27](https://www.tomsguide.com/phones/iphones/ios-27-has-a-bunch-of-changes-including-a-refined-liquid-glass-design-but-how-much-has-changed-from-ios-26)
- [Ben Frain — iOS 26 Safari theme-color](https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/)
- [Konsta UI](https://konstaui.com/) · [Vaul (GitHub)](https://github.com/emilkowalski/vaul) · [@rdlabo/ionic-theme-ios26 (zenn.dev)](https://zenn.dev/rdlabo/articles/1cac6284b08db2) · [ios-haptics (npm)](https://npmjs.com/package/ios-haptics) · [Ionic issue #29942](https://github.com/ionic-team/ionic-framework/issues/29942)

### Não verificado em fonte primária (citado com ressalva no texto)

- O controle de opacidade do Liquid Glass no iOS 27 e a data em que apareceu.
- Os valores de bounce dos presets `.snappy` e `.bouncy`.
- Os termos de licença do SF Symbols.
- Se o iOS aplica efeitos de vidro ou tint a ícones de PWA na Tela de Início.
- Os redesigns de Flighty, Copilot Money, Things, Linear, Revolut e Arc/Dia para o iOS 26.
- Benchmarks de custo do `backdrop-filter` em mobile.
- Um valor numérico de raio de cartão ou de margem lateral na HIG atual do iPhone.
