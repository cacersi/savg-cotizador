'use strict';

const el = id => document.getElementById(id);
const form = el('tournamentForm');
const catalog = el('models');
const sportInputs = Array.from(form.elements.sport);
const codes = Array.from('ABCDEF').flatMap(group => [1, 2, 3].map(n => group + n));
const storageKey = 'savg-torneo-solicitud-v1';
const sampleId = new URLSearchParams(location.search).get('ejemplo');
if (['estandar', 'expres', 'diseno', 'variantes'].includes(sampleId)) {
  location.replace('muestra.html?ejemplo=' + sampleId);
}

function readDraft() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return JSON.parse(stored) || {};
    const old = JSON.parse(localStorage.getItem('savg-quick-quote-v3')) || {};
    const variants = Array.isArray(old.variants) ? old.variants.slice(0, old.same ? 1 : old.count) : [];
    return {
      sport: {'Torneo de tenis':'Tenis', 'Torneo de pádel':'Pádel'}[old.event],
      qty: variants.length === 1 ? variants[0].q : '',
      fabric: variants.length === 1 ? variants[0].fabric : '',
      date: old.date,
      design: old.design === 'pending' ? 'asesor' : (old.code || '').toUpperCase()
    };
  } catch { return {}; }
}
const draft = readDraft();
const Q = window.SavgQuote;
let preferredFabric = draft.fabric || '';
let selected = codes.includes(draft.design) || draft.design === 'asesor' ? draft.design : '';
el('qty').value = draft.qty || '';
el('needDate').min = nextDay(window.SavgQuote.today());
el('needDate').value = draft.date || '';
for (const radio of sportInputs) radio.checked = radio.value === draft.sport;

