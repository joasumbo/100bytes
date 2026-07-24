/**
 * Conteúdo das páginas institucionais (coluna "Empresa" do footer).
 * Renderizado por `views/pagina-info.ejs`. Segue a tipografia do template Electro.
 * Fonte: pasta OneDrive "informacoes" fornecida pelo cliente.
 */

const SEDE_TEL = "+244 946 920 882";
const LOJA1_TEL = "+244 928 499 325";
const EMAIL = "geral@100bytes.co.ao";
const tel = (t) => t.replace(/\s/g, "");

const paginas = {
  // ─────────────────────────────────────────── SOBRE NÓS ───────────────
  "sobre-nos": {
    titulo: "Sobre Nós",
    subtitulo: "Desde 2020 a trabalhar por si e para si.",
    metaDescription:
      "A 100 Bytes é uma empresa de tecnologia fundada em 2020, focada em soluções modernas, fiáveis e acessíveis, com lojas físicas e assistência técnica especializada.",
    conteudo: `
      <p>A <strong>100 Bytes</strong> é uma empresa de tecnologia fundada em 2020, impulsionada pela inovação e pelo compromisso de oferecer soluções modernas, fiáveis e acessíveis. Desde então, tem crescido de forma consistente, acompanhando a evolução do setor e adaptando-se às necessidades dos clientes.</p>

      <p>Ao longo do percurso, expandiu a sua presença com a abertura de lojas físicas, reforçando a proximidade e proporcionando uma experiência completa, baseada no contacto direto, suporte técnico especializado e oferta diversificada de produtos e serviços.</p>

      <p>A empresa trabalha com foco na excelência, colocando a satisfação do cliente em primeiro lugar. Valoriza o atendimento personalizado, garantindo soluções ajustadas a cada necessidade, e aposta na transparência e credibilidade para construir relações de confiança.</p>

      <p>Conta com técnicos especializados, preparados para responder com eficiência aos desafios tecnológicos. Em constante evolução, acompanha tendências e inovações, posicionando-se como um parceiro tecnológico dedicado a simplificar e impulsionar o progresso dos seus clientes.</p>

      <h2>A nossa jornada</h2>
      <div class="info-steps">
        <div class="info-step">
          <div class="info-step__year">2020</div>
          <div class="info-step__t">Fundação</div>
          <p>Nasce a 100 Bytes com o propósito de transformar tecnologia em soluções para o futuro.</p>
        </div>
        <div class="info-step">
          <div class="info-step__year">Julho de 2025</div>
          <div class="info-step__t">Abertura da loja física</div>
          <p>Um novo capítulo começa com a abertura da nossa loja física na Liga Africana, mais perto de você.</p>
        </div>
      </div>
    `,
  },

  // ─────────────────────────────────────────── LOJAS ───────────────────
  lojas: {
    titulo: "Lojas",
    subtitulo: "Visite-nos. Atendimento personalizado e assistência técnica especializada.",
    metaDescription:
      "Loja física da 100 Bytes em Luanda: Liga Africana, com centro de assistência técnica especializada.",
    conteudo: `
      <div class="info-card">
        <h3>Loja 1 — Liga Africana</h3>
        <p>A 100 Bytes abriu a sua primeira loja física em julho de 2025, reforçando a proximidade com os seus clientes e a sua presença no mercado. Localizada na Rua da Liga Africana, n.º 81, em Luanda, disponibiliza soluções tecnológicas modernas e acessíveis para o dia a dia, tanto para clientes particulares como empresariais.</p>
        <p>Oferecemos uma ampla gama de produtos, incluindo equipamentos informáticos novos e seminovos, impressoras, periféricos, acessórios e consumíveis. Destacamo-nos ainda por uma forte oferta em equipamentos de rede (switches e routers) e servidores, sempre com foco na qualidade e em preços competitivos.</p>
        <p>A loja integra também um centro de assistência técnica, com uma equipa especializada na reparação e manutenção de diversos equipamentos eletrónicos.</p>
        <div class="info-meta">
          <div><i class="fas fa-map-marker-alt"></i><span>Rua da Liga Africana, n.º 81 — Luanda, Angola</span></div>
          <div><i class="fas fa-phone"></i><a href="tel:${tel(LOJA1_TEL)}">${LOJA1_TEL}</a></div>
          <div><i class="fab fa-whatsapp"></i><a href="https://wa.me/244928499325" target="_blank" rel="noopener">Falar por WhatsApp</a></div>
        </div>
      </div>

      <div class="info-note"><p><strong>Sede:</strong> Rua António Américo Lencastre, n.º 11 — Luanda &nbsp;·&nbsp; <a href="mailto:${EMAIL}">${EMAIL}</a> &nbsp;·&nbsp; <a href="tel:${tel(SEDE_TEL)}">${SEDE_TEL}</a></p></div>
    `,
  },

  // ─────────────────────────────────────── FORMAS DE PAGAMENTO ─────────
  "formas-de-pagamento": {
    titulo: "Formas de Pagamento",
    subtitulo: "Métodos de pagamento seguros, práticos e adaptados às suas necessidades.",
    metaDescription:
      "Métodos de pagamento da 100 Bytes: Entidade e Referência, Caixa Express e transferência bancária (IBAN).",
    conteudo: `
      <p>Na 100 Bytes, disponibilizamos métodos de pagamento seguros, práticos e adaptados às necessidades dos nossos clientes, garantindo uma experiência de compra simples e eficiente.</p>

      <h2>Entidade e Referência</h2>
      <p>O pagamento por Entidade e Referência permite efetuar o pagamento de forma cómoda através de Multicaixa, internet banking ou aplicações móveis. Após a finalização da sua encomenda, serão disponibilizados os dados necessários para pagamento, que deverá ser realizado dentro do prazo indicado.</p>

      <h2>Caixa Express</h2>
      <p>Através da aplicação Caixa Express, poderá efetuar o pagamento de forma rápida e segura diretamente a partir do seu dispositivo móvel. Este método oferece maior comodidade, permitindo concluir a sua compra sem necessidade de deslocação.</p>

      <h2>IBAN (Transferência Bancária)</h2>
      <p>O pagamento por transferência bancária (IBAN) permite ao cliente efetuar o pagamento diretamente a partir da sua conta bancária, através dos canais disponibilizados pela respetiva instituição financeira.</p>
      <p>Após a confirmação da encomenda, serão facultados ao cliente os dados bancários necessários para a realização da transferência. Para efeitos de correta identificação e validação do pagamento, o cliente deverá indicar, no campo descritivo da transferência, o <strong>número da encomenda</strong> associado.</p>
      <p>Adicionalmente, o cliente deverá remeter o respetivo comprovativo de pagamento para o endereço <a href="mailto:${EMAIL}">${EMAIL}</a>, de modo a agilizar o processo de validação.</p>

      <div class="info-note">
        <p>O processamento da encomenda ficará condicionado à confirmação do pagamento, não podendo a 100 Bytes ser responsabilizada por atrasos decorrentes de omissões, erros na identificação da transferência ou falta de envio do comprovativo por parte do cliente.</p>
        <p>Todos os pagamentos estão sujeitos a validação. A 100 Bytes reserva-se o direito de apenas processar e dar seguimento às encomendas após a confirmação do respetivo pagamento.</p>
      </div>

      <p>Para qualquer esclarecimento adicional, poderá contactar-nos através dos canais de suporte disponibilizados no website.</p>
    `,
  },

  // ─────────────────────────────────────── TROCAS E DEVOLUÇÕES ─────────
  "trocas-e-devolucoes": {
    titulo: "Trocas e Devoluções",
    subtitulo: "Política de Trocas, Devoluções e Garantias.",
    metaDescription:
      "Condições de trocas, devoluções, reembolsos e garantias da 100 Bytes: direito de devolução em 7 dias, condições de aceitação, custos e garantia dos produtos.",
    conteudo: `
      <p>Na 100 Bytes — Soluções Tecnológicas, Lda., trabalhamos para garantir total transparência e confiança em todas as suas compras. Nesta página encontra todas as condições relativas a devoluções, trocas, reembolsos e garantias.</p>

      <h2>Direito de Devolução (7 dias)</h2>
      <p>O Cliente pode devolver a sua encomenda no prazo de <strong>7 dias</strong>, sem necessidade de justificar o motivo.</p>
      <h3>Como solicitar</h3>
      <ul>
        <li>Email: <a href="mailto:${EMAIL}">${EMAIL}</a></li>
        <li>Telefone: <a href="tel:${tel(SEDE_TEL)}">${SEDE_TEL}</a></li>
        <li>Ou através do suporte no website</li>
      </ul>
      <p>Deve indicar o <strong>número da encomenda ou fatura</strong>. Após o pedido, serão enviadas as instruções para devolução. O produto deve ser devolvido em condições adequadas, sem uso indevido.</p>

      <h2>Condições para aceitação da devolução</h2>
      <p>Para que a devolução seja aceite, o produto deve:</p>
      <ul>
        <li>Estar em perfeito estado;</li>
        <li>Incluir a embalagem original;</li>
        <li>Conter todos os acessórios e manuais;</li>
        <li>Não apresentar sinais de uso indevido.</li>
      </ul>
      <p>A 100 Bytes reserva-se o direito de verificar o estado do produto antes da aprovação.</p>

      <h2>Custos de devolução</h2>
      <ul>
        <li><strong>Por insatisfação:</strong> custos suportados pelo Cliente;</li>
        <li><strong>Por erro, defeito ou dano:</strong> custos suportados pela 100 Bytes.</li>
      </ul>
      <p>O reembolso está sujeito a verificação técnica.</p>

      <h2>Situações em que não é possível devolver</h2>
      <p>Não são aceites devoluções, por exemplo, de:</p>
      <ul>
        <li>Produtos usados ou danificados;</li>
        <li>Produtos sem embalagem original;</li>
        <li>Devoluções fora do prazo;</li>
        <li>Produtos personalizados;</li>
        <li>Produtos abertos que não permitem devolução.</li>
      </ul>

      <h2>Produtos não elegíveis para devolução</h2>
      <p>Por motivos de segurança e natureza do produto:</p>
      <ul>
        <li>Software e licenças digitais ativadas;</li>
        <li>Equipamentos instalados por terceiros não autorizados;</li>
        <li>Computadores alterados ou usados;</li>
        <li>Telemóveis e smartphones (exceto defeito comprovado).</li>
      </ul>

      <h2>Garantia dos produtos</h2>
      <p>Todos os produtos possuem garantia do fabricante.</p>
      <ul>
        <li>O prazo varia conforme o produto e o fabricante;</li>
        <li>A garantia cobre defeitos de fabrico;</li>
        <li>Não cobre mau uso ou danos físicos.</li>
      </ul>
      <p>A 100 Bytes presta todo o apoio necessário no processo de garantia, fazendo a intermediação com o fabricante.</p>

      <h2>Informações legais</h2>
      <ul>
        <li>Todos os produtos devolvidos serão analisados tecnicamente;</li>
        <li>A devolução pode ser recusada se não cumprir as condições;</li>
        <li>Esta política respeita a legislação em vigor na República de Angola.</li>
      </ul>

      <div class="info-note"><p><strong>Precisa de ajuda?</strong> A nossa equipa está disponível para apoiar em todo o processo: <a href="mailto:${EMAIL}">${EMAIL}</a> · <a href="tel:${tel(SEDE_TEL)}">${SEDE_TEL}</a></p></div>
    `,
  },

  // ─────────────────────────────────────── PERGUNTAS FREQUENTES (FAQ) ──
  faq: {
    titulo: "Perguntas Frequentes",
    subtitulo: "Reunimos as respostas às dúvidas mais comuns sobre compras, devoluções, garantias e assistência.",
    metaDescription:
      "Perguntas frequentes (FAQ) da 100 Bytes sobre devoluções, trocas, garantias, reparações, pagamentos e lojas.",
    conteudo: `
      ${faq([
        ["Posso devolver um produto?", "Sim. O Cliente dispõe do direito de livre resolução, podendo devolver o produto no prazo de <strong>7 (sete) dias</strong> a contar da sua receção, sem necessidade de indicação de motivo e sem encargos indemnizatórios. O exercício deste direito deve ser efetuado nos termos da legislação aplicável e das condições estabelecidas pela 100 Bytes."],
        ["Como faço um pedido de devolução?", "Para solicitar a devolução, o Cliente deverá contactar a 100 Bytes através dos canais disponíveis, indicando o número da encomenda ou da fatura. Após validação, serão fornecidas as instruções necessárias para a devolução do produto."],
        ["Em que condições posso devolver um produto?", "A devolução apenas será aceite caso o produto se encontre em perfeito estado de conservação, acompanhado da embalagem original, bem como de todos os acessórios, manuais e componentes incluídos. Não poderão existir sinais de uso indevido, danos ou qualquer alteração que comprometa a sua integridade."],
        ["Quem paga os custos de devolução?", "Os custos de devolução são suportados pelo Cliente nos casos de livre resolução por insatisfação. Contudo, em situações de defeito, erro de envio ou dano no transporte, os mesmos serão assumidos pela 100 Bytes, após validação da ocorrência."],
        ["Posso trocar um produto?", "Sim. A troca de produtos é possível, desde que sejam integralmente cumpridas as condições de devolução estabelecidas. O pedido encontra-se sujeito a verificação técnica prévia, com vista à confirmação do estado e conformidade do produto."],
        ["Existem produtos que não podem ser devolvidos?", "Sim. Determinados produtos não são elegíveis para devolução, designadamente: software ou licenças ativadas; produtos personalizados; equipamentos instalados por entidades não autorizadas; telemóveis ou dispositivos similares, salvo em caso de defeito comprovado."],
        ["O que acontece após a devolução ser aceite?", "Após a aceitação da devolução, a 100 Bytes poderá, conforme aplicável, proceder à substituição do produto, reparação, reembolso do valor pago ou emissão de crédito, de acordo com a situação verificada."],
        ["Os produtos têm garantia?", "Sim. Todos os produtos comercializados beneficiam de garantia, nos termos e condições definidos pelos respetivos fabricantes. A mesma aplica-se a eventuais defeitos de fabrico ou anomalias de funcionamento, em conformidade com a legislação aplicável."],
        ["Qual é o prazo de garantia?", "O prazo de garantia varia em função do fabricante, do tipo de produto e das condições específicas associadas a cada equipamento. Aplicam-se, para o efeito, os termos definidos pelo fabricante, em conformidade com a legislação em vigor."],
        ["O que não está coberto pela garantia?", "A garantia não abrange situações resultantes de utilização indevida, negligente ou em desconformidade com as instruções do fabricante. Estão igualmente excluídos danos físicos, intervenções técnicas não autorizadas e prejuízos decorrentes de fatores externos, como falhas de energia, líquidos, humidade ou condições ambientais inadequadas."],
        ["A 100 Bytes faz reparações?", "Sim. A 100 Bytes disponibiliza serviços técnicos especializados, assegurados por uma equipa qualificada para diagnóstico, manutenção e reparação de diversos equipamentos eletrónicos."],
        ["O que devo fazer antes de enviar um equipamento para reparação?", "Antes de entregar o equipamento para reparação, o Cliente deverá assegurar a realização de cópias de segurança (backup) de todos os dados. A 100 Bytes não se responsabiliza por qualquer perda de informação durante o processo técnico."],
        ["O que fazer se a embalagem chegar danificada?", "Caso a embalagem apresente danos ou sinais de violação, o Cliente deverá abster-se de a abrir, registar evidência fotográfica do estado no momento da receção e contactar de imediato a 100 Bytes para as devidas diligências."],
        ["Quais são os métodos de pagamento disponíveis?", "A 100 Bytes disponibiliza os seguintes métodos de pagamento: Entidade e Referência, Caixa Express e transferência bancária (IBAN), assegurando soluções seguras e eficientes."],
        ["Como posso contactar o suporte?", "Através de email (<a href='mailto:" + EMAIL + "'>" + EMAIL + "</a>), telefone (<a href='tel:" + tel(LOJA1_TEL) + "'>" + LOJA1_TEL + "</a>) ou pelo formulário na página de <a href='/apoio-ao-cliente'>Apoio ao Cliente</a>."],
        ["Onde está localizada a loja?", "Rua da Liga Africana, n.º 81, Luanda."],
        ["Onde está localizado o Centro de Assistência Técnica?", "Na nossa loja — Rua da Liga Africana, n.º 81, Luanda."],
      ])}

      <div class="info-note"><p>Não encontrou a resposta que procurava? Fale connosco através da página de <a href="/apoio-ao-cliente">Apoio ao Cliente</a>.</p></div>
    `,
  },

  // ─────────────────────────────────────── APOIO AO CLIENTE ───────────
  "apoio-ao-cliente": {
    titulo: "Apoio ao Cliente",
    subtitulo: "Estamos comprometidos em prestar um apoio rápido, eficiente e personalizado.",
    metaDescription:
      "Apoio ao Cliente da 100 Bytes: contactos, formulário de suporte e assistência técnica especializada.",
    conteudo: `
      <p>Na 100 Bytes, estamos comprometidos em prestar um apoio rápido, eficiente e personalizado. A nossa equipa encontra-se disponível para esclarecer dúvidas, prestar assistência técnica e acompanhar qualquer questão relacionada com os nossos produtos e serviços.</p>

      <div class="info-card">
        <div class="info-meta" style="margin-top:0;">
          <div><i class="fas fa-envelope"></i><a href="mailto:${EMAIL}">${EMAIL}</a></div>
          <div><i class="fas fa-phone"></i><a href="tel:${tel(LOJA1_TEL)}">${LOJA1_TEL}</a></div>
          <div><i class="fas fa-map-marker-alt"></i><span>Rua da Liga Africana, n.º 81, Luanda</span></div>
        </div>
      </div>

      <div class="info-note"><p>Antes de nos contactar, veja se a sua dúvida já tem resposta nas <a href="/faq">Perguntas Frequentes</a>.</p></div>

      <h2>Formulário de contacto</h2>
      <p>Submeta o seu pedido de forma simples e direta. A nossa equipa analisará a sua solicitação e responderá com a maior brevidade possível.</p>
      <form id="supportForm" class="contact-form">
        <div class="form-row">
          <div class="col-md-6 form-group mb-3">
            <label for="sfNome">Nome</label>
            <input type="text" class="form-control" id="sfNome" placeholder="O seu nome" required>
          </div>
          <div class="col-md-6 form-group mb-3">
            <label for="sfEmail">Email</label>
            <input type="email" class="form-control" id="sfEmail" placeholder="O seu email" required>
          </div>
        </div>
        <div class="form-group mb-3">
          <label for="sfAssunto">Assunto</label>
          <input type="text" class="form-control" id="sfAssunto" placeholder="Assunto do pedido">
        </div>
        <div class="form-group mb-3">
          <label for="sfMensagem">Mensagem</label>
          <textarea class="form-control" id="sfMensagem" placeholder="Como podemos ajudar?" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary px-4">Enviar pedido</button>
      </form>
    `,
  },

  // ─────────────────────────────────────── TERMOS E CONDIÇÕES ─────────
  "termos-e-condicoes": {
    titulo: "Termos e Condições",
    subtitulo: "Termos e Condições de Prestação de Serviços e Venda de Produtos Informáticos.",
    metaDescription:
      "Termos e Condições da 100 Bytes — Soluções Tecnológicas, Lda.: objeto, aceitação, preços, entrega, garantias, trocas, responsabilidade e foro.",
    conteudo: `
      <h2>1. Identificação da Empresa</h2>
      <p>1.1. A presente entidade, <strong>100 BYTES – SOLUÇÕES TECNOLÓGICAS, LDA.</strong>, sociedade comercial constituída ao abrigo da legislação angolana, com o número de matrícula 707-20/200817, com sede na Rua António Américo Lencastre, n.º 11, Luanda, e com o número de identificação fiscal 5000568651, doravante designada por "Empresa", estabelece os presentes Termos e Condições.</p>
      <p>1.2. A Empresa dispõe ainda de estabelecimento comercial localizado na Rua da Liga Africana, n.º 81 – Luanda.</p>

      <h2>2. Objeto</h2>
      <p>2.1. Os presentes Termos e Condições têm por objeto a definição e regulação das relações jurídicas estabelecidas entre a Empresa e os seus Clientes, no âmbito da disponibilização, comercialização e prestação de bens e serviços na área das tecnologias de informação.</p>
      <p>2.2. Incluem-se, nomeadamente, as seguintes atividades:</p>
      <ul>
        <li>Comercialização de equipamentos informáticos, componentes, periféricos e demais dispositivos tecnológicos (hardware);</li>
        <li>Licenciamento, fornecimento e comercialização de programas informáticos (software), próprios ou de terceiros;</li>
        <li>Prestação de serviços especializados em tecnologias de informação, incluindo consultoria técnica e tecnológica;</li>
        <li>Serviços de assistência técnica, suporte técnico e manutenção, de carácter preventivo e corretivo;</li>
        <li>Instalação, configuração, implementação e otimização de sistemas informáticos, redes e infraestruturas tecnológicas.</li>
      </ul>
      <p>2.3. A Empresa reserva-se o direito de ampliar, restringir ou modificar o âmbito das atividades acima descritas, em função da evolução tecnológica, das necessidades do mercado ou de decisões estratégicas internas, sem prejuízo das obrigações previamente assumidas.</p>

      <h2>3. Âmbito de Aplicação</h2>
      <p>3.1. Os presentes Termos aplicam-se a todas as relações comerciais, contratuais e pré-contratuais estabelecidas entre a Empresa e os seus Clientes, independentemente do meio ou canal utilizado para a sua formalização.</p>
      <p>3.2. Abrangem, designadamente: (a) todas as transações realizadas nos estabelecimentos comerciais físicos da Empresa; (b) as operações, encomendas e demais interações efetuadas através do website oficial ou quaisquer plataformas digitais sob gestão da Empresa; (c) a prestação de quaisquer serviços informáticos solicitados pelo Cliente.</p>
      <p>3.3. São aplicáveis a todos os Clientes, sejam pessoas singulares ou coletivas, presumindo-se o seu conhecimento e aceitação no momento da aquisição de produtos, contratação de serviços ou utilização de qualquer canal disponibilizado pela Empresa.</p>

      <h2>4. Aceitação</h2>
      <p>4.1. A aquisição de quaisquer produtos, bem como a contratação de serviços, por qualquer meio ou canal, implica a aceitação plena, expressa e sem reservas dos presentes Termos e Condições.</p>
      <p>4.2. A aceitação produz todos os efeitos legais, sendo equiparada à celebração de um acordo escrito, não sendo necessária qualquer assinatura adicional.</p>
      <p>4.3. Presume-se que o Cliente leu, compreendeu e concordou com o conteúdo dos presentes Termos previamente à realização de qualquer transação.</p>
      <p>4.4. A Empresa reserva-se o direito de exigir a aceitação expressa e formal dos presentes Termos, nomeadamente através de meios eletrónicos ou assinatura física.</p>

      <h2>5. Disponibilidade de Produtos e Serviços</h2>
      <p>5.1. Todos os produtos e serviços encontram-se sujeitos à respetiva disponibilidade em stock ou capacidade operacional, no momento da encomenda ou contratação.</p>
      <p>5.2. A Empresa reserva-se o direito de, a todo o tempo e sem aviso prévio, alterar, suspender, limitar ou descontinuar a disponibilização de quaisquer produtos ou serviços.</p>
      <p>5.3. As características técnicas, especificações e funcionalidades podem ser alteradas pelos respetivos fabricantes, fornecedores ou pela própria Empresa, sem aviso prévio.</p>
      <p>5.4. As imagens, descrições e demais informações têm carácter meramente indicativo e informativo, podendo não corresponder integralmente ao produto final.</p>
      <p>5.5. Em caso de indisponibilidade após a encomenda, a Empresa informará o Cliente com a maior brevidade, podendo propor solução alternativa, reembolso ou substituição equivalente.</p>

      <h2>6. Preços e Pagamentos</h2>
      <p>6.1. Todos os preços encontram-se expressos em Kwanzas (AOA), podendo ou não incluir impostos, taxas ou encargos adicionais legalmente aplicáveis.</p>
      <p>6.2. A Empresa reserva-se o direito de atualizar, rever ou alterar os preços a qualquer momento e sem aviso prévio, não afetando as transações já concluídas.</p>
      <p>6.3. Salvo estipulação em contrário, o pagamento deverá ser efetuado no momento da aquisição do produto ou da contratação do serviço.</p>
      <p>6.4. Nos casos de pagamento diferido, o Cliente obriga-se a cumprir integralmente os prazos estabelecidos.</p>
      <p>6.5. O incumprimento das obrigações de pagamento confere à Empresa o direito de suspender, limitar ou cessar o fornecimento, sem prejuízo da cobrança dos valores em dívida.</p>
      <p>6.6. A Empresa reserva-se o direito de aplicar juros de mora, encargos administrativos ou outras penalizações legalmente admissíveis.</p>
      <p>6.7. Quaisquer custos adicionais decorrentes de métodos de pagamento específicos, comissões bancárias ou encargos de terceiros são da responsabilidade do Cliente.</p>

      <h2>7. Entrega e Levantamento</h2>
      <p>7.1. Os produtos poderão ser levantados nos estabelecimentos da Empresa ou entregues em local a indicar pelo Cliente, mediante acordo prévio quanto a condições, custos e prazos.</p>
      <p>7.2. Os prazos de entrega têm carácter meramente estimativo, salvo estipulação expressa por escrito.</p>
      <p>7.3. A Empresa não é responsável por atrasos resultantes de factos não imputáveis, nomeadamente de terceiros, operadores logísticos, fornecedores ou força maior.</p>
      <p>7.4. Considera-se a entrega efetuada quando o produto é disponibilizado ao Cliente ou a pessoa por este indicada, transferindo-se a partir desse momento os riscos para o Cliente.</p>
      <p>7.5. Compete ao Cliente verificar, no ato de receção, o estado da embalagem e dos produtos, comunicando de imediato qualquer anomalia visível.</p>
      <p>7.6. Caso a embalagem apresente sinais de violação, o Cliente deverá: (a) abster-se de abrir a encomenda; (b) registar evidência fotográfica; (c) comunicar imediatamente a ocorrência à Empresa.</p>
      <p>7.7. O incumprimento poderá comprometer a aceitação de reclamações relacionadas com danos ou extravio.</p>
      <p>7.8. Em caso de impossibilidade de entrega por facto imputável ao Cliente, a Empresa poderá cobrar custos de nova tentativa de entrega ou armazenagem.</p>

      <h2>8. Garantias</h2>
      <p>8.1. Os produtos beneficiam de garantia nos termos definidos pelos respetivos fabricantes.</p>
      <p>8.2. O prazo de garantia varia em função do fabricante, do tipo de produto e das condições específicas, sendo aplicável a legislação em vigor na República de Angola.</p>
      <p>8.3. A garantia é válida exclusivamente com o correto manuseamento, utilização e conservação, ficando excluídas situações de uso indevido, negligência, intervenção não autorizada ou danos externos.</p>
      <p>8.4. Em caso de defeito de fabrico, o fabricante é o responsável direto pela garantia, sem prejuízo dos direitos legalmente conferidos ao consumidor.</p>
      <p>8.5. A Empresa atua como intermediária no processo de garantia, junto do fabricante ou distribuidor.</p>
      <p>8.6. Caso, após análise técnica, se verifique que o produto não apresenta defeito coberto pela garantia, a Empresa poderá cobrar custos de diagnóstico, transporte ou intervenção técnica.</p>

      <h2>9. Trocas e Devoluções</h2>
      <p>9.1. O Cliente dispõe do direito de resolver o contrato, sem indicação de motivo e sem encargo indemnizatório, no prazo de <strong>7 (sete) dias</strong> a partir da receção, nos termos da legislação aplicável.</p>
      <p>9.2. O Cliente deverá comunicar a intenção através de: (a) email ${EMAIL}; (b) telefone ${SEDE_TEL}; (c) outros meios disponibilizados no website.</p>
      <p>9.3. A comunicação deverá conter a identificação da operação (número da encomenda ou fatura).</p>
      <p>9.4. Após receção do pedido, a Empresa fornecerá as instruções para a devolução.</p>
      <p>9.5. A aceitação de devoluções está condicionada à restituição dos produtos em perfeito estado, com embalagem original, acessórios, componentes e manuais, sem sinais de utilização indevida.</p>
      <p>9.6. A Empresa poderá verificar tecnicamente os produtos devolvidos, podendo recusar a devolução, troca ou reembolso, ou reduzir proporcionalmente o valor a restituir.</p>
      <p>9.7. Na livre resolução por iniciativa do Cliente, os custos de transporte da devolução são suportados pelo Cliente.</p>
      <p>9.8. Em caso de produto com defeito, envio incorreto ou dano no transporte, os custos de devolução são suportados pela Empresa, após validação.</p>
      <p>9.9. O direito de devolução poderá não ser aplicável, designadamente: produtos com sinais de utilização indevida; incompletos ou sem embalagem; fora do prazo; personalizados; que pela natureza não possam ser devolvidos após abertura; software/licenças/conteúdos ativados; equipamentos instalados por entidades não autorizadas; telemóveis/smartphones, salvo defeito comprovado.</p>
      <p>9.10. Em caso de aceitação, a Empresa poderá optar por substituição, reparação, crédito ou reembolso.</p>
      <p>9.11. O disposto não prejudica os direitos legalmente conferidos ao consumidor na República de Angola.</p>

      <h2>10. Responsabilidade</h2>
      <p>10.1. A Empresa atua com diligência e melhores práticas, não podendo garantir a ausência de erros, falhas técnicas, interrupções ou resultados específicos.</p>
      <p>10.2. A responsabilidade limita-se aos danos diretos comprovadamente resultantes de dolo ou negligência grave, excluindo-se danos indiretos, lucros cessantes ou prejuízos consequenciais.</p>
      <p>10.3. A Empresa não será responsável por: perda de dados em equipamentos objeto de intervenção; incompatibilidades hardware/software; utilização indevida; falhas de energia, redes, vírus ou ataques; intervenções de terceiros não autorizados; prejuízos comerciais.</p>
      <p>10.4. Compete ao Cliente assegurar cópias de segurança (backups) antes da entrega dos equipamentos.</p>
      <p>10.5. A responsabilidade total da Empresa não excederá o valor efetivamente pago pelo Cliente pelo produto ou serviço em causa.</p>
      <p>10.6. O Cliente reconhece que os serviços informáticos estão sujeitos a limitações inerentes, não podendo a Empresa garantir resultados específicos salvo acordo escrito.</p>

      <h2>11. Serviços Técnicos</h2>
      <p>11.1. A Empresa executa os serviços técnicos com diligência e competência, não podendo garantir a resolução integral de todas as avarias.</p>
      <p>11.2. Salvo acordo em contrário, não é garantida a recuperação de dados existentes nos equipamentos.</p>
      <p>11.3. Compete ao Cliente assegurar cópias de segurança prévias de todos os dados.</p>
      <p>11.4. A Empresa poderá efetuar diagnósticos prévios e apresentar orçamento, condicionando a execução à sua aceitação.</p>
      <p>11.5. Caso se verifique inexistência de avaria, impossibilidade de reparação ou não aceitação do orçamento, poderão ser cobrados custos de diagnóstico ou manuseamento.</p>
      <p>11.6. Os equipamentos deverão ser levantados no prazo máximo de 60 (sessenta) dias após a notificação de conclusão.</p>
      <p>11.7. Findo esse prazo, o equipamento poderá ser considerado abandonado, podendo a Empresa dar-lhe o destino que entender, sem direito a indemnização.</p>
      <p>11.8. A Empresa não se responsabiliza por acessórios ou componentes não identificados no momento da receção.</p>

      <h2>12. Propriedade Intelectual</h2>
      <p>12.1. Todos os direitos de propriedade intelectual relativos a software, sistemas, plataformas, designs e demais soluções permanecem propriedade da Empresa ou dos respetivos licenciantes.</p>
      <p>12.2. A prestação de serviços não implica a cessão de direitos de propriedade intelectual ao Cliente, sendo concedido apenas um direito de utilização limitado.</p>
      <p>12.3. O Cliente obriga-se a não copiar, reproduzir, modificar, distribuir ou efetuar engenharia inversa dos elementos protegidos.</p>
      <p>12.4. Todos os conteúdos (textos, imagens, logótipos, marcas, layouts) estão protegidos, sendo proibida a sua utilização sem autorização prévia por escrito.</p>
      <p>12.5. Qualquer utilização indevida confere à Empresa o direito de recorrer aos meios legais disponíveis.</p>

      <h2>13. Confidencialidade</h2>
      <p>13.1. A Empresa trata como confidenciais todas as informações a que tenha acesso no âmbito da relação com o Cliente.</p>
      <p>13.2. As informações confidenciais serão utilizadas exclusivamente para a execução dos serviços, com exceções legais (informação pública, exigência legal ou necessidade de execução), mantendo-se o dever de confidencialidade após a cessação da relação.</p>

      <h2>14. Proteção de Dados</h2>
      <p>14.1. A Empresa trata os dados pessoais em conformidade com a legislação aplicável na República de Angola. Consulte a nossa <a href="/politica-de-privacidade">Política de Privacidade</a> para mais detalhes.</p>
      <p>14.2. Os dados são utilizados para finalidades legítimas (processamento de encomendas, gestão da relação, obrigações legais, comunicação), com medidas de segurança adequadas, podendo o titular exercer os seus direitos de acesso, retificação e eliminação.</p>

      <h2>15. Força Maior</h2>
      <p>15.1. A Empresa não é responsável pelo incumprimento resultante de eventos de força maior (imprevisíveis, inevitáveis e alheios à sua vontade).</p>
      <p>15.2. Incluem-se: falhas de energia ou telecomunicações; catástrofes naturais; incêndios ou acidentes; conflitos sociais, greves ou motins; atos governamentais; falhas de terceiros indispensáveis.</p>
      <p>15.3. A força maior suspende as obrigações afetadas; a Empresa envidará esforços para minimizar efeitos; se se prolongar por mais de 30 dias, qualquer das partes poderá resolver a relação sem indemnização.</p>

      <h2>16. Rescisão</h2>
      <p>16.1. A Empresa reserva-se o direito de recusar, suspender ou cessar a prestação de serviços sempre que se verifique justa causa.</p>
      <p>16.2. Constituem fundamentos: utilização indevida; tentativa de fraude; comportamento abusivo para com colaboradores; incumprimento de pagamento; violação dos presentes Termos.</p>
      <p>16.3. A rescisão pode produzir efeitos imediatos, não conferindo direito a indemnização, sem prejuízo da cobrança de valores em dívida.</p>

      <h2>17. Legislação e Foro</h2>
      <p>17.1. Os presentes Termos regem-se pela legislação em vigor na República de Angola.</p>
      <p>17.2. Para a resolução de litígios, as partes submetem-se à jurisdição exclusiva dos tribunais da comarca de Luanda.</p>
      <p>17.3. As partes comprometem-se a procurar resolver amigavelmente quaisquer divergências.</p>

      <h2>18. Disposições Finais</h2>
      <p>18.1. A Empresa reserva-se o direito de alterar os presentes Termos a qualquer momento.</p>
      <p>18.2. As alterações entram em vigor a partir da publicação nos canais oficiais, considerando-se aceites com a continuidade da utilização dos serviços.</p>
      <p>18.3. A eventual invalidade de uma disposição não afeta as restantes.</p>
      <p>18.4. A tolerância da Empresa não constitui renúncia a direitos.</p>
      <p>18.5. Os presentes Termos constituem o acordo integral entre a Empresa e o Cliente.</p>
    `,
  },

  // ─────────────────────────────────────── POLÍTICA DE PRIVACIDADE ────
  "politica-de-privacidade": {
    titulo: "Política de Privacidade",
    subtitulo: "Política de Privacidade e Proteção de Dados Pessoais (Lei n.º 22/11, de 17 de junho).",
    metaDescription:
      "Política de Privacidade e Proteção de Dados Pessoais da 100 Bytes, em conformidade com a Lei n.º 22/11 da República de Angola.",
    conteudo: `
      <h2>1. Enquadramento</h2>
      <p>1.1. A presente Política de Privacidade e Proteção de Dados Pessoais foi elaborada em conformidade com a legislação aplicável, nomeadamente a <strong>Lei n.º 22/11, de 17 de junho</strong> (Lei da Proteção de Dados Pessoais).</p>
      <p>1.2. Aplica-se à recolha e ao tratamento de dados pessoais fornecidos por clientes, fornecedores, utilizadores de redes sociais e quaisquer outros titulares de dados, pela <strong>100 BYTES – SOLUÇÕES TECNOLÓGICAS, LDA.</strong> (matrícula 707-20/200817, NIF 5000568651, sede na Rua António Américo Lencastre, n.º 11, Luanda).</p>
      <p>1.3. A Empresa assume o compromisso de proteger os dados pessoais de todas as pessoas com quem se relaciona, refletindo o cumprimento das normas legais e a adoção das melhores práticas.</p>
      <p>1.4. As definições utilizadas correspondem às constantes da Lei n.º 22/11, de 17 de junho.</p>

      <h2>2. Responsável pelo Tratamento</h2>
      <p>2.1. A entidade responsável pelo tratamento dos dados pessoais é a 100 BYTES – SOLUÇÕES TECNOLÓGICAS, LDA.</p>
      <p>2.2. A Empresa atua na qualidade de responsável pelo tratamento, determinando as finalidades e os meios de tratamento e assegurando o cumprimento das obrigações legais.</p>

      <h2>3. Tratamento de Dados Pessoais</h2>
      <p>3.1. A Empresa procede à recolha e tratamento das categorias de dados estritamente necessárias, adequadas e proporcionais às finalidades prosseguidas.</p>
      <p>3.2. Poderão ser recolhidos, designadamente:</p>
      <ul>
        <li>Dados de identificação (nome completo, número de identificação civil ou fiscal);</li>
        <li>Dados de contacto (telefone, email, morada);</li>
        <li>Dados fiscais, financeiros e de faturação;</li>
        <li>Dados relativos à relação contratual e comercial (histórico de aquisições, serviços contratados);</li>
        <li>Dados técnicos (endereço IP, registos de acesso, identificadores eletrónicos);</li>
        <li>Dados contidos em equipamentos entregues para diagnóstico, reparação ou assistência técnica.</li>
      </ul>
      <p>3.3. A recolha é limitada ao mínimo indispensável, em conformidade com os princípios da licitude, necessidade e proporcionalidade.</p>

      <h2>4. Finalidades do Tratamento</h2>
      <p>4.1. Os dados são tratados para finalidades específicas e legítimas, de acordo com o artigo 6.º e seguintes da Lei n.º 22/11.</p>
      <p>4.2. Designadamente para: gestão da relação com clientes e fornecedores; processamento de encomendas e prestação de serviços; cumprimento de obrigações legais e fiscais; suporte técnico e assistência; comunicação com os titulares; gestão de reclamações; segurança dos sistemas e prevenção de fraude; envio de comunicações comerciais quando exista fundamento legal.</p>
      <p>4.3. Os dados não serão tratados para finalidades incompatíveis com aquelas que determinaram a sua recolha.</p>

      <h2>5. Fundamento do Tratamento</h2>
      <p>5.1. O tratamento assenta nos seguintes fundamentos: (a) execução de contrato; (b) cumprimento de obrigações legais e regulamentares; (c) prossecução de interesses legítimos da Empresa; (d) consentimento do titular, sempre que exigido por lei.</p>
      <p>5.2. O fundamento jurídico aplicável é determinado em função da finalidade concreta e da natureza da relação.</p>

      <h2>6. Partilha de Dados</h2>
      <p>6.1. Os dados poderão ser partilhados, quando necessário, com prestadores de serviços (tecnológicos, alojamento, pagamentos, suporte), operadores logísticos e entidades públicas ou judiciais.</p>
      <p>6.2. Qualquer entidade terceira com acesso a dados atua ao abrigo de obrigações contratuais adequadas e deveres de confidencialidade e segurança.</p>

      <h2>7. Transferência de Dados</h2>
      <p>7.1. A Empresa poderá transferir dados para entidades fora da República de Angola (serviços tecnológicos, alojamento), assegurando um nível de proteção equivalente ao exigido no ordenamento jurídico angolano e obrigações de confidencialidade.</p>

      <h2>8. Conservação de Dados</h2>
      <p>8.1. Os dados são conservados apenas pelo período necessário às finalidades ou conforme exigido por lei. Findo esse período, serão objeto de eliminação segura ou anonimização irreversível. Determinados dados poderão ser conservados para exercício ou defesa de direitos em procedimentos legais.</p>

      <h2>9. Direitos dos Titulares</h2>
      <p>9.1. O titular goza dos direitos de: (a) acesso; (b) retificação; (c) oposição ao tratamento; (d) retirada do consentimento.</p>
      <p>9.2. O exercício dos direitos é efetuado mediante pedido dirigido à Empresa através dos canais de contacto disponibilizados, comprometendo-se a Empresa a responder com a maior brevidade possível.</p>

      <h2>10. Segurança dos Dados</h2>
      <p>10.1. A Empresa adota medidas técnicas e organizativas adequadas (controlo de acessos, proteção informática, confidencialidade). Atendendo à natureza das redes abertas, não pode garantir segurança absoluta das transmissões, não sendo responsável por acessos não autorizados alheios ao seu controlo.</p>

      <h2>11. Decisões Automatizadas</h2>
      <p>11.1. A Empresa poderá recorrer a tratamento automatizado de suporte à gestão. Regra geral, tais tratamentos não implicam decisões exclusivamente automatizadas com efeitos jurídicos. Quando aplicável, serão assegurados mecanismos de informação, intervenção humana e contestação da decisão.</p>

      <h2>12. Dados em Serviços Técnicos</h2>
      <p>12.1. No âmbito de diagnóstico, reparação ou assistência, a Empresa poderá, de forma incidental, aceder a dados nos equipamentos. O Cliente é responsável por realizar backups prévios; a Empresa trata tais dados com estrito dever de confidencialidade e não garante a sua integridade ou recuperação.</p>

      <h2>13. Cookies e Tecnologias Semelhantes</h2>
      <p>13.1. O website utiliza cookies e tecnologias semelhantes. Para informação detalhada, consulte a <a href="/politica-de-cookies">Política de Cookies</a>.</p>

      <h2>14. Confidencialidade</h2>
      <p>14.1. A Empresa assegura a confidencialidade dos dados, adotando medidas para prevenir o acesso não autorizado. O dever de confidencialidade subsiste após a cessação da relação, na medida do legalmente aplicável.</p>

      <h2>15. Alterações à Política de Privacidade</h2>
      <p>15.1. A Empresa poderá rever ou atualizar a presente Política a qualquer momento, publicando as alterações no website. A continuidade da utilização constitui aceitação das mesmas, sem prejuízo dos direitos dos titulares.</p>

      <h2>16. Contactos</h2>
      <p>16.1. Para questões, esclarecimentos ou exercício de direitos, contacte-nos através de: email <a href="mailto:${EMAIL}">${EMAIL}</a>; telefone <a href="tel:${tel(SEDE_TEL)}">${SEDE_TEL}</a>.</p>
      <p>16.2. A Empresa assegura o tratamento diligente das comunicações, podendo solicitar informações adicionais para verificação de identidade. O titular poderá recorrer aos meios administrativos ou judiciais legalmente previstos.</p>

      <h2>17. Legislação Aplicável</h2>
      <p>17.1. A presente Política rege-se pela legislação em vigor na República de Angola, designadamente a Lei n.º 22/11, de 17 de junho.</p>
    `,
  },

  // ─────────────────────────────────────── POLÍTICA DE COOKIES ────────
  "politica-de-cookies": {
    titulo: "Política de Cookies",
    subtitulo: "Como e por que utilizamos cookies e tecnologias semelhantes no nosso website.",
    metaDescription:
      "Política de Cookies da 100 Bytes: o que são cookies, tipos utilizados, finalidades, consentimento e gestão de preferências.",
    conteudo: `
      <h2>1. Enquadramento</h2>
      <p>1.1. A presente Política de Cookies estabelece os termos e condições que regulam a utilização de cookies e tecnologias semelhantes no website da <strong>100 Bytes – Soluções Tecnológicas, LDA.</strong> (matrícula 707-20/200817, NIF 5000568651, sede na Rua António Américo Lencastre, n.º 11, Luanda).</p>
      <p>1.2. A utilização destas tecnologias é efetuada em conformidade com a Lei n.º 22/11, de 17 de junho, e com os princípios da licitude, lealdade, transparência, necessidade e proporcionalidade.</p>
      <p>1.3. Os cookies têm como finalidade assegurar o funcionamento, a segurança e a integridade do website, otimizar a navegação e permitir a recolha de informação estatística.</p>
      <p>1.4. A utilização de cookies não estritamente necessários depende do consentimento prévio, livre, específico, informado e inequívoco do utilizador.</p>

      <h2>2. O que são Cookies?</h2>
      <p>2.1. Cookies são pequenos ficheiros de texto armazenados no dispositivo do utilizador (computador, smartphone ou tablet) aquando do acesso a um website.</p>
      <p>2.2. Contêm informações limitadas que permitem identificar o dispositivo e, em certos casos, reconhecê-lo em visitas subsequentes.</p>
      <p>2.3. Desempenham funções essenciais (gestão de sessões, memorização de preferências, desempenho) e permitem a recolha de informação estatística e analítica.</p>

      <h2>3. Tipos de Cookies Utilizados</h2>
      <h3>Cookies estritamente necessários</h3>
      <p>Indispensáveis ao funcionamento técnico do website e às suas funcionalidades essenciais (acesso a áreas seguras, gestão de sessões). Não dependem de consentimento.</p>
      <h3>Cookies de desempenho e análise</h3>
      <p>Recolhem informação estatística sobre a utilização do website (páginas visitadas, tempo de permanência, erros), permitindo monitorizar o desempenho e otimizar a experiência.</p>
      <h3>Cookies de funcionalidade</h3>
      <p>Memorizam escolhas e preferências (idioma, localização, configurações). A sua desativação poderá afetar determinadas funcionalidades.</p>
      <h3>Cookies de marketing e publicidade</h3>
      <p>Apresentam conteúdos e comunicações comerciais relevantes com base nos interesses do utilizador. Dependem do consentimento prévio, expresso e informado.</p>

      <h2>4. Finalidades da Utilização de Cookies</h2>
      <p>4.1. Os cookies destinam-se a: garantir o funcionamento técnico; assegurar a segurança dos sistemas; melhorar a experiência de navegação; analisar o desempenho; apoiar a gestão operacional; e, mediante consentimento, o envio de comunicações comerciais.</p>
      <p>4.2. O tratamento assenta em fundamentos legítimos (execução de contrato, interesses legítimos e, quando exigido, consentimento), sendo os dados adequados, pertinentes e limitados ao necessário.</p>

      <h2>5. Consentimento</h2>
      <p>5.1. A utilização de cookies não estritamente necessários depende do consentimento prévio, solicitado na primeira visita, com possibilidade de aceitar, recusar ou configurar de forma granular. O utilizador poderá retirar ou alterar o consentimento a qualquer momento, sem prejuízo da licitude do tratamento anterior.</p>

      <h2>6. Gestão de Cookies</h2>
      <p>6.1. O utilizador pode configurar o navegador para permitir, recusar ou eliminar cookies. A desativação de cookies estritamente necessários poderá comprometer o funcionamento do website. A Empresa não é responsável por limitações decorrentes de configurações efetuadas pelo utilizador.</p>

      <h2>7. Cookies de Terceiros</h2>
      <p>7.1. O website poderá recorrer a cookies de entidades terceiras (análise, suporte, funcionalidades). Sempre que legalmente exigido, dependerão de consentimento prévio. Recomenda-se a consulta das políticas de privacidade e de cookies dessas entidades.</p>

      <h2>8. Conservação dos Dados</h2>
      <p>8.1. Os dados recolhidos através de cookies são conservados apenas pelo período necessário, distinguindo-se cookies de sessão (eliminados após a navegação) e persistentes. Findo o prazo, os dados são eliminados de forma segura ou anonimizados.</p>

      <h2>9. Alterações à Política de Cookies</h2>
      <p>9.1. A Empresa poderá rever a presente Política a qualquer momento, publicando as alterações no website. Recomenda-se a consulta periódica desta Política.</p>

      <h2>10. Contactos</h2>
      <p>10.1. Para questões relacionadas com cookies ou tratamento de dados, contacte-nos: email <a href="mailto:${EMAIL}">${EMAIL}</a>; telefone <a href="tel:${tel(SEDE_TEL)}">${SEDE_TEL}</a>.</p>

      <h2>11. Legislação Aplicável</h2>
      <p>11.1. A presente Política rege-se pela legislação vigente na República de Angola, designadamente a Lei n.º 22/11, de 17 de junho, competindo aos tribunais competentes de Angola dirimir quaisquer litígios.</p>
    `,
  },
};

/** Acordeão de FAQ a partir de uma lista [pergunta, resposta]. */
function faq(items) {
  return items
    .map(function (it) {
      return (
        '<div class="faq-item">' +
        '<button type="button" class="faq-q">' + it[0] +
        ' <i class="fas fa-chevron-down"></i></button>' +
        '<div class="faq-a"><div class="faq-a__in">' + it[1] + "</div></div></div>"
      );
    })
    .join("");
}

module.exports = { paginas };
