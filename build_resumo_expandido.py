"""Gera o Resumo Expandido acadêmico do Desk Imperial em PDF.

Formatação: Times New Roman 12, espaçamento 1,5, texto justificado,
margens 2,5 cm (ABNT), no máximo 6 páginas (exceto referências).
"""
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
)

OUTPUT = r"c:\Users\Desktop\Documents\desk-imperial\resumo-expandido-desk-imperial.pdf"

pdfmetrics.registerFont(TTFont("TimesNR", r"C:\Windows\Fonts\times.ttf"))
pdfmetrics.registerFont(TTFont("TimesNR-Bold", r"C:\Windows\Fonts\timesbd.ttf"))
pdfmetrics.registerFont(TTFont("TimesNR-Italic", r"C:\Windows\Fonts\timesi.ttf"))
pdfmetrics.registerFont(TTFont("TimesNR-BoldItalic", r"C:\Windows\Fonts\timesbi.ttf"))
pdfmetrics.registerFontFamily(
    "TimesNR",
    normal="TimesNR",
    bold="TimesNR-Bold",
    italic="TimesNR-Italic",
    boldItalic="TimesNR-BoldItalic",
)

FONT = "TimesNR"
FONT_BOLD = "TimesNR-Bold"
FONT_ITALIC = "TimesNR-Italic"

LEAD = 18  # 12pt * 1.5 = 18pt linha

style_title = ParagraphStyle(
    "title",
    fontName=FONT_BOLD,
    fontSize=12,
    leading=LEAD,
    alignment=TA_CENTER,
    spaceAfter=18,
)

style_header = ParagraphStyle(
    "header",
    fontName=FONT,
    fontSize=12,
    leading=LEAD,
    alignment=TA_CENTER,
    spaceAfter=6,
)

style_section = ParagraphStyle(
    "section",
    fontName=FONT_BOLD,
    fontSize=12,
    leading=LEAD,
    alignment=TA_LEFT,
    spaceBefore=12,
    spaceAfter=6,
)

style_body = ParagraphStyle(
    "body",
    fontName=FONT,
    fontSize=12,
    leading=LEAD,
    alignment=TA_JUSTIFY,
    firstLineIndent=1.25 * cm,
    spaceAfter=6,
)

style_abstract = ParagraphStyle(
    "abstract",
    fontName=FONT,
    fontSize=12,
    leading=LEAD,
    alignment=TA_JUSTIFY,
    spaceAfter=6,
)

style_keywords = ParagraphStyle(
    "keywords",
    fontName=FONT,
    fontSize=12,
    leading=LEAD,
    alignment=TA_JUSTIFY,
    spaceAfter=6,
)

style_ref = ParagraphStyle(
    "ref",
    fontName=FONT,
    fontSize=12,
    leading=LEAD,
    alignment=TA_JUSTIFY,
    leftIndent=0,
    firstLineIndent=0,
    spaceAfter=6,
)


def P(text, style):
    return Paragraph(text, style)


TITULO = (
    "DESK IMPERIAL: SISTEMA GRATUITO E DE CÓDIGO ABERTO DE GESTÃO COMERCIAL "
    "PARA PEQUENOS E MÉDIOS COMERCIANTES BRASILEIROS"
)

CATEGORIA = "Categoria: Resumo Expandido — Graduação em Engenharia de Software"
AUTOR = "João Victor de Moraes da Cruz"
ORIENTADOR = "Professor: Lucas Hermenegildo do Nascimento"
FILIACAO = (
    "Universidade de Vassouras — Curso de Engenharia de Software"
)
EMAIL = "E-mail do autor principal: jvictodacruz13@gmail.com"