function nextDay(date) {
  const day = new Date(date + 'T12:00:00Z');
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      sport: form.elements.sport.value, qty: el('qty').value,
      date: el('needDate').value, design: selected, fabric: preferredFabric
    }));
  } catch { /* The form is still usable when storage is unavailable. */ }
}
function updateScope() {
  const outside = form.elements.sport.value === 'Otro';
  el('outside').hidden = !outside;
  el('leadFields').disabled = outside;
  el('leadFields').hidden = outside;
  const date = el('needDate');
  const timing = Q.timing(date.value);
  const blocked = Boolean(date.value) && !timing.valid;
  const notice = el('dateNotice');
  notice.hidden = outside || !(blocked || timing.express);
  notice.dataset.state = blocked ? 'rejected' : 'express';
  el('dateTitle').textContent = blocked ? 'Proyecto rechazado por plazo' : 'Tu pedido requiere producción exprés';
  const explanation = blocked && timing.kind !== 'rejected'
    ? 'La fecha debe dejar al menos 5 días hábiles para producir tu pedido. Elige una fecha posterior.'
    : timing.text;
  el('dateReason').textContent = notice.hidden ? '' : explanation;
  date.setCustomValidity(blocked ? explanation : '');
  el('quoteFields').hidden = blocked;
  el('quoteFields').disabled = blocked;
}
function updateEstimate() {
  const qty = el('qty').valueAsNumber;
  const sport = form.elements.sport.value;
  const eligible = !el('quoteFields').disabled && ['Tenis', 'Pádel'].includes(sport) && Number.isSafeInteger(qty) && qty >= 100;
  el('estimate').hidden = !eligible;
  if (!eligible) return null;

  const available = Object.keys(Q.rates).filter(fabric => Q.unit(fabric, qty) !== null);
  el('pricedDetails').hidden = !available.length;
  el('manualPrice').hidden = !!available.length;
  if (!available.length) return null;

  const choice = el('fabric');
  if (available.join(',') !== choice.dataset.available) {
    choice.replaceChildren(...available.map(fabric => new Option(Q.qualityNames[fabric], fabric)));
    choice.dataset.available = available.join(',');
  }
  const fabric = available.includes(preferredFabric) ? preferredFabric : Q.defaultFabric(qty);
  choice.value = fabric;
  const quote = Q.totals([{q: qty, fabric}], el('needDate').value);
  const base = qty + ' playeras × ' + Q.money(quote.items[0].unit) + ' = ' + Q.money(quote.subtotal);
  const express = quote.t.express ? 'Exprés provisional (20%): +' + Q.money(quote.surcharge) : '';
  const total = Q.money(quote.total) + ' MXN';
  el('baseLine').textContent = base;
  el('expressLine').textContent = express;
  el('expressLine').hidden = !express;
  el('totalLabel').textContent = quote.t.valid ? 'Total estimado' : 'Subtotal de prendas';
  el('quoteTotal').textContent = total;
  const note = ['IVA incluido. Envío por cotizar.'];
  if (!quote.t.valid) note.push('Elige la fecha para calcular el total.');
  else if (quote.t.express) note.push(Q.money(quote.items[0].finalUnit) + ' por playera con exprés. Fecha sujeta a confirmación.');
  el('quoteNote').textContent = note.join(' ');
  if (!updateEstimate.tracked && Number.isFinite(quote.total)) {
    updateEstimate.tracked = true;
    (window.savgTrack || function () {})('ViewContent', { content_name: 'Cotizador SAVG', value: Math.round(quote.total), currency: 'MXN' });
  }
  return ['Calidad: ' + Q.qualityNames[fabric], base, express, 'Total estimado: ' + total, note[0]].filter(Boolean).join('\n');
}
el('fabric').addEventListener('change', () => {
  preferredFabric = el('fabric').value;
  updateEstimate();
  save();
});
function updateDesign() {
  const chosen = codes.includes(selected);
  const code = chosen ? selected : 'C1';
  el('heroShirt').src = 'assets/' + code.toLowerCase() + '-original.png';
  el('heroShirt').alt = 'Playera del catálogo SAVG, modelo ' + code;
  el('heroCode').textContent = 'Modelo ' + code;
  el('chosenLabel').textContent = chosen ? 'Modelo ' + code : 'Elegir del catálogo';
  el('chooseDesign').setAttribute('aria-pressed', String(chosen));
  el('advise').setAttribute('aria-pressed', String(selected === 'asesor'));
  el('designError').textContent = '';
  for (const button of el('modelsList').children) {
    button.setAttribute('aria-pressed', String(button.value === selected));
  }
}
for (const code of codes) {
  const button = document.createElement('button');
  button.type = 'button';
  button.value = code;
  const image = document.createElement('img');
  image.alt = '';
  image.loading = 'lazy';
  image.src = 'assets/' + code.toLowerCase() + '-original.png';
  button.append(image, 'Modelo ' + code);
  button.onclick = () => { selected = code; updateDesign(); save(); catalog.close(); };
  el('modelsList').append(button);
}
el('chooseDesign').onclick = () => catalog.showModal();
el('closeModels').onclick = () => catalog.close();
el('advise').onclick = () => { selected = 'asesor'; updateDesign(); save(); };
form.oninput = event => {
  if (event.target === el('fabric')) return;
  updateScope(); updateEstimate(); save();
};
const WHATSAPP_NUMBER = '524439889678';
const LEAD_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd0wKhouob1zU1Bf2nB6v9CsDRFzf5Wy4WXVKwkVUCsugSVRg/formResponse';

function leadOrigin() {
  const parts = [];
  try {
    const params = new URLSearchParams(location.search);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      if (params.get(key)) parts.push(key.slice(4) + '=' + params.get(key));
    }
    if (params.get('fbclid')) parts.push('Meta (fbclid)');
    if (!parts.length && document.referrer) parts.push('ref=' + new URL(document.referrer).hostname);
  } catch { /* origin is optional */ }
  return (parts.join(' · ') || 'directo').slice(0, 300);
}
function sendLead(message, total, sport) {
  const data = new URLSearchParams();
  data.set('entry.1118098081', sport);
  data.set('entry.1785133665', el('qty').value);
  data.set('entry.1607049166', total ? String(total) : 'Por confirmar');
  data.set('entry.41458293', message);
  data.set('entry.1989271176', leadOrigin());
  data.set('entry.2120415094', selected === 'asesor' ? 'Con asesor' : 'Modelo ' + selected);
  try {
    if (!(navigator.sendBeacon && navigator.sendBeacon(LEAD_URL, data))) {
      fetch(LEAD_URL, { method: 'POST', mode: 'no-cors', body: data, keepalive: true }).catch(() => {});
    }
  } catch { /* the WhatsApp handoff still works */ }
}

