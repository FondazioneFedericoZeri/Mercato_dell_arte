document.addEventListener('DOMContentLoaded', function () {
  var dataEl = document.getElementById('persone-data');
  if (!dataEl) return; // pagina non generata da build_persone.py: niente da fare
  var DATA = JSON.parse(dataEl.textContent);

  function normApos(s) { return (s || '').replace(/[’‘]/g, "'"); }
  function normSearch(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  DATA.forEach(function (d) {
    d._search = normSearch(d.name);
    if (d.tipologia) d._tipoNorm = d.tipologia.map(normApos);
  });

  var totals = { antiquario: 0, collaboratore: 0, cliente: 0 };
  DATA.forEach(function (d) { totals[d.role]++; });

  // Tipologie disponibili (solo collaboratori), con conteggio
  var tipoCounts = {};
  DATA.filter(function (d) { return d.role === 'collaboratore'; }).forEach(function (d) {
    d._tipoNorm.forEach(function (t) { tipoCounts[t] = (tipoCounts[t] || 0) + 1; });
  });
  var tipoList = Object.keys(tipoCounts).sort(function (a, b) { return tipoCounts[b] - tipoCounts[a]; });

  var tipologiaRow = document.getElementById('tipologiaRow');
  tipoList.forEach(function (t) {
    var btn = document.createElement('button');
    btn.className = 'tipologia-chip';
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.dataset.tipo = t;
    btn.textContent = t + ' (' + tipoCounts[t] + ')';
    btn.addEventListener('click', function () {
      var pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
      render();
    });
    tipologiaRow.appendChild(btn);
  });

  var state = { search: '' };

  var tipoToggle = document.getElementById('tipoToggle');
  tipoToggle.addEventListener('click', function () {
    var expanded = tipoToggle.getAttribute('aria-expanded') === 'true';
    tipoToggle.setAttribute('aria-expanded', String(!expanded));
    tipologiaRow.classList.toggle('show', !expanded);
  });

  var searchEl = document.getElementById('search');
  searchEl.addEventListener('input', function (e) {
    state.search = normSearch(e.target.value);
    render();
  });

  /* Azzerare i filtri: si puo' arrivare a non vedere nessuno — una
     parola cercata piu' due tipologie accese — senza avere un modo
     ovvio di tornare indietro, perche' i filtri attivi stanno in tre
     posti diversi (la casella, le pasticche, il pannello richiuso).
     Questo comando li spegne tutti in un colpo e rimette il cursore
     nella casella, che e' da dove si ricomincia. */
  var resetFiltri = document.getElementById('resetFiltri');
  resetFiltri.addEventListener('click', function () {
    searchEl.value = '';
    state.search = '';
    tipologiaRow.querySelectorAll('[aria-pressed="true"]').forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
    });
    render();
    searchEl.focus();
  });

  var columnsEl = document.getElementById('columns');
  var mobileTabs = document.getElementById('mobileTabs');
  mobileTabs.querySelectorAll('.mobile-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      columnsEl.dataset.mobile = btn.dataset.role;
      mobileTabs.querySelectorAll('.mobile-tab').forEach(function (b) {
        b.setAttribute('aria-selected', String(b === btn));
      });
    });
  });

  function activeTipologie() {
    return Array.from(tipologiaRow.querySelectorAll('[aria-pressed="true"]')).map(function (b) { return b.dataset.tipo; });
  }

  /* Le date come intervallo, sempre: mai "n. 1967" o "m. 1897". Una
     colonna di date si legge per confronto, e le abbreviazioni
     rompevano l'incolonnamento. E' anche la forma che il resto del
     sito usava gia': l'albero familiare (albero-familiare.js) e le
     schede di dettaglio (build_dettaglio.py) scrivono le date cosi',
     questa pagina era l'unica a discostarsene.

     Quattro casi, e il punto interrogativo dice sempre la stessa
     cosa — "questa data non la sappiamo":

       1923–2015   entrambe note
       ?–1897      morto nel 1897, nascita ignota
       1875–?      nato nel 1875, data di morte ignota
       1931–       nato nel 1931 e ancora in vita

     Gli ultimi due si assomigliano ma dicono cose diverse, ed e' il
     motivo per cui build_persone.py porta fin qui il campo "vivente":
     la trattino aperto senza punto interrogativo e' un'affermazione
     ("non e' morto"), non una lacuna.

     Senza nessuna delle due date non si scrive "?–?", che non
     direbbe nulla: l'etichetta resta vuota. */
  function dateLabel(d) {
    if (d.vivente) return d.nascita ? d.nascita + '–' : '';
    if (!d.nascita && !d.morte) return '';
    return (d.nascita || '?') + '–' + (d.morte || '?');
  }

  var resultLine = document.getElementById('resultLine');
  var lists = {
    antiquario: document.getElementById('list-antiquario'),
    collaboratore: document.getElementById('list-collaboratore'),
    cliente: document.getElementById('list-cliente'),
  };
  var counts = {
    antiquario: document.getElementById('cnt-antiquario'),
    collaboratore: document.getElementById('cnt-collaboratore'),
    cliente: document.getElementById('cnt-cliente'),
  };
  var mobileCounts = {
    antiquario: document.getElementById('mcnt-antiquario'),
    collaboratore: document.getElementById('mcnt-collaboratore'),
    cliente: document.getElementById('mcnt-cliente'),
  };

  function makeRow(d) {
    var row = document.createElement('div');
    row.className = 'person-row';

    var main = document.createElement('div');
    main.className = 'person-main';

    var name = document.createElement('span');
    name.className = 'person-name';
    name.textContent = d.name;
    main.appendChild(name);

    if (d.role === 'antiquario') {
      var dl = dateLabel(d);
      if (dl) {
        var meta = document.createElement('span');
        meta.className = 'person-meta';
        meta.textContent = dl;
        main.appendChild(meta);
      }
    }
    row.appendChild(main);

    if (d.role === 'antiquario') {
      if (d.entity_id) {
        var link = document.createElement('a');
        link.className = 'entity-link';
        link.href = '../html/dettagli/dettaglio_' + encodeURIComponent(d.entity_id) + '.html';
        link.textContent = d.entity_name;
        var sub = document.createElement('div');
        sub.className = 'person-sub';
        sub.appendChild(link);
        row.appendChild(sub);
      }
      return row;
    }

    if (d.role === 'collaboratore' && d.tipologia.length) {
      var sub2 = document.createElement('div');
      sub2.className = 'person-sub';
      sub2.textContent = d.tipologia.join(' / ');
      row.appendChild(sub2);
    }

    if (d.entities.length) {
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'person-link-toggle';
      toggle.textContent = d.entities.length + ' entità collegat' + (d.entities.length === 1 ? 'a' : 'e') + ' →';

      var expand = document.createElement('div');
      expand.className = 'person-expand';

      d.entities.forEach(function (e) {
        var chip = document.createElement('a');
        chip.className = 'ent';
        chip.href = '../html/dettagli/dettaglio_' + encodeURIComponent(e.id) + '.html';
        chip.textContent = e.name;
        expand.appendChild(chip);
      });

      toggle.addEventListener('click', function () {
        var open = row.classList.toggle('open');
        toggle.textContent = d.entities.length + ' entità collegat' + (d.entities.length === 1 ? 'a' : 'e') + (open ? ' ↓' : ' →');
      });

      row.appendChild(toggle);
      row.appendChild(expand);
    } else {
      var none = document.createElement('div');
      none.className = 'person-sub';
      none.textContent = 'Nessuna entità collegata in archivio';
      row.appendChild(none);
    }

    return row;
  }

  function render() {
    var activeTipo = activeTipologie();
    var bySearch = state.search
      ? DATA.filter(function (d) { return d._search.indexOf(state.search) !== -1; })
      : DATA;

    var byRole = { antiquario: [], collaboratore: [], cliente: [] };
    bySearch.forEach(function (d) { byRole[d.role].push(d); });

    if (activeTipo.length) {
      byRole.collaboratore = byRole.collaboratore.filter(function (d) {
        return d._tipoNorm.some(function (t) { return activeTipo.indexOf(t) !== -1; });
      });
    }

    ['antiquario', 'collaboratore', 'cliente'].forEach(function (role) {
      var items = byRole[role].slice().sort(function (a, b) { return a.sort.localeCompare(b.sort, 'it'); });
      var list = lists[role];
      list.innerHTML = '';
      if (!items.length) {
        var empty = document.createElement('div');
        empty.className = 'empty-col';
        empty.textContent = 'Nessun risultato.';
        list.appendChild(empty);
      } else {
        var frag = document.createDocumentFragment();
        items.forEach(function (d) { frag.appendChild(makeRow(d)); });
        list.appendChild(frag);
      }
      var label = items.length === totals[role] ? String(totals[role]) : items.length + ' / ' + totals[role];
      counts[role].textContent = label;
      mobileCounts[role].textContent = label;
    });

    var totalShown = byRole.antiquario.length + byRole.collaboratore.length + byRole.cliente.length;
    var filtrato = !!(state.search || activeTipo.length);
    resultLine.textContent = filtrato
      ? totalShown + ' risultat' + (totalShown === 1 ? 'o' : 'i') + ' su ' + DATA.length
      : DATA.length + ' persone in archivio';
    resetFiltri.hidden = !filtrato;
  }

  render();
});