RESUMO = (
    "<b>Resumo:</b> O pequeno e médio comércio brasileiro responde por parcela significativa "
    "dos empregos formais no país, mas convive com baixa adoção de tecnologia de gestão, "
    "recorrendo a planilhas ou controles manuais em razão do custo de sistemas comerciais "
    "proprietários. Este trabalho apresenta o Desk Imperial, sistema gratuito e de código "
    "aberto, licenciado em MIT, desenvolvido para integrar operação em tempo real — ponto "
    "de venda, comandas e acompanhamento de salão — e gestão do negócio, incluindo "
    "financeiro por período, folha de pagamento automática, mapa de vendas geocodificado e "
    "painel executivo móvel. O objetivo geral é oferecer a pequenos e médios comerciantes "
    "uma ferramenta completa, segura e acessível, sem mensalidade. Adota-se pesquisa "
    "aplicada de natureza mista, combinando levantamento qualitativo de requisitos junto a "
    "um comércio familiar real com avaliação quantitativa da solução por meio de testes "
    "automatizados, métricas de latência e auditoria estática de qualidade. O desenvolvimento "
    "emprega arquitetura em monorepo com NestJS, Next.js, PostgreSQL, Redis e Socket.IO, "
    "sustentada por pipeline de integração contínua de seis estágios, cobertura por "
    "cinquenta e três suítes de teste no backend, testes ponta a ponta com Playwright e "
    "testes de carga com K6 definindo metas de latência p95 e p99. Os resultados confirmam "
    "quatorze módulos em produção, Quality Gate aprovado em auditoria SonarQube, "
    "isolamento por workspace e mecanismos de segurança baseados em cookies HttpOnly, CSRF "
    "duplo, rate limit e PIN administrativo. Conclui-se que o sistema demonstra viabilidade "
    "técnica e social, contribuindo como base educacional e produtiva reproduzível para "
    "estudos em engenharia de software aplicada."
)

PALAVRAS_CHAVE = (
    "<b>Palavras-chave:</b> Sistema de gestão comercial; Software livre; "
    "Ponto de venda em tempo real; Engenharia de software; Pequenas e médias empresas."
)

INTRO = [
    "A estrutura econômica brasileira depende fortemente das micro e pequenas empresas, "
    "que representam parcela dominante dos estabelecimentos ativos no país (SEBRAE, 2022). "
    "Apesar desse peso, o segmento apresenta baixa maturidade tecnológica em gestão "
    "comercial. Estudos setoriais indicam que parcela relevante dos comerciantes ainda "
    "controla vendas, despesas e folha de pagamento por meio de anotações manuais ou "
    "planilhas eletrônicas, o que favorece erros, atrasos e decisões pouco informadas "
    "(IBGE, 2022). O custo mensal de sistemas proprietários de ponto de venda e de gestão "
    "financeira é apontado como barreira central à profissionalização da operação, em "
    "especial para restaurantes, lanchonetes, bares e pequenos varejistas de atendimento "
    "presencial.",

    "Paralelamente, a literatura de engenharia de software consolida práticas que tornam "
    "a construção de sistemas corporativos acessível a equipes enxutas. Sommerville (2019) "
    "descreve a evolução dos processos incrementais e iterativos e sua adequação a projetos "
    "com requisitos voláteis. Pressman e Maxim (2021) reforçam o papel da automação de "
    "testes e da integração contínua para garantir qualidade com ciclos curtos de entrega. "
    "Fowler (2002) organiza padrões de arquitetura aplicáveis a aplicações web "
    "empresariais, recorrentes em sistemas de gestão. No plano filosófico e licenciatário, "
    "Stallman (2002) sistematiza os argumentos que justificam o modelo de software livre "
    "como alternativa ética e econômica à dependência de fornecedores proprietários. Essas "
    "referências sustentam a tese de que é viável construir sistemas de gestão comercial "
    "robustos sob licenças permissivas.",

    "Ainda assim, observa-se lacuna clara no ecossistema nacional. As soluções gratuitas "
    "disponíveis normalmente oferecem apenas ponto de venda básico, sem operação em tempo "
    "real entre múltiplos dispositivos; ou concentram-se em módulos financeiros isolados, "
    "sem integração com o atendimento no salão; ou exigem instalação local e manutenção "
    "técnica incompatíveis com o perfil do pequeno comerciante. O resultado prático é que "
    "o dono de estabelecimento, em geral, opera sem visão consolidada do próprio negócio: "
    "desconhece a margem real por produto, a produtividade por vendedor, a distribuição "
    "geográfica dos pedidos e o custo exato da folha de pagamento, informações essenciais "
    "para crescer de forma sustentável.",

    "O presente trabalho apresenta o Desk Imperial, um sistema gratuito e de código aberto, "
    "licenciado sob MIT, que busca preencher essa lacuna ao unir, em uma única plataforma "
    "web, operação ao vivo e gestão do negócio. A operação ao vivo compreende ponto de "
    "venda, comandas em kanban, sincronização entre todos os dispositivos da equipe via "
    "Socket.IO e interfaces móveis específicas para dono e funcionário. A gestão do negócio "
    "compreende painel financeiro com receita, custo e margem por período, folha de "
    "pagamento calculada automaticamente a partir de salário fixo somado a comissão sobre "
    "vendas, ranking de vendedores, calendário comercial e mapa de vendas geocodificado por "
    "bairro. Camadas transversais atendem exigências contemporâneas: conformidade com a Lei "
    "Geral de Proteção de Dados Pessoais (BRASIL, 2018), isolamento completo por workspace, "
    "autenticação baseada em cookies HttpOnly com proteção CSRF em camada dupla, limitação "
    "de taxa em Redis e bloqueio anti-força-bruta com PIN administrativo de uso restrito.",

    "A relevância científica e técnica do projeto está na composição desses elementos em um "
    "produto real, publicamente acessível e reproduzível. O repositório é aberto sob licença "
    "MIT, possui pipeline de integração contínua de seis estágios e documentação técnica "
    "extensa. O sistema encontra-se em produção no endereço público app.deskimperial.online "
    "e é utilizado de forma contínua por um comércio familiar brasileiro. Dessa maneira, o "
    "projeto atende à necessidade prática do público-alvo e à formação acadêmica de "
    "estudantes de engenharia de software e ciência da computação, que podem estudar, "
    "estender ou utilizar o código como referência.",

    "O objetivo geral deste trabalho é descrever o Desk Imperial enquanto artefato de "
    "engenharia de software voltado ao pequeno e médio comércio brasileiro, apresentando "
    "seu problema de pesquisa, sua arquitetura, sua metodologia de desenvolvimento e os "
    "resultados já obtidos. Constituem objetivos específicos: (i) caracterizar o problema da "
    "ausência de sistemas gratuitos de gestão comercial para o público-alvo; (ii) descrever "
    "a arquitetura técnica adotada e as justificativas de cada escolha; (iii) apresentar a "
    "metodologia mista empregada na construção e na avaliação do sistema; e (iv) discutir "
    "os resultados atuais, incluindo módulos entregues, cobertura de testes, métricas de "
    "latência e limitações reconhecidas.",
]

