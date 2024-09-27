document.addEventListener("DOMContentLoaded", function() {
    const timeline = document.getElementById('timeline');
    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');
    const scrollAmount = 200; // Quantità di scorrimento per ogni click

    prevButton.addEventListener('click', () => {
        timeline.scrollBy({
            top: 0,
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });

    nextButton.addEventListener('click', () => {
        timeline.scrollBy({
            top: 0,
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
});

//card
document.addEventListener('DOMContentLoaded', function() {
    const carouselWrapper = document.querySelector('.carousel-wrapper');
    const cards = document.querySelectorAll('.carousel-card');
    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');
    let currentIndex = 0;
    

    // Funzione per aggiornare la visualizzazione del carosello
    function updateCarousel() {
        // Calcola l'offset per centrare la card attiva
        const offset = -currentIndex * 440 + (window.innerWidth / 2 - 200); // 440 = larghezza card (400px) + margine (40px)
        carouselWrapper.style.transform = `translateX(${offset}px)`;
    
        // Aggiorna lo stato di attivazione delle card
        cards.forEach((card, index) => {
            card.classList.remove('active');
            if (index === currentIndex) {
                card.classList.add('active');
            }
        });
    }
    

    // Navigazione avanti
    nextButton.addEventListener('click', function() {
        if (currentIndex < cards.length - 1) {
            currentIndex++;
            updateCarousel();
        }
    });

    // Navigazione indietro
    prevButton.addEventListener('click', function() {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    });

    // Inizializza il carosello centrando la prima card
    updateCarousel();
});

//PUNTO-CARD
//funzione per rendere card attiva
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.carousel-card');

    // Aggiungi l'event listener a ogni card
    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Rimuovi la classe 'active' da tutte le card
            cards.forEach(card => card.classList.remove('active'));

            // Aggiungi la classe 'active' alla card cliccata
            this.classList.add('active');
        });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.carousel-card');
    const timeline = document.getElementById('timeline');
    const points = document.querySelectorAll('.event-point');

    // Funzione per scrollare la timeline fino al punto evento
    function scrollToEventPoint(eventId) {
        const eventPoint = document.querySelector(`.event-point[data-id="${eventId}"]`);
        if (eventPoint) {
            const pointPosition = eventPoint.getBoundingClientRect().left + window.pageXOffset;
            // Scroll diretto al punto evento
            timeline.scroll({
                top: 0,
                left: pointPosition - (window.innerWidth / 2), // Centra il punto evento
                behavior: 'smooth'
            });
        }
    }

    // Funzione per evidenziare una card e il punto evento corrispondente
    function highlightCardAndEvent(cardId) {
        // Rimuovi la classe 'active' da tutte le card
        cards.forEach(card => card.classList.remove('active'));

        // Aggiungi la classe 'active' alla card selezionata
        const selectedCard = document.querySelector(`.carousel-card[data-id="${cardId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }

        // Rimuovi l'evidenziazione da tutti i punti evento
        points.forEach(point => point.classList.remove('active'));

        // Aggiungi l'evidenziazione al punto evento corrispondente
        const eventPoint = document.querySelector(`.event-point[data-id="${cardId}"]`);
        if (eventPoint) {
            eventPoint.classList.add('active'); // Si colora automaticamente in base alla categoria
        }
    }

    // Aggiungi l'event listener a ogni card
    cards.forEach(card => {
        card.addEventListener('click', function() {
            const cardId = this.getAttribute('data-id');
            highlightCardAndEvent(cardId); // Evidenzia la card e il punto evento
        });
    });

    // Al caricamento della pagina, evidenzia la prima card e il primo punto evento
    if (cards.length > 0) {
        const firstCardId = cards[0].getAttribute('data-id'); // Ottieni l'ID della prima card
        highlightCardAndEvent(firstCardId); // Evidenzia la prima card e il punto evento corrispondente
    }
});


//scorrimento orizzontale al click sulle card
const carouselWrapper = document.querySelector('.carousel-wrapper');
let isDown = false;
let startX;
let scrollLeft;

// Click attivo sul punto al click sul pulsante next
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.carousel-card');
    const points = document.querySelectorAll('.event-point');
    const nextButton = document.getElementById('next');
    const prevButton = document.getElementById('prev');
    let currentIndex = 0; // Mantiene traccia della card e del punto attivo

    // Funzione per evidenziare la card e il punto evento corrispondente
    function highlightCardAndEvent(index) {
        // Rimuovi la classe 'active' da tutte le card e punti evento
        cards.forEach(card => card.classList.remove('active'));
        points.forEach(point => point.classList.remove('active'));

        // Evidenzia la card attiva e il punto evento corrispondente
        if (cards[index]) {
            cards[index].classList.add('active');
        }
        if (points[index]) {
            points[index].classList.add('active');
        }
    }

    // Funzione per avanzare al prossimo punto e card
    nextButton.addEventListener('click', function() {
        if (currentIndex < cards.length - 1) {
            currentIndex++; // Incrementa l'indice
            highlightCardAndEvent(currentIndex); // Evidenzia il punto e la card successivi
        }
    });

    // Funzione per tornare al punto e card precedente
    prevButton.addEventListener('click', function() {
        if (currentIndex > 0) {
            currentIndex--; // Decrementa l'indice
            highlightCardAndEvent(currentIndex); // Evidenzia il punto e la card precedenti
        }
    });

    // Inizializza la visualizzazione con la prima card e il primo punto attivi
    highlightCardAndEvent(currentIndex);
});

