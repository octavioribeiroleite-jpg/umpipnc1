import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTreasuryRenderer, emptyProps } from '../scripts/render-treasury-preview.mjs';

const render = await getTreasuryRenderer();
const zeros = { income_cents: 0, expense_cents: 0, balance_cents: 0, entry_count: 0 };
const fund = { id: 'd98e5a42-f1e0-40b5-af3c-a821dc14ea20', abbreviation: 'TESTE', name: 'Sociedade exclusiva para teste', color: '#277463', ...zeros };
const emptyData = { funds: [fund], totals: zeros, months: [{ month: '2026-09', income_cents: 0, expense_cents: 0 }] };
// These fixtures are used only in automated tests. The deliverable preview contains no entries or amounts.
const entry = { id: 'edbdcfc0-0c70-492d-ad72-cdd2fc44c15c', fund_id: fund.id, occurred_on: '2026-09-01', kind: 'expense', amount_cents: 101, balance_after_cents: -101, person_name: 'Pessoa de teste', description: 'Somente teste automatizado' };
const textOnly = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

test('public disconnected overview never invents balances or exposes writing actions', () => {
  const html = render(emptyProps);
  assert.match(html, /Dashboard financeiro/);
  assert.match(html, /Igreja Presbiteriana de Nova Carapina/);
  assert.match(html, /Consulta pública/);
  assert.match(html, /Extrato indisponível/);
  assert.doesNotMatch(html, /R\$|Novo lançamento|Nova sociedade|Editar lançamento/);
  for (const name of ['UMP', 'SAF', 'UPH', 'UPA']) assert.match(html, new RegExp(`Consultar extrato da ${name}`));
  assert.match(html, /href="#treasury-content"/);
  assert.match(html, /<main id="treasury-content"/);
});

test('confirmed empty response renders zero and honest empty states, with no decorative financial data', () => {
  const html = render({ ...emptyProps, data: emptyData });
  assert.match(html, /R\$\s0,00/);
  assert.match(html, /Nenhum lançamento registrado/);
  assert.match(html, /Tudo começa com o primeiro registro/);
  assert.doesNotMatch(html, /tr-month-bar income|tr-balance-track|Novo lançamento|Nova sociedade/);
});

test('admin receives creation and edit controls while public view only offers authenticated access', () => {
  const common = { ...emptyProps, data: emptyData, entries: [entry], totalCount: 1, filteredExpense: 101 };
  const publicHtml = render(common);
  assert.match(publicHtml, /Acesso do tesoureiro/);
  assert.doesNotMatch(publicHtml, /Novo lançamento|Nova sociedade|Editar lançamento de/);
  const adminHtml = render({ ...common, admin: true });
  assert.match(adminHtml, /Novo lançamento/);
  assert.match(adminHtml, /Nova sociedade/);
  assert.match(adminHtml, /Editar lançamento de Pessoa de teste em 01\/09\/2026/);
  assert.match(adminHtml, /Sair do acesso administrativo/);
});

test('society statement names the selected fund and renders the original date, debit and running balance', () => {
  const html = render({ ...emptyProps, data: emptyData, selectedFundId: fund.id, entries: [entry], totalCount: 1, filteredExpense: 101 });
  const text = textOnly(html);
  assert.match(text, /Caixa da TESTE/);
  assert.match(text, /Extrato da TESTE/);
  assert.match(text, /01\/09\/2026/);
  assert.match(text, /Pessoa de teste.*Somente teste automatizado/);
  assert.match(text, /− R\$ 1,01/);
  assert.match(text, /-R\$ 1,01/);
  assert.doesNotMatch(html, /<th>Sociedade<\/th>|Caixas das sociedades/);
});

test('real chart data is available as a text table and exact signed amounts, not only colored bars', () => {
  const data = { funds: [{ ...fund, income_cents: 99, expense_cents: 101, balance_cents: -2, entry_count: 2 }], totals: { income_cents: 99, expense_cents: 101, balance_cents: -2, entry_count: 2 }, months: [{ month: '2026-09', income_cents: 99, expense_cents: 101 }] };
  const html = render({ ...emptyProps, data });
  assert.match(html, /role="img" aria-label="Gráfico de entradas e saídas mensais/);
  assert.match(html, /Consultar valores do gráfico/);
  assert.match(html, /<th>09\/2026<\/th><td>R\$\s0,99<\/td><td>R\$\s1,01<\/td>/);
  assert.match(html, /-R\$\s0,02/);
  assert.match(html, /Saldos negativos aparecem com sinal de menos/);
});

test('API errors and invalid date filters do not masquerade as successful empty results', () => {
  const unavailable = render({ ...emptyProps, error: 'Configuração pendente.' });
  assert.match(unavailable, /role="alert"/);
  assert.match(unavailable, /Configuração pendente/);
  assert.doesNotMatch(unavailable, /R\$/);
  const failedStatement = render({ ...emptyProps, data: emptyData, entriesError: 'Falha de consulta.' });
  assert.match(failedStatement, /Não foi possível consultar o extrato/);
  assert.doesNotMatch(failedStatement, /Tudo começa com o primeiro registro/);
  const invalidPeriod = render({ ...emptyProps, data: emptyData, filters: { ...emptyProps.filters, start: '2026-09-28', end: '2026-09-01' } });
  assert.match(invalidPeriod, /A data final deve ser igual ou posterior à inicial/);
});

test('statement pagination keeps complete filtered totals and correct first/last button states', () => {
  const props = { ...emptyProps, data: emptyData, entries: [entry], totalCount: 21, filteredIncome: 123456, filteredExpense: 101 };
  const first = render(props);
  assert.match(textOnly(first), /21 lançamentos encontrados Entradas R\$ 1\.234,56 Saídas R\$ 1,01/);
  assert.match(first, /<button class="tr-button tr-button-small" disabled="">[^]*?Anterior/);
  assert.match(textOnly(first), /Página 1 de 2/);
  const last = render({ ...props, page: 1 });
  assert.match(last, /<button class="tr-button tr-button-small" disabled="">Próxima/);
  assert.match(textOnly(last), /Página 2 de 2/);
});

test('public person and description fields are escaped against injected HTML', () => {
  const html = render({ ...emptyProps, data: emptyData, entries: [{ ...entry, person_name: '<script>alert(1)</script>', description: '<img src=x onerror=alert(1)>' }], totalCount: 1 });
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
});

test('treasurer gets a receipt action but no administrative actions; reserves are explicit', () => {
  const data = { funds: [{ ...fund, income_cents: 10000, balance_cents: 10000, entry_count: 1, reserved_cents: 1000, available_cents: 9000 }], totals: { ...zeros, income_cents: 10000, balance_cents: 10000, entry_count: 1, reserved_cents: 1000, available_cents: 9000 }, months: [] };
  const html = render({ ...emptyProps, data, treasurer: true, selectedFundId: fund.id });
  assert.match(html, /Registrar recebimento/);
  assert.match(html, /Per capita reservada/);
  assert.match(html, /Disponível após reserva/);
  assert.match(textOnly(html), /R\$ 10,00/);
  assert.match(textOnly(html), /R\$ 90,00/);
  assert.doesNotMatch(html, /Novo lançamento|Nova sociedade|Editar lançamento de/);
});