METODO = [
    "O desenvolvimento adota pesquisa aplicada de natureza mista, alinhada à Design Science "
    "Research descrita por Dresch, Lacerda e Antunes Júnior (2015), cujo objetivo é produzir "
    "artefatos que resolvam problemas concretos e que, simultaneamente, gerem conhecimento "
    "validável. A pesquisa combina vertentes qualitativa e quantitativa, conforme abordagem "
    "recomendada por Wazlawick (2014) para trabalhos em computação que envolvem a construção "
    "de sistemas.",

    "A etapa qualitativa consistiu no levantamento de requisitos junto a um comércio familiar "
    "brasileiro, caracterizado como caso instrumental. O procedimento incluiu observação "
    "direta da operação diária, entrevistas semiestruturadas com dono e funcionários, análise "
    "documental de controles manuais preexistentes e identificação de pontos de fricção "
    "recorrentes na rotina. Desse levantamento emergiram os módulos prioritários: ponto de "
    "venda com comandas, folha de pagamento automática, painel financeiro por período e "
    "sincronização em tempo real entre dispositivos.",

    "A etapa quantitativa concentra-se na avaliação da solução. Foram definidas métricas "
    "objetivas de qualidade em três eixos: (i) latência de resposta, medida por testes de "
    "carga com K6 em cenários críticos, com metas de p95 e p99 estabelecidas previamente; "
    "(ii) cobertura funcional, aferida por cinquenta e três suítes de testes automatizados "
    "com Jest no backend e por testes ponta a ponta com Playwright no frontend; e "
    "(iii) qualidade estática de código, verificada por análise contínua com SonarQube, "
    "cujo Quality Gate precisa permanecer aprovado para publicação.",

    "O desenvolvimento segue método incremental e iterativo, coerente com Sommerville (2019) "
    "e Pressman e Maxim (2021). O artefato é construído em monorepo gerenciado por Turborepo "
    "e npm workspaces, contendo aplicação de back-end em NestJS 11 com TypeScript, aplicação "
    "de front-end em Next.js 16 com React 19 e pacotes compartilhados de tipos e de "
    "configuração. A persistência utiliza PostgreSQL 16 acessado por Prisma ORM; o cache e o "
    "controle de taxa de requisição utilizam Redis; a sincronização em tempo real utiliza "
    "Socket.IO. A autenticação é baseada em cookies HttpOnly, com proteção CSRF em padrão "
    "duplo, conforme recomendações do OWASP (2021). A arquitetura segue padrões de aplicação "
    "corporativa descritos por Fowler (2002), organizada em dezesseis módulos de domínio na "
    "API.",

    "A esteira de integração contínua executa seis estágios em sequência: qualidade, testes "
    "de backend, testes unitários de frontend, testes ponta a ponta, verificação de "
    "segurança e construção final. A promoção de uma versão para produção apenas ocorre com "
    "todos os estágios aprovados. O produto é entregue continuamente em ambiente público, "
    "com URL aberta para demonstração, e está em processo de migração do provedor atual para "
    "infraestrutura em Oracle Cloud combinada ao serviço gerenciado de PostgreSQL Neon, "
    "conforme plano técnico documentado no repositório.",

    "A avaliação final considera ainda fatores qualitativos reconhecidos pela literatura: "
    "usabilidade percebida por usuários reais em produção, facilidade de contribuição "
    "externa medida pela abertura do repositório sob licença MIT e pela documentação "
    "publicada e alinhamento a princípios de software livre conforme Stallman (2002). "
    "Esses critérios, combinados às métricas quantitativas, constituem o método misto "
    "adotado para avaliar o artefato.",
]