form.onsubmit = event => {
  event.preventDefault();
  const sport = form.elements.sport.value;
  if (!['Tenis', 'Pádel'].includes(sport)) return;
  el('needDate').min = nextDay(window.SavgQuote.today());
  updateScope();
  if (!form.reportValidity() || el('quoteFields').disabled) return;
  if (!selected) {
    el('designError').textContent = 'Elige un modelo o indica que quieres elegirlo con un asesor.';
    el('chooseDesign').focus();
    return;
  }
  const date = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(el('needDate').value + 'T12:00:00Z'));
  const estimate = updateEstimate();
  const message = [
    'Hola, SAVG. Quiero cotizar playeras para un torneo de ' + sport.toLocaleLowerCase('es-MX') + '.',
    'Cantidad: ' + el('qty').value + ' playeras',
    'Fecha de recepción: ' + date,
    'Diseño: ' + (selected === 'asesor' ? 'Quiero elegirlo con un asesor.' : 'Modelo ' + selected),
    estimate || 'Precio por confirmar con asesor para este volumen.',
    Q.timing(el('needDate').value).express ? 'Plazo exprés de 5 a 9 días hábiles. Sujeto a disponibilidad.' : ''
  ].filter(Boolean).join('\n');
  const whatsapp = new URL('https://wa.me/' + WHATSAPP_NUMBER);
  whatsapp.searchParams.set('text', message);
  el('waFallback').href = whatsapp.href;
  el('waFallback').hidden = false;
  save();
  const now = Date.now();
  if (!(form.savgLeadAt > now - 2000)) {
    form.savgLeadAt = now;
    let total;
    try {
      const lq = Q.totals([{ q: el('qty').valueAsNumber, fabric: el('fabric').value }], el('needDate').value);
      if (!el('pricedDetails').hidden && Number.isFinite(lq.total)) total = Math.round(lq.total);
    } catch { /* price confirmed by an advisor */ }
    sendLead(message, total, sport);
    const lead = { content_name: 'Cotizador SAVG', content_category: sport };
    if (total) { lead.value = total; lead.currency = 'MXN'; }
    (window.savgTrack || function () {})('Lead', lead);
  }
  setTimeout(() => location.assign(whatsapp.href), 300);
};

el('home').onclick = event => { event.preventDefault(); window.scrollTo({top: 0, behavior:'smooth'}); };
el('moreInfo').onclick = () => el('learn').showModal();
el('closeLearn').onclick = () => el('learn').close();
el('termsLink').onclick = () => el('condiciones').showModal();
el('learnTerms').onclick = () => { el('learn').close(); el('condiciones').showModal(); };
el('closeTerms').onclick = () => el('condiciones').close();
[['100–149', 3], ['150–249', 4], ['250–600', 5]].forEach(([range, index]) => {
  const row = el('priceRows').insertRow();
  const header = document.createElement('th');
  header.textContent = range;
  row.append(header);
  for (const fabric of ['Basic', 'Premium', 'Elite']) {
    const price = window.SavgQuote.rates[fabric][index];
    row.insertCell().textContent = price === null ? '—' : window.SavgQuote.money(price);
  }
});
updateScope();
updateDesign();

updateEstimate();

const brandNotice = el('brandNotice');
const noticeKey = 'savg-torneo-aviso-oficial-v2';
let noticeSeen = false;
try { noticeSeen = sessionStorage.getItem(noticeKey) === 'seen'; } catch {}
brandNotice.addEventListener('close', () => {
  try { sessionStorage.setItem(noticeKey, 'seen'); } catch {}
});
if (!noticeSeen && !['estandar', 'expres', 'diseno', 'variantes'].includes(sampleId)) {
  brandNotice.showModal();
}
