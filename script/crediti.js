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
