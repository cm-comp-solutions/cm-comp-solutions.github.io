(() => {
  const root = document.querySelector('#finance-demo');
  if (!root) return;

  // Cenário didático fictício, com saldos integrados entre os demonstrativos.
  const data = {
    capital: 100000,
    purchases: [{ quantity: 100, price: 100 }, { quantity: 100, price: 120 }],
    sales: [{ month: 'Jan', quantity: 30 }, { month: 'Fev', quantity: 40 }, { month: 'Mar', quantity: 50 }],
    salePrice: 200,
    sellingExpenses: 1500,
    adminExpenses: 2500,
    depreciation: 600,
    salesTaxRate: 0.10,
    collectedSales: 22000,
    paidPurchases: 16000,
    equipment: 12000
  };
  const pages = ['Visão geral', 'DRE', 'Balanço', 'Vendas', 'Estoque', 'Caixa realizado', 'Caixa previsto'];
  let page = 0;
  let method = 'PEPS';
  const movements = [
    { date: '02 jan', label: 'Compra · lote 1', quantity: 100, unitCost: 100 },
    { date: '25 jan', label: 'Venda', quantity: -30 },
    { date: '03 fev', label: 'Compra · lote 2', quantity: 100, unitCost: 120 },
    { date: '24 fev', label: 'Venda', quantity: -40 },
    { date: '25 mar', label: 'Venda', quantity: -50 }
  ];
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  const cashHelp = {
    'ATIVIDADES OPERACIONAIS': 'Entradas e saídas ligadas às operações da empresa.',
    'Recebimentos de clientes': 'Valores recebidos de clientes durante o período.',
    '(-) Pagamentos a fornecedores': 'Valores pagos aos fornecedores pelas mercadorias.',
    '(-) Pagamentos de despesas comerciais': 'Desembolsos relacionados às vendas.',
    '(-) Pagamentos de despesas administrativas': 'Desembolsos para manter a administração.',
    'Caixa líquido operacional': 'Diferença entre recebimentos e pagamentos operacionais.',
    'ATIVIDADES DE INVESTIMENTO': 'Movimentações pela compra ou venda de ativos de longo prazo.',
    '(-) Aquisição de equipamentos': 'Pagamento pela compra de equipamentos para uso da empresa.',
    'Caixa líquido de investimento': 'Total líquido das entradas e saídas de investimento.',
    'ATIVIDADES DE FINANCIAMENTO': 'Recursos recebidos de sócios ou financiadores e suas devoluções.',
    'Integralização de capital': 'Dinheiro aportado pelos sócios na empresa.',
    'Caixa líquido de financiamento': 'Total líquido das movimentações de financiamento.',
    'Variação líquida do caixa': 'Soma dos fluxos operacional, de investimento e de financiamento.',
    'Caixa inicial': 'Disponibilidades existentes no início do período.',
    'Caixa final': 'Saldo inicial mais a variação líquida do período.',
    'Lucro líquido do período': 'Resultado apurado na DRE pelo regime de competência.',
    '(+) Depreciação': 'Despesa sem pagamento no período, somada na conciliação.',
    '(-) Aumento de clientes a receber': 'Vendas reconhecidas que ainda não foram recebidas.',
    '(-) Aumento dos estoques': 'Recursos aplicados em mercadorias ainda não vendidas.',
    '(+) Aumento de fornecedores': 'Compras reconhecidas que ainda não foram pagas.',
    '(+) Aumento de tributos a recolher': 'Tributos reconhecidos que ainda não foram pagos.',
    'Caixa inicial previsto': 'Saldo de caixa realizado que inicia a projeção.',
    'Recebimento de clientes em aberto': 'Entrada prevista para saldar valores já registrados a receber.',
    'Recebimento de novas vendas previsto': 'Entrada estimada de vendas futuras.',
    '(-) Fornecedores em aberto': 'Pagamento previsto de dívidas já registradas com fornecedores.',
    '(-) Tributos em aberto': 'Pagamento previsto dos tributos já reconhecidos.',
    '(-) Novas compras previstas': 'Desembolso estimado para compras futuras.',
    '(-) Despesas previstas': 'Desembolso estimado para despesas futuras.',
    'Caixa líquido operacional previsto': 'Entradas previstas menos saídas previstas das operações.',
    'Investimentos previstos': 'Fluxo estimado de compra ou venda de ativos de longo prazo.',
    'Financiamentos previstos': 'Fluxo estimado de recursos de sócios ou financiadores.',
    'Variação líquida prevista': 'Mudança estimada do caixa ao longo do período projetado.',
    'Caixa final previsto': 'Saldo inicial acrescido da variação líquida prevista.'
  };
  const row = (label, value, total = false) => {
    const help = page >= 5 ? cashHelp[label] : '';
    return `<div class="fd-row${total ? ' total' : ''}${help ? ' fd-has-help' : ''}"${help ? ` tabindex="0" aria-label="${label}. ${value}. ${help}"` : ''}><span>${label}${help ? `<span class="fd-help" role="tooltip">${help}</span>` : ''}</span><strong>${value}</strong></div>`;
  };
  const card = (label, value) => `<div class="fd-card"><span>${label}</span><strong>${value}</strong></div>`;

  function calculate() {
    const quantitySold = data.sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const revenue = quantitySold * data.salePrice;
    const purchases = data.purchases.reduce((sum, lot) => sum + lot.quantity * lot.price, 0);
    const ledger = inventoryLedger();
    const cost = ledger.cost;
    const inventory = ledger.value;
    const salesTax = revenue * data.salesTaxRate;
    const netRevenue = revenue - salesTax;
    const grossProfit = netRevenue - cost;
    const operatingExpenses = data.sellingExpenses + data.adminExpenses + data.depreciation;
    const profit = grossProfit - operatingExpenses;
    const receivables = revenue - data.collectedSales;
    const suppliers = purchases - data.paidPurchases;
    const cash = data.capital - data.paidPurchases + data.collectedSales - data.sellingExpenses - data.adminExpenses - data.equipment;
    const fixedAssets = data.equipment - data.depreciation;
    const currentAssets = cash + receivables + inventory;
    const totalAssets = currentAssets + fixedAssets;
    const liabilities = suppliers + salesTax;
    const equity = data.capital + profit;
    return { quantitySold, revenue, purchases, cost, inventory, salesTax, netRevenue, grossProfit, operatingExpenses, profit, receivables, suppliers, cash, fixedAssets, currentAssets, totalAssets, liabilities, equity };

  }

  function chart(values, labels) {
    const max = Math.max(...values);
    return `<div class="fd-chart"><div class="fd-bars" role="img" aria-label="${labels.map((label, i) => `${label}: ${money(values[i])}`).join(', ')}">${values.map((value, i) => `<div class="fd-bar" style="height:${value / max * 100}%" title="${labels[i]}: ${money(value)}"><span>${labels[i]}</span></div>`).join('')}</div></div>`;
  }

  function inventoryLedger() {
    let quantity = 0;
    let value = 0;
    let cost = 0;
    const lots = [];
    const lines = movements.map(movement => {
      let movementCost = 0;
      if (movement.quantity > 0) {
        movementCost = movement.quantity * movement.unitCost;
        lots.push({ quantity: movement.quantity, unitCost: movement.unitCost });
        value += movementCost;
        quantity += movement.quantity;
      } else {
        let remaining = -movement.quantity;
        if (method === 'Médio') {
          movementCost = remaining * value / quantity;
        } else {
          while (remaining > 0) {
            const index = method === 'PEPS' ? 0 : lots.length - 1;
            const lot = lots[index];
            const used = Math.min(remaining, lot.quantity);
            movementCost += used * lot.unitCost;
            lot.quantity -= used;
            remaining -= used;
            if (!lot.quantity) lots.splice(index, 1);
          }
        }
        cost += movementCost;
        quantity += movement.quantity;
        value -= movementCost;
      }
      return { ...movement, movementCost, unitCost: movementCost / Math.abs(movement.quantity), balanceQuantity: quantity, balanceValue: value };
    });
    return { lines, cost, value };
  }

  function stockLedger() {
    const precise = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    const lines = inventoryLedger().lines.map(movement => `<tr><td>${movement.date}<br><span>${movement.label}</span></td><td>${movement.quantity > 0 ? '+' : ''}${movement.quantity}</td><td>${precise(movement.unitCost)}</td><td>${movement.quantity < 0 ? precise(movement.movementCost) : '—'}</td><td>${movement.balanceQuantity}</td><td>${precise(movement.balanceValue)}</td></tr>`).join('');
    return `<div class="fd-ledger"><h4>Ficha de estoque · ${method}</h4><div class="fd-table-scroll"><table><thead><tr><th>Movimento</th><th>Qtd.</th><th>Custo unit.</th><th>Custo da venda</th><th>Saldo un.</th><th>Saldo R$</th></tr></thead><tbody>${lines}</tbody></table></div><p class="fd-note">Produto único, estoque inicial zero. Avaliação por movimentação; custo unitário das saídas corresponde ao custo total da venda dividido pela quantidade. Valores exibidos arredondados.</p></div>`;
  }

  function cashTimeline(opening, entries) {
    let balance = opening;
    const lines = entries.map(entry => {
      balance += entry.amount;
      return `<tr><td>${entry.date}</td><td>${entry.label}</td><td>${money(entry.amount)}</td><td>${money(balance)}</td></tr>`;
    }).join('');
    return `<div class="fd-ledger"><h4>Movimentação e saldo por data</h4><div class="fd-table-scroll"><table><thead><tr><th>Data</th><th>Movimento</th><th>Valor</th><th>Saldo</th></tr></thead><tbody><tr><td>Início</td><td>Saldo inicial</td><td>—</td><td>${money(opening)}</td></tr>${lines}</tbody></table></div></div>`;
  }

  function render() {
    const v = calculate();
    const heading = ['Indicadores do trimestre', 'Demonstração do resultado', 'Balanço patrimonial', 'Evolução das vendas', 'Custos e estoque', 'Fluxo de caixa realizado', 'Fluxo de caixa previsto'][page];
    const switcher = `<div class="fd-switch" aria-label="Método de estoque"><button type="button" data-method="PEPS" aria-pressed="${method === 'PEPS'}">PEPS</button><button type="button" data-method="UEPS" aria-pressed="${method === 'UEPS'}">UEPS</button><button type="button" data-method="Médio" aria-pressed="${method === 'Médio'}">Médio</button></div>`;
    let body = '';
    if (page === 0) body = `<div class="fd-cards">${card('Receita', money(v.revenue))}${card('Lucro', money(v.profit))}${card('Compras', money(v.purchases))}${card('Estoque final', money(v.inventory))}</div>${chart(data.sales.map(s => s.quantity * data.salePrice), data.sales.map(s => s.month))}<p class="fd-note">Vendas mensais · ${method} · valores fictícios em R$</p>`;
    if (page === 1) body = `<div class="fd-rows">
      ${row('Receita bruta de vendas', money(v.revenue), true)}
      ${row('Vendas de mercadorias', money(v.revenue))}
      ${row('(-) Tributos sobre vendas', money(-v.salesTax))}
      ${row('Receita líquida', money(v.netRevenue), true)}
      ${row('(-) Custo das mercadorias vendidas', money(-v.cost))}
      ${row('Lucro bruto', money(v.grossProfit), true)}
      ${row('(-) Despesas com vendas', money(-data.sellingExpenses))}
      ${row('(-) Despesas administrativas', money(-data.adminExpenses))}
      ${row('(-) Depreciação administrativa', money(-data.depreciation))}
      ${row('Resultado operacional', money(v.profit), true)}
      ${row('Resultado financeiro', money(0))}
      ${row('Resultado antes de IRPJ e CSLL', money(v.profit), true)}
      ${row('IRPJ e CSLL', money(0))}
      ${row('Lucro líquido do período', money(v.profit), true)}
    </div><p class="fd-note">Cenário didático: tributos sobre vendas de 10% em aberto. IRPJ e CSLL não simulados. Custo pelo ${method}.</p>`;
    if (page === 2) body = `<div class="fd-rows">
      ${row('ATIVO', '', true)}
      ${row('Ativo circulante', money(v.currentAssets), true)}
      ${row('Caixa e equivalentes', money(v.cash))}
      ${row('Clientes a receber', money(v.receivables))}
      ${row('Estoques de mercadorias', money(v.inventory))}
      ${row('Ativo não circulante', money(v.fixedAssets), true)}
      ${row('Imobilizado — equipamentos', money(data.equipment))}
      ${row('(-) Depreciação acumulada', money(-data.depreciation))}
      ${row('TOTAL DO ATIVO', money(v.totalAssets), true)}
      ${row('PASSIVO E PATRIMÔNIO LÍQUIDO', '', true)}
      ${row('Passivo circulante', money(v.liabilities), true)}
      ${row('Fornecedores', money(v.suppliers))}
      ${row('Tributos sobre vendas a recolher', money(v.salesTax))}
      ${row('Passivo não circulante', money(0))}
      ${row('Patrimônio líquido', money(v.equity), true)}
      ${row('Capital social integralizado', money(data.capital))}
      ${row('Resultado acumulado do período', money(v.profit))}
      ${row('TOTAL DO PASSIVO E PL', money(v.liabilities + v.equity), true)}
    </div><p class="fd-note">Saldos fictícios no encerramento do trimestre. O resultado está apresentado antes da destinação.</p>`;
    if (page === 3) body = `<div class="fd-cards">${card('Receita total', money(v.revenue))}${card('Unidades vendidas', v.quantitySold)}</div>${chart(data.sales.map(s => s.quantity * data.salePrice), data.sales.map(s => s.month))}<svg class="fd-line" viewBox="0 0 300 55" role="img" aria-label="Tendência de receita: R$ 6.000, R$ 8.000 e R$ 10.000"><polyline points="10,45 150,27 290,9" fill="none" stroke="#6241ab" stroke-width="3"/><circle cx="10" cy="45" r="4" fill="#ff781f"/><circle cx="150" cy="27" r="4" fill="#ff781f"/><circle cx="290" cy="9" r="4" fill="#ff781f"/></svg><div class="fd-rows">${data.sales.map(s => row(`${s.month} · ${s.quantity} unidades`, money(s.quantity * data.salePrice))).join('')}</div>`;
    if (page === 4) body = `<div class="fd-rows">${row('Compra 1 · 100 un. × R$ 100', money(10000))}${row('Compra 2 · 100 un. × R$ 120', money(12000))}${row('Total de compras · 200 un.', money(v.purchases))}${row('Saídas · 120 un. (' + method + ')', money(-v.cost))}${row('Estoque final · 80 un.', money(v.inventory), true)}</div><p class="fd-note">Custos calculados a cada movimentação. Métodos apresentados para comparação didática.</p>${stockLedger()}`;
    if (page === 5) {
      const operating = data.collectedSales - data.paidPurchases - data.sellingExpenses - data.adminExpenses;
      const investing = -data.equipment;
      const financing = data.capital;
      body = `<div class="fd-rows">
        ${row('ATIVIDADES OPERACIONAIS', '', true)}
        ${row('Recebimentos de clientes', money(data.collectedSales))}
        ${row('(-) Pagamentos a fornecedores', money(-data.paidPurchases))}
        ${row('(-) Pagamentos de despesas comerciais', money(-data.sellingExpenses))}
        ${row('(-) Pagamentos de despesas administrativas', money(-data.adminExpenses))}
        ${row('Caixa líquido operacional', money(operating), true)}
        ${row('ATIVIDADES DE INVESTIMENTO', '', true)}
        ${row('(-) Aquisição de equipamentos', money(investing))}
        ${row('Caixa líquido de investimento', money(investing), true)}
        ${row('ATIVIDADES DE FINANCIAMENTO', '', true)}
        ${row('Integralização de capital', money(financing))}
        ${row('Caixa líquido de financiamento', money(financing), true)}
        ${row('Variação líquida do caixa', money(operating + investing + financing), true)}
        ${row('Caixa inicial', money(0))}
        ${row('Caixa final', money(v.cash), true)}
      </div>${cashTimeline(0, [
        { date: '01 jan', label: 'Integralização de capital', amount: data.capital },
        { date: '02 jan', label: 'Pagamento de compra · lote 1', amount: -10000 },
        { date: '10 jan', label: 'Compra de equipamentos', amount: -data.equipment },
        { date: '25 jan', label: 'Recebimento de clientes', amount: 6000 },
        { date: '03 fev', label: 'Pagamento parcial · lote 2', amount: -6000 },
        { date: '24 fev', label: 'Recebimento de clientes', amount: 8000 },
        { date: '25 mar', label: 'Recebimento de clientes', amount: 8000 },
        { date: '31 mar', label: 'Despesas comerciais', amount: -data.sellingExpenses },
        { date: '31 mar', label: 'Despesas administrativas', amount: -data.adminExpenses }
      ])}
      <div class="fd-reconciliation"><h4>Conciliação do lucro ao caixa operacional</h4><div class="fd-rows">
        ${row('Lucro líquido do período', money(v.profit))}
        ${row('(+) Depreciação', money(data.depreciation))}
        ${row('(-) Aumento de clientes a receber', money(-v.receivables))}
        ${row('(-) Aumento dos estoques', money(-v.inventory))}
        ${row('(+) Aumento de fornecedores', money(v.suppliers))}
        ${row('(+) Aumento de tributos a recolher', money(v.salesTax))}
        ${row('Caixa líquido operacional', money(v.profit + data.depreciation - v.receivables - v.inventory + v.suppliers + v.salesTax), true)}
      </div></div>
      <div class="fd-reconciliation"><h4>Notas da simulação</h4><p class="fd-note">Método direto. Primeiro período da empresa fictícia, com saldos iniciais zerados; não há dados comparativos simulados. Caixa final composto integralmente por disponibilidades, sem equivalentes de caixa ou saldos restritos. Não há transações de investimento ou financiamento sem caixa. IRPJ e CSLL não foram simulados.</p><p class="fd-note">A conciliação utiliza os saldos finais como variações em relação aos saldos iniciais zerados. A projeção de abril é gerencial e usa hipóteses futuras.</p></div>`;
    }
    if (page === 6) {
      const futureSales = 12000;
      const futurePurchases = 8000;
      const futureExpenses = 2000;
      const futureOperating = v.receivables + futureSales - v.suppliers - v.salesTax - futurePurchases - futureExpenses;
      body = `<div class="fd-rows">
        ${row('Caixa inicial previsto', money(v.cash), true)}
        ${row('ATIVIDADES OPERACIONAIS', '', true)}
        ${row('Recebimento de clientes em aberto', money(v.receivables))}
        ${row('Recebimento de novas vendas previsto', money(futureSales))}
        ${row('(-) Fornecedores em aberto', money(-v.suppliers))}
        ${row('(-) Tributos em aberto', money(-v.salesTax))}
        ${row('(-) Novas compras previstas', money(-futurePurchases))}
        ${row('(-) Despesas previstas', money(-futureExpenses))}
        ${row('Caixa líquido operacional previsto', money(futureOperating), true)}
        ${row('Investimentos previstos', money(0))}
        ${row('Financiamentos previstos', money(0))}
        ${row('Variação líquida prevista', money(futureOperating), true)}
        ${row('Caixa final previsto', money(v.cash + futureOperating), true)}
      </div>${cashTimeline(v.cash, [
        { date: '05 abr', label: 'Recebimento de clientes em aberto', amount: v.receivables },
        { date: '10 abr', label: 'Pagamento a fornecedores em aberto', amount: -v.suppliers },
        { date: '15 abr', label: 'Pagamento de tributos em aberto', amount: -v.salesTax },
        { date: '18 abr', label: 'Pagamento de novas compras', amount: -futurePurchases },
        { date: '25 abr', label: 'Recebimento de novas vendas', amount: futureSales },
        { date: '30 abr', label: 'Pagamento de despesas', amount: -futureExpenses }
      ])}<p class="fd-note">Datas e valores fictícios. Projeção gerencial para abril: os compromissos em aberto são liquidados integralmente e as novas operações são estimadas. Novas vendas e compras não compõem os demonstrativos já realizados.</p>`;
    }
    root.innerHTML = `<div class="fd-head"><strong>Estúdio de dados</strong><span>EXEMPLO FICTÍCIO</span></div><div class="fd-tabs" role="tablist" aria-label="Relatórios">${pages.map((name, i) => `<button type="button" role="tab" aria-selected="${page === i}" data-page="${i}">${name}</button>`).join('')}</div><div class="fd-content" aria-live="polite"><div class="fd-top"><div><h3>${heading}</h3><p>${page === 6 ? 'Abril previsto' : 'Janeiro — março'} · valores em R$</p></div>${page < 5 ? switcher : ''}</div>${body}</div><div class="fd-footer"><span>${String(page + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}</span><div><button type="button" data-step="-1" aria-label="Relatório anterior" ${page === 0 ? 'disabled' : ''}>←</button><button type="button" data-step="1" aria-label="Próximo relatório" ${page === pages.length - 1 ? 'disabled' : ''}>→</button></div></div>`;
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.page !== undefined) page = Number(button.dataset.page);
    if (button.dataset.step) page += Number(button.dataset.step);
    if (button.dataset.method) method = button.dataset.method;
    render();
    const selector = button.dataset.method ? `[data-method="${method}"]` : `[data-page="${page}"]`;
    root.querySelector(selector)?.focus({ preventScroll: true });
  });
  render();
})();