RESULTADOS = [
    "Os resultados obtidos até o momento confirmam a viabilidade da proposta e permitem "
    "discussão à luz da literatura. Quatorze módulos encontram-se em produção e operam "
    "continuamente no endereço público app.deskimperial.online: ponto de venda com comandas "
    "em kanban de quatro colunas, operação em tempo real via Socket.IO, painel financeiro "
    "por período, folha de pagamento automática, gestão de equipe com ranking, calendário "
    "comercial, mapa de vendas geocodificado, exportação em CSV, PIN administrativo com "
    "limite de tentativas, painel móvel para dono, aplicação móvel para funcionário, "
    "autenticação com cookies HttpOnly e CSRF duplo, insight executivo gerado por modelo "
    "Gemini e atendimento às exigências da Lei Geral de Proteção de Dados.",

    "A avaliação quantitativa reporta cinquenta e três arquivos de testes automatizados "
    "cobrindo os módulos críticos do back-end, além de testes ponta a ponta com Playwright "
    "no front-end e testes de carga com K6 aferindo latência p95 e p99 em cenários "
    "representativos de uso simultâneo. A análise estática contínua em SonarQube obteve "
    "Quality Gate aprovado, com backlog de débitos técnicos organizado em sprints "
    "documentadas no repositório. Esses indicadores alinham-se às recomendações de Pressman "
    "e Maxim (2021) sobre automação de garantia de qualidade e de Sommerville (2019) sobre "
    "integração contínua como sustentação de entregas frequentes.",

    "No eixo de segurança, o sistema implementa medidas convergentes com o OWASP Top 10 "
    "(OWASP, 2021). A autenticação baseia-se em cookies HttpOnly, o que mitiga ataques que "
    "dependem de acesso a tokens via JavaScript malicioso. Toda mutação de estado exige "
    "validação de token CSRF em padrão duplo. O isolamento por workspace garante que dados "
    "de diferentes negócios não se cruzem. O PIN administrativo com bloqueio automático por "
    "tentativas reduz a superfície de ataques de força bruta em ações sensíveis. Eventos "
    "sensíveis de autenticação e operação geram registros em log de auditoria.",

    "Sob a ótica da Design Science Research (DRESCH; LACERDA; ANTUNES JÚNIOR, 2015), o "
    "artefato atende aos critérios esperados: resolve problema prático reconhecido, está "
    "publicamente disponível, é reproduzível por meio do repositório e da documentação e "
    "contribui com um guia de arquitetura realista para pequenos sistemas de gestão. A "
    "licença MIT materializa o princípio de liberdade de software defendido por Stallman "
    "(2002), tornando a solução apropriável por qualquer comerciante ou desenvolvedor, sem "
    "barreira econômica ou legal.",

    "As limitações atuais são reconhecidas de forma explícita. A cobertura de testes do "
    "front-end é parcial em relação à superfície total da aplicação. A pilha de "
    "observabilidade de código aberto baseada em OpenTelemetry e Grafana Faro está em "
    "implantação progressiva, com a fase de back-end habilitável por variáveis de ambiente "
    "e a fase de front-end em migração. A importação de produtos por arquivo CSV permanece "
    "desativada por bloqueio explícito em HTTP 410 até que a auditoria do fluxo seja "
    "concluída. Essas limitações não invalidam os resultados obtidos, mas delimitam o "
    "escopo atual de aplicação e apontam linhas imediatas de continuidade.",
]

