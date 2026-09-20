# Mercato dell'arte

Questo repository raccoglie i dati, il codice e le risorse utilizzati per realizzare
**Mercato dell'arte**, un progetto digitale della
[Fondazione Federico Zeri](https://fondazionezeri.unibo.it/it/homepage) dell'Università di
Bologna dedicato al mercato antiquario italiano tra Otto e Novecento.

Il progetto nasce con l'obiettivo di rendere interrogabili e navigabili informazioni
provenienti dalla ricerca storico-artistica sugli antiquari italiani. Il sito ricostruisce
le vicende delle principali entità antiquariali, delle persone che ne hanno fatto parte e
delle sedi nelle quali hanno operato; documenta inoltre relazioni, collaborazioni,
compravendite ed eventi e permette di risalire alle fonti bibliografiche, archivistiche e
orali sulle quali si basa la ricerca.

Il repository costituisce quindi non soltanto il codice sorgente del sito, ma anche il
luogo nel quale sono conservati e organizzati i dati che ne alimentano i contenuti.

Questa documentazione si rivolge soprattutto a due tipi di lettori: chi vuole consultare,
comprendere o riutilizzare i dati e chi vuole invece capire il funzionamento del sito.

## Dai dati al sito

Il principio su cui si basa l'architettura del progetto è lineare: i contenuti vengono
gestiti a partire dai dati strutturati e le pagine del sito vengono generate a partire da
essi.

Il flusso principale è il seguente:

```
data/*.tsv
      │
      ▼
script/tsv_to_json.py
      │
      ▼
json/*.json
      │
      ▼
script/build_*.py
      │
      ▼
html/*.html
```

Le tabelle contenute nella cartella `data/` costituiscono quindi la principale sorgente
dei dati. Al loro interno vengono registrate le informazioni sulle entità antiquariali,
sulle persone, sui luoghi, sugli eventi, sulle relazioni e sulle fonti.

Uno script Python (`script/tsv_to_json.py`) trasforma queste tabelle in file JSON, più
facilmente utilizzabili dalle pagine e dagli script del sito. Un secondo insieme di script
(`script/build_*.py`) usa poi i JSON per generare le pagine HTML, comprese le singole
schede dedicate alle entità antiquariali.

In questo modo contenuto e presentazione rimangono separati: per correggere, integrare o
aggiornare un'informazione non è normalmente necessario intervenire direttamente
nell'HTML. Si modifica il dato nella tabella corrispondente e si rigenerano i file che da
esso dipendono.

## Aggiornamento automatico

Il sito è statico ed è pubblicato tramite GitHub Pages. La rigenerazione dei dati e delle
pagine è automatizzata attraverso i workflow contenuti in `.github/workflows/`.

Quando viene effettuato un push sul branch `main`, i workflow individuano le componenti
interessate dalla modifica e rigenerano i file che ne dipendono.

Per esempio, una modifica a `data/eventi.tsv` produce una nuova versione di
`json/eventi.json`, mentre le modifiche ai JSON possono a loro volta determinare la
rigenerazione delle pagine di dettaglio, degli indici o della bibliografia.

Il principio operativo è quindi:

```
modifica del dato
        ↓
rigenerazione automatica
        ↓
aggiornamento del sito
```

Questo consente di mantenere il sito sincronizzato con i dati senza dover aggiornare
manualmente le singole pagine.

### Aggiornamenti concorrenti

Poiché più workflow possono essere eseguiti contemporaneamente, può accadere che due
processi tentino di scrivere sul branch `main` nello stesso momento.

In questo caso il secondo push può essere respinto da Git con un errore `fetch first`,
perché nel frattempo il branch remoto è stato modificato.

Per evitare che la rigenerazione venga persa, i workflow sono configurati per riallinearsi
con il repository tramite `git pull --rebase` e tentare nuovamente il push. L'operazione
viene ripetuta, se necessario, fino a cinque volte.

## Struttura del repository

Le principali cartelle del progetto corrispondono alle diverse fasi del flusso dati → sito.

| Cartella | Contenuto |
|---|---|
| `data/` | tabelle sorgente che contengono i dati del progetto, prevalentemente in formato TSV |
| `json/` | file JSON generati a partire dalle tabelle e utilizzati dal sito |
| `script/` | script Python per la trasformazione e la generazione dei contenuti e JavaScript utilizzato dalle pagine |
| `html/` | pagine HTML del sito, sia generate sia gestite direttamente |
| `html/dettagli/` | schede HTML delle singole entità antiquariali, generate automaticamente |
| `css/` | fogli di stile |
| `img/` | immagini utilizzate dal sito |
| `bio-txt/` | materiali testuali relativi alle biografie, in formato `.docx` e `.txt` |
| `.github/workflows/` | configurazioni GitHub Actions per la rigenerazione e la pubblicazione automatica |

Questa organizzazione rende riconoscibili tre livelli distinti del progetto: i dati
sorgente, le loro trasformazioni intermedie e le pagine attraverso cui vengono presentati
all'utente.

## I dati

Il modello dei dati è distribuito in dieci tabelle, ciascuna dedicata a un tipo di
informazione utilizzato dal sito.

Le quantità indicate di seguito descrivono lo stato corrente dei file e possono
naturalmente cambiare con l'aggiornamento del progetto.

| File | Righe | Contenuto |
|---|---|---|
| `data/entità.tsv` | 95 | entità antiquariali, con nome, biografia, fonti, collaboratori, eventi e immagini |
| `data/persone.tsv` | 219 | persone collegate alle entità antiquariali, con professione e dati biografici |
| `data/collaboratori.tsv` | 166 | persone che hanno collaborato con le entità e ruolo svolto |
| `data/compravendite.tsv` | 203 | clienti, soggetti ed entità coinvolti nelle compravendite |
| `data/luoghi.tsv` | 294 | sedi e luoghi di attività, con localizzazione, intervalli cronologici e coordinate |
| `data/eventi.tsv` | 94 | eventi associati alle entità, classificati e descritti |
| `data/relazioni.tsv` | 58 | relazioni tra entità antiquariali |
| `data/parentela.csv` | 176 | relazioni di parentela tra persone, utilizzate anche per gli alberi familiari |
| `data/bibliografiaGenerale.tsv` | 499 | fonti bibliografiche, archivistiche e interviste |
| `data/didascalie.tsv` | 164 | didascalie associate alle immagini |

Le tabelle non costituiscono insiemi indipendenti. Il sito ricostruisce persone, attività,
luoghi ed eventi combinando informazioni provenienti da più file.

### Gli identificatori

Il collegamento tra le diverse tabelle è affidato principalmente a identificatori univoci.

Ogni entità antiquariale possiede, per esempio, un identificatore come:

```
AC
ST_NEW
VO_II
```

Anche le fonti possiedono un identificatore proprio, che inizia con `B_`.

Gli identificatori vengono utilizzati nelle altre tabelle per esprimere i collegamenti tra
record.

Per esempio, la colonna `Bibliografia` della tabella delle entità non contiene
direttamente le descrizioni complete delle fonti, ma i loro identificatori. Quando più
fonti sono associate allo stesso record, gli identificatori vengono separati da uno spazio.

In questo modo una stessa fonte può essere descritta una sola volta nella bibliografia
generale e richiamata da più parti del progetto.

## La bibliografia e le fonti

Il file `data/bibliografiaGenerale.tsv` raccoglie nello stesso dataset fonti di natura
diversa. La loro tipologia è indicata nella colonna `Tipologia`.

Il file comprende in particolare pubblicazioni a stampa, fonti archivistiche e interviste.
Poiché questi documenti hanno caratteristiche descrittive differenti, non tutte le colonne
vengono utilizzate nello stesso modo.

Per le fonti a stampa vengono registrati, quando disponibili: autore; anno; titolo;
completamento del titolo; città; editore o rivista; pagine.

Le fonti archivistiche, identificate attraverso il valore `fonte archivistica` nella
colonna `Tipologia`, seguono invece una struttura differente. In questo caso non vengono
normalmente utilizzati autore e titolo, mentre assumono rilievo i campi:

```
Istituto
Fondo
Segnatura
```

La localizzazione dell'istituto è registrata nella colonna `Città, editore o rivista`.

Per le interviste, infine, la data viene registrata nel campo `Anno`.

### Normalizzazione delle date

Nel corso della costruzione del dataset le date delle interviste sono state registrate in
momenti e ambienti diversi. Per questo motivo nel file possono convivere tre formati:

```
2023-06-04 00:00:00
2/15/2023
20/05/2026
```

Il primo deriva dal formato data utilizzato da Excel; il secondo da un'esportazione che
utilizza la convenzione americana; il terzo corrisponde alla notazione italiana inserita
manualmente.

Lo script `script/build_bibliografia.py` riconosce questi diversi formati e li converte
durante la costruzione della bibliografia.

Quando giorno e mese potrebbero essere confusi, lo script verifica innanzitutto se uno dei
due numeri supera 12: in quel caso è possibile determinare automaticamente quale valore
rappresenti il giorno.

Nei casi in cui entrambi i valori siano compatibili sia con un giorno sia con un mese,
viene adottata per convenzione l'interpretazione italiana. L'ambiguità viene inoltre
segnalata nel log della procedura di integrazione continua, in modo da poter essere
verificata successivamente.

## Rigenerare il sito in locale

Il progetto richiede Python 3.11 e le principali dipendenze possono essere installate con:

```bash
pip install airium pandas python-docx tqdm geopy
```

Gli script devono essere eseguiti dalla radice del repository, perché i percorsi utilizzati
internamente sono relativi a questa posizione.

La trasformazione di una tabella TSV in JSON può essere avviata, per esempio, con:

```bash
python script/tsv_to_json.py entita
```

Lo stesso comando può essere utilizzato per gli altri dataset, indicando di volta in volta
il nome corrispondente.

Le principali pagine e risorse derivate possono quindi essere rigenerate con:

```bash
python script/build_bibliografia.py
python script/build_dettaglio.py
python script/build_persone.py
python script/build_kinships.py parentela
```

Questi comandi producono, tra gli altri:

```
html/bibliografia.html
html/dettagli/*.html
html/persone.html
json/statistiche.json
```

### Ordine delle dipendenze

La generazione dei file deve rispettare le dipendenze esistenti tra i dataset.

In particolare, alcuni JSON vengono utilizzati per costruirne altri:

```
json/luoghi.json
        ↓
json/persone.json
        ↓
json/entità.json
        ↓
schede di dettaglio e bibliografia
```

L'ordine di esecuzione non è quindi indifferente.

Se una pagina o un file JSON risulta vuoto o incompleto durante una rigenerazione locale, è
utile verificare innanzitutto che siano già stati generati correttamente tutti i file dai
quali dipende.

### Geocodifica dei luoghi

La trasformazione dei luoghi presenta una particolarità.

Il comando `python script/tsv_to_json.py luoghi` può interrogare un servizio esterno di
geocodifica per gli indirizzi che non possiedono ancora coordinate geografiche.

È l'unica parte della procedura di trasformazione che richiede necessariamente una
connessione di rete e, proprio perché dipende dalle risposte di un servizio esterno, può
essere sensibilmente più lenta degli altri passaggi.

## In sintesi

L'architettura del progetto è costruita intorno a una separazione netta tra dato,
trasformazione e presentazione.

Le informazioni della ricerca vengono registrate nelle tabelle della cartella `data/`; gli
script le trasformano in strutture JSON e combinano i diversi dataset; infine, a partire da
queste strutture, vengono generate le pagine attraverso cui le informazioni sono ricercate,
collegate e presentate sul sito.

Il repository conserva quindi insieme i dati della ricerca e le procedure necessarie per
trasformarli nella loro rappresentazione digitale, permettendo sia di ricostruire il
funzionamento del sito sia di intervenire sui dati e rigenerarne le diverse forme di
accesso.