CONSIDERACOES = [
    "O Desk Imperial demonstra que é viável construir, manter e operar, com equipe "
    "reduzida, um sistema de gestão comercial completo, gratuito e de código aberto para o "
    "pequeno e médio comércio brasileiro. O trabalho atinge o objetivo de descrever o "
    "artefato, seu problema de pesquisa, sua arquitetura e seus resultados. A solução "
    "integra operação em tempo real, gestão financeira, folha automática e inteligência "
    "geográfica em uma mesma plataforma, sob licença MIT. A metodologia mista combina "
    "levantamento qualitativo com usuário real e avaliação quantitativa por testes "
    "automatizados, métricas de latência e auditoria estática. Os resultados confirmam "
    "quatorze módulos em produção, Quality Gate aprovado e mecanismos de segurança "
    "alinhados às boas práticas do setor. O projeto contribui como ferramenta aplicada ao "
    "público-alvo e como recurso educacional aberto para estudantes de engenharia de "
    "software. A continuidade compreende a migração completa para infraestrutura em "
    "Oracle Cloud com serviço gerenciado Neon, a finalização da pilha de observabilidade "
    "de código aberto, a expansão da cobertura de testes de front-end e a reativação "
    "segura da importação de produtos por CSV após nova auditoria.",
]

REFERENCIAS = [
    "BRASIL. <b>Lei nº 13.709, de 14 de agosto de 2018</b>. Lei Geral de Proteção de Dados "
    "Pessoais (LGPD). Diário Oficial da União, Brasília, DF, 15 ago. 2018.",

    "DRESCH, A.; LACERDA, D. P.; ANTUNES JÚNIOR, J. A. V. <b>Design science research</b>: "
    "método de pesquisa para avanço da ciência e tecnologia. Porto Alegre: Bookman, 2015.",

    "FOWLER, M. <b>Patterns of enterprise application architecture</b>. Boston: "
    "Addison-Wesley, 2002.",

    "IBGE. <b>Demografia das empresas e estatísticas de empreendedorismo 2020</b>. "
    "Rio de Janeiro: Instituto Brasileiro de Geografia e Estatística, 2022.",

    "OWASP. <b>OWASP Top 10: 2021</b>. The Open Web Application Security Project, 2021. "
    "Disponível em: https://owasp.org/Top10/. Acesso em: 14 abr. 2026.",

    "PRESSMAN, R. S.; MAXIM, B. R. <b>Engenharia de software</b>: uma abordagem "
    "profissional. 9. ed. Porto Alegre: AMGH, 2021.",

    "SEBRAE. <b>Anuário do trabalho nos pequenos negócios 2021</b>. Brasília: Serviço "
    "Brasileiro de Apoio às Micro e Pequenas Empresas, 2022.",

    "SOMMERVILLE, I. <b>Engenharia de software</b>. 10. ed. São Paulo: Pearson, 2019.",

    "STALLMAN, R. M. <b>Free software, free society</b>: selected essays of Richard M. "
    "Stallman. Boston: GNU Press, 2002.",

    "WAZLAWICK, R. S. <b>Metodologia de pesquisa para ciência da computação</b>. 2. ed. "
    "Rio de Janeiro: Elsevier, 2014.",
]


def build():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        title="Resumo Expandido — Desk Imperial",
        author="João Victor de Moraes da Cruz",
    )

    flow = []

    flow.append(P(TITULO, style_title))
    flow.append(P(CATEGORIA, style_header))
    flow.append(P(AUTOR, style_header))
    flow.append(P(ORIENTADOR, style_header))
    flow.append(P(FILIACAO, style_header))
    flow.append(P(EMAIL, style_header))
    flow.append(Spacer(1, 12))

    flow.append(P(RESUMO, style_abstract))
    flow.append(Spacer(1, 6))
    flow.append(P(PALAVRAS_CHAVE, style_keywords))

    flow.append(P("1. INTRODUÇÃO", style_section))
    for par in INTRO:
        flow.append(P(par, style_body))

    flow.append(P("2. MÉTODO", style_section))
    for par in METODO:
        flow.append(P(par, style_body))

    flow.append(P("3. RESULTADOS E DISCUSSÃO", style_section))
    for par in RESULTADOS:
        flow.append(P(par, style_body))

    flow.append(P("4. CONSIDERAÇÕES FINAIS", style_section))
    for par in CONSIDERACOES:
        flow.append(P(par, style_body))

    flow.append(P("REFERÊNCIAS", style_section))
    for ref in REFERENCIAS:
        flow.append(P(ref, style_ref))

    doc.build(flow)
    print("OK:", OUTPUT)


if __name__ == "__main__":
    build()
